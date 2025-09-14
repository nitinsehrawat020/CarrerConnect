"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

interface Props {
  resumeId: string;
}

function ResumeIdView({ resumeId }: Props) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.resume.getOne.queryOptions({ id: resumeId })
  );
  return <div>ResumeId View</div>;
}

export default ResumeIdView;
