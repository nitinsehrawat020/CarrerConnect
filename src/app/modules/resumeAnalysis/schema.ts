import { z } from "zod";

export const serverCreateSchema = z.object({
  companyName: z.string().min(1),
  jobTitle: z.string().min(1),
  jobDescription: z.string().min(1).max(1000),
  // Accept base64 data URL string or object with base64 contents
  file: z.union([
    z.string().startsWith("data:application/pdf;base64,"),
    z.object({
      type: z.literal("application/pdf"),
      base64: z.string(),
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
