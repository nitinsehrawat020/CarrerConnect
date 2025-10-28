import { MeetingIdView } from "@/app/modules/meetings/ui/views/meeting-id-view";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { auth } from "@/lib/auth";
import { getQueryClient, trpc } from "@/trpc/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ meetingId: string }>;
}

const MeetingIdPage = async ({ params }: Props) => {
  const { meetingId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    trpc.meetings.getOne.queryOptions({ id: meetingId })
  );
  void queryClient.prefetchQuery(trpc.user.getOne.queryOptions());
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <LoadingState
            title="loading meeting"
            description="This may take a few second"
          />
        }
      >
        <ErrorBoundary
          fallback={
            <ErrorState
              title="Error loading Meeting"
              description="Please try again later "
            />
          }
        >
          <MeetingIdView meetingId={meetingId} />
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  );
};
export default MeetingIdPage;
