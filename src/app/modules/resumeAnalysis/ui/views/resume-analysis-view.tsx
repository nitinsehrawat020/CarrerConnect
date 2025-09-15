"use client";
import { EmptyState } from "@/components/empty-state";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { DataTable } from "@/components/data-table";
import { columns } from "../components/columns";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const ResumeAnalysisView = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: resumes } = useSuspenseQuery(
    trpc.resume.getMany.queryOptions()
  );
  const router = useRouter();

  // Check for resumes that are still processing
  const processingResumes = resumes.filter(
    (resume) =>
      resume.status &&
      ["uploading", "converting", "analyzing"].includes(resume.status)
  );

  // Set up polling for processing resumes
  useEffect(() => {
    if (processingResumes.length === 0) return;

    const interval = setInterval(() => {
      // Invalidate and refetch the resume list to get updated statuses
      queryClient.invalidateQueries({
        queryKey: trpc.resume.getMany.queryKey(),
      });
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [processingResumes.length, queryClient, trpc.resume.getMany]);

  return (
    <div className=" flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
      {resumes.length > 0 ? (
        <DataTable
          data={resumes}
          columns={columns}
          onRowClick={(row) => router.push(`/resumeAnalysis/${row.id}`)}
        />
      ) : (
        <EmptyState
          title="Get your first analysis by agent"
          description="Upload your resume, job title, and description to get your ATS score and improvement tips."
        />
      )}
    </div>
  );
};
