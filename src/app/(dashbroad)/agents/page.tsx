import { AgentsView } from "@/app/modules/agents/ui/views/agents-view";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";

const page = async () => {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.agents.getMany.queryOptions());
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <LoadingState
            title="Loading Agents"
            description="This may take a while"
          />
        }
      >
        <ErrorBoundary
          fallback={
            <ErrorState
              title=" Erro Loading Agents"
              description="Please try again later"
            />
          }
        >
          <AgentsView />;
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  );
};
export default page;
