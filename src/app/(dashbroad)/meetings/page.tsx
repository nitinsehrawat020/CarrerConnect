import MeetingView from "@/app/modules/meetings/ui/views/meeting-view";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

const page = () => {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.meetings.getMany.queryOptions({}));
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <LoadingState
            title="Loading meetings"
            description="This may take a while"
          />
        }
      >
        <ErrorBoundary
          fallback={
            <ErrorState
              title=" Erro Loading meetings"
              description="Please try again later"
            />
          }
        >
          <MeetingView />;
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  );
};
export default page;
