import ResumeIdView from "@/app/modules/resumeAnalysis/ui/views/resume-id-view";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { auth } from "@/lib/auth";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface Props {
  params: Promise<{ resumeId: string }>;
}

const ResumeIdPage = async ({ params }: Props) => {
  const { resumeId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.resume.getOne.queryOptions({ id: resumeId })
  );

  return (
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
          <ResumeIdView resumeId={resumeId} />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
};

export default ResumeIdPage;
