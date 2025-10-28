import { db } from "@/db";
import { resume } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import z from "zod";
import { serverCreateSchema } from "../schema";
import { Storage } from "@google-cloud/storage";

interface GCSCredentials {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
}
import { inngest } from "@/inngest/client";

function extractPdfBase64(input: z.infer<typeof serverCreateSchema>["file"]) {
  if (typeof input === "string") {
    const idx = input.indexOf(",");
    return idx >= 0 ? input.slice(idx + 1) : input;
  }
  return input.base64;
}

function extractImageBase64(
  input: z.infer<typeof serverCreateSchema>["image"]
) {
  if (!input) return null;
  if (typeof input === "string") {
    const idx = input.indexOf(",");
    return idx >= 0 ? input.slice(idx + 1) : input;
  }
  return input.base64;
}

// --- Google Cloud Storage helpers ---
let gcs: Storage | null = null;

function getGCS() {
  if (gcs) return gcs;
  const raw = process.env.GCS_CREDENTIALS_JSON;
  if (!raw) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Missing GCS_CREDENTIALS_JSON env; required for Google Cloud Storage uploads",
    });
  }
  let creds: GCSCredentials;
  try {
    creds = JSON.parse(raw) as GCSCredentials;
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid GCS_CREDENTIALS_JSON; must be valid JSON",
    });
  }
  gcs = new Storage({
    credentials: creds,
    projectId: creds.project_id,
  });
  return gcs;
}

function getBucket() {
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Missing GCS_BUCKET env; required for Google Cloud Storage uploads",
    });
  }
  return getGCS().bucket(bucketName);
}

async function uploadToGCS(
  buffer: Buffer,
  filename: string,
  contentType: string
) {
  const bucket = getBucket();
  const file = bucket.file(filename);
  await file.save(buffer, {
    resumable: false,
    contentType,
    metadata: { contentType },
  });
  // UBLA buckets don't allow per-object ACL changes (makePublic).
  // Default: return a time-limited signed URL; optionally return a public URL
  // if you've configured bucket-level public access via IAM.
  const usePublicRead = process.env.GCS_PUBLIC_READ === "true";
  if (usePublicRead) {
    // Assumes bucket IAM grants roles/storage.objectViewer to allUsers.
    return `https://storage.googleapis.com/${bucket.name}/${filename}`;
  }

  // Generate a signed URL (v4). Max 7 days per GCS constraints.
  const ttlSecRaw = Number(process.env.GCS_SIGNED_URL_TTL_SECONDS ?? 604800);
  const ttlSec = Math.min(Math.max(ttlSecRaw, 60), 604800); // clamp between 1min and 7d
  const expires = Date.now() + ttlSec * 1000;
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    version: "v4",
    expires,
  });
  return signedUrl;
}

// Keep function names to avoid call-site changes
async function uploadToVercelBlob(buffer: Buffer, filename: string) {
  // Upload PDF to GCS instead of Vercel Blob
  return uploadToGCS(buffer, filename, "application/pdf");
}

async function uploadImageToBlob(buffer: Buffer, filename: string) {
  // Upload PNG to GCS instead of Vercel Blob
  return uploadToGCS(buffer, filename, "image/png");
}

export const resumeRouter = createTRPCRouter({
  create: protectedProcedure
    .input(serverCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Extract PDF from input and convert to buffer
      const base64 = extractPdfBase64(input.file);
      const pdfBuffer = Buffer.from(base64, "base64");

      const MAX_BYTES = 10 * 1024 * 1024; // 10MB
      if (pdfBuffer.byteLength > MAX_BYTES) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "PDF exceeds 10MB limit",
        });
      }
      if (pdfBuffer.subarray(0, 4).toString("ascii") !== "%PDF") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid PDF file",
        });
      }

      const pdfFileName = `resumes/${crypto.randomUUID()}.pdf`;

      // Upload PDF to Vercel Blob
      const pdfUrl = await uploadToVercelBlob(pdfBuffer, pdfFileName);

      let imageUrl: string | null = null;

      // Handle image upload if image is provided
      if (input.image) {
        const imageBase64 = extractImageBase64(input.image);
        if (imageBase64) {
          const imageBuffer = Buffer.from(imageBase64, "base64");
          const imageFileName = `images/${crypto.randomUUID()}.png`;

          imageUrl = await uploadImageToBlob(imageBuffer, imageFileName);
        }
      }

      // Save to database
      const createdResumeArray = await db
        .insert(resume)
        .values({
          userId: ctx.auth.user.id,
          companyName: input.companyName,
          jobTitle: input.jobTitle,
          jobDescription: input.jobDescription,
          resumePath: pdfUrl, // PDF URL from blob upload
          imagePath: imageUrl, // PNG URL from blob upload (if provided)
        })
        .returning();

      const createdResume = createdResumeArray[0];

      await inngest.send({
        name: "resume/analysis",
        data: {
          resumeId: createdResume.id,
          userId: ctx.auth.user.id,
          image: imageUrl,
          jobTitle: input.jobTitle,
          jobDescription: input.jobDescription,
          companyName: input.companyName,
        },
      });
      return createdResume;
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [resumeData] = await db
        .select({ ...getTableColumns(resume) })
        .from(resume)
        .where(
          and(eq(resume.id, input.id), eq(resume.userId, ctx.auth.user.id))
        );

      if (!resumeData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Resume not found",
        });
      }
      return resumeData;
    }),
  getStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [resumeData] = await db
        .select({
          id: resume.id,
          status: resume.status,
          updatedAt: resume.updatedAt,
        })
        .from(resume)
        .where(
          and(eq(resume.id, input.id), eq(resume.userId, ctx.auth.user.id))
        );

      if (!resumeData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Resume not found",
        });
      }
      return resumeData;
    }),
  getMany: protectedProcedure.query(async ({ ctx }) => {
    const data = await db
      .select({
        ...getTableColumns(resume),
      })
      .from(resume)
      .where(eq(resume.userId, ctx.auth.user.id))
      .orderBy(desc(resume.createAt));
    return data;
  }),
});
