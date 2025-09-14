"use client";
"use client";
import { EmptyState } from "@/components/empty-state";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { DataTable } from "@/components/data-table";
import { columns } from "../components/columns";
import { useRouter } from "next/navigation";

export const ResumeAnalysisView = () => {
  const trpc = useTRPC();
  const { data: resumes } = useSuspenseQuery(
    trpc.resume.getMany.queryOptions()
  );
  const router = useRouter();

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
