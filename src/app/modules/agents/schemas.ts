import { z } from "zod";
export const agendsInsertSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  instruction: z.string().min(1, { message: "instruction are  required" }),
});

export const agentsUpdateSchema = agendsInsertSchema.extend({
  id: z.string().min(1, { message: "Id is required" }),
});
