import { CallView } from "@/app/modules/call/ui/views/call-view";
import { auth } from "@/lib/auth";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAppConfig } from "@/lib/utils";

interface Props {
  params: Promise<{ meetingId: string }>;
}

const Page = async ({ params }: Props) => {
  const { meetingId } = await params;
  const queryClient = getQueryClient();
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/sign-in");
  }

  void queryClient.prefetchQuery(
    trpc.meetings.getOne.queryOptions({ id: meetingId })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CallView meetingId={meetingId} appConfig={appConfig} />
    </HydrationBoundary>
  );
};

export default Page;
