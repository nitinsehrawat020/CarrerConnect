import { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";
export type meetingGetMany =
  inferRouterOutputs<AppRouter>["meetings"]["getMany"]["items"];

export type meetingGetOne = inferRouterOutputs<AppRouter>["meetings"]["getOne"];

export enum MeetingStatus {
  Upcoming = "upcoming",
  Active = "active",
  Complete = "completed",
  Processing = "processing",
  Cancelled = "cancelled",
}
