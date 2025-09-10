import { agentsRouter } from "@/app/modules/agents/server/procedures";

import { createTRPCRouter } from "../init";
import { meetingsRouter } from "@/app/modules/meetings/server/procedures";
import { premiumRouter } from "@/app/modules/premium/server/procedure";
export const appRouter = createTRPCRouter({
  agents: agentsRouter,
  meetings: meetingsRouter,
  premium: premiumRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
