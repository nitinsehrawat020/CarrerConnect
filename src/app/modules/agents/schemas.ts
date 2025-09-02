import { z } from "zod";
export const agendsInsertSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  instruction: z.string().min(1, { message: "instruction are  required" }),
});
