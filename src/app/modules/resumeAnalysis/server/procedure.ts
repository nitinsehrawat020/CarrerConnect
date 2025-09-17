import { db } from "@/db";
import { resume } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import z from "zod";
import { serverCreateSchema } from "../schema";
import { put } from "@vercel/blob";
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

async function uploadToVercelBlob(buffer: Buffer, filename: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Missing BLOB_READ_WRITE_TOKEN env for blob uploads",
    });
  }
  const { url } = await put(filename, buffer, {
    access: "public",
    token,
    contentType: "application/pdf",
  });
  return url;
}

async function uploadImageToBlob(buffer: Buffer, filename: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Missing BLOB_READ_WRITE_TOKEN env for blob uploads",
    });
  }

  const { url } = await put(filename, buffer, {
    access: "public",
    token,
    contentType: "image/png",
  });
  return url;
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
      console.log(imageUrl);

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
