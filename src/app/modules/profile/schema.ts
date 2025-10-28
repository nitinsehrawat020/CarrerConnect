import z from "zod";

export const userUpdateSchema = z.object({
  careerPath: z.string().min(1, { message: "Career path is required" }),
  idealJob: z.string().min(1, { message: "Ideal Path path is required" }),
  targetCompany: z.string(),
  previousJob: z.string(),
});
