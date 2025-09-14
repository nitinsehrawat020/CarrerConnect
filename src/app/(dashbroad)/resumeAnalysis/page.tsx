import ResumeHeaderList from "@/app/modules/resumeAnalysis/ui/components/resumne-header-list";
import { ResumeAnalysisView } from "@/app/modules/resumeAnalysis/ui/views/resume-analysis-view";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

const page = () => {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(trpc.resume.getMany.queryOptions());
  return (
    <>
      <ResumeHeaderList />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ErrorBoundary
          fallback={
            <ErrorState
              title="Error loading resume"
              description="Please try again later"
            />
          }
        >
          <Suspense
            fallback={
              <LoadingState
                title="Loading Resume"
                description="This may take a while "
              />
            }
          >
            <ResumeAnalysisView />
          </Suspense>
        </ErrorBoundary>
      </HydrationBoundary>
    </>
  );
};
export default page;
