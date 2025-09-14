import { db } from "@/db";
import { resume } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { eq, getTableColumns } from "drizzle-orm";
import z from "zod";
import { serverCreateSchema } from "../schema";
import { put } from "@vercel/blob";

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
    .mutation(async ({ input, ctx }) => {
      console.log(input);

      // Extract PDF from input and convert to buffer
      const base64 = extractPdfBase64(input.file);
      const pdfBuffer = Buffer.from(base64, "base64");

      // Generate user-specific filename
      const userSlug = (ctx.auth.user.name || "user")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const pdfFileName = `resumes/${userSlug}-${Math.random()
        .toString(36)
        .slice(2)}.pdf`;

      // Upload PDF to Vercel Blob
      const pdfUrl = await uploadToVercelBlob(pdfBuffer, pdfFileName);

      let imageUrl: string | null = null;

      // Handle image upload if image is provided
      if (input.image) {
        const imageBase64 = extractImageBase64(input.image);
        if (imageBase64) {
          const imageBuffer = Buffer.from(imageBase64, "base64");
          const imageFileName = `images/${userSlug}-${Math.random()
            .toString(36)
            .slice(2)}.png`;

          imageUrl = await uploadImageToBlob(imageBuffer, imageFileName);
        }
      }

      // Save to database
      const [createdResume] = await db
        .insert(resume)
        .values({
          companyName: input.companyName,
          jobTitle: input.jobTitle,
          jobDescription: input.jobDescription,
          resumePath: pdfUrl, // PDF URL from blob upload
          imagePath: imageUrl, // PNG URL from blob upload (if provided)
        })
        .returning();
      return createdResume;
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [resumeData] = await db
        .select({ ...getTableColumns(resume) })
        .from(resume)
        .where(eq(resume.id, input.id));

      if (!resumeData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Resume not found",
        });
      }
      return resumeData;
    }),
  getMany: protectedProcedure.query(async () => {
    const data = await db
      .select({
        ...getTableColumns(resume),
      })
      .from(resume);

    return data;
  }),
});
