import { db } from "@/db";
import { user } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { userUpdateSchema } from "../schema";

export const userRouter = createTRPCRouter({
  getOne: protectedProcedure.query(async ({ ctx }) => {
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, ctx.auth.user.id));
    if (!existingUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User Not Found" });
    }
    return existingUser;
  }),
  update: protectedProcedure
    .input(userUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await db
        .update(user)
        .set(input)
        .where(eq(user.id, ctx.auth.user.id))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User details can't be updated",
        });
      }
      return updatedUser;
    }),
});
