import { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";
export type userGetOne = inferRouterOutputs<AppRouter>["user"]["getOne"];
