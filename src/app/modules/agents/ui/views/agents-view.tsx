"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { DataTable } from "../components/data-table";
import { columns } from "../components/columns";
import { EmptyState } from "../components/error-state";

export const AgentsView = () => {
  const trpc = useTRPC();

  const { data } = useSuspenseQuery(trpc.agents.getMany.queryOptions());

  return (
    <div className=" flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
      <DataTable data={data} columns={columns} />
      {data.length === 0 && (
        <EmptyState
          title="Create your First agent"
          description="Create an agent to join your meeting. Each agent will follow your intruction and can interact with participants during the call"
        />
      )}
    </div>
  );
};
