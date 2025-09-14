import { z } from "zod";

// Helper function to compute decoded byte length from base64 string
function base64ByteLength(base64String: string): number {
  // Remove padding characters and calculate the byte length
  const padding = (base64String.match(/=/g) || []).length;
  return Math.floor((base64String.length * 3) / 4) - padding;
}

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const serverCreateSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().min(1).max(120),
  jobDescription: z.string().trim().min(1).max(1000),
  // Accept base64 data URL string or object with base64 contents
  file: z.union([
    z
      .string()
      .startsWith("data:application/pdf;base64,")
      .refine(
        (dataUrl) => {
          // Strip the "data:application/pdf;base64," prefix
          const base64Data = dataUrl.slice(
            "data:application/pdf;base64,".length
          );
          const byteLength = base64ByteLength(base64Data);
          return byteLength <= MAX_FILE_SIZE;
        },
        {
          message: `PDF file size must not exceed ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        }
      ),
    z.object({
      type: z.literal("application/pdf"),
      base64: z.string().refine(
        (base64Data) => {
          const byteLength = base64ByteLength(base64Data);
          return byteLength <= MAX_FILE_SIZE;
        },
        {
          message: `PDF file size must not exceed ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        }
      ),
      name: z.string().optional(),
    }),
  ]),
  image: z
    .union([
      z.string().startsWith("data:image/png;base64,"),
      z.object({
        type: z.literal("image/png"),
        base64: z.string(),
        name: z.string().optional(),
      }),
    ])
    .optional(),
});
