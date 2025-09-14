"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ResumeGetMany } from "../../types";
import { CornerDownRightIcon } from "lucide-react";
import { format } from "date-fns";

const scoreColor = (score?: number) => {
  if (typeof score !== "number") return "bg-gray-100 text-gray-500";
  if (score >= 90) return "bg-green-100 text-green-800";
  if (score >= 80) return "bg-blue-100 text-blue-800";
  if (score >= 70) return "bg-gray-100 text-gray-800";
  if (score >= 60) return "bg-rose-100 text-rose-800";
  return "bg-rose-100 text-rose-800";
};

export const columns: ColumnDef<ResumeGetMany[number]>[] = [
  {
    accessorKey: "CompanyName",
    header: () => <div className="p-2 text-[16px] font-bold">Company Name</div>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-y-1">
        <span className="font-semibold capitalize">
          {row.original.companyName}
        </span>

        <div className="flex items-center gap-x-2">
          <div className="flex items-center gap-x-1">
            <CornerDownRightIcon className="size-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground max-w-[200px] truncate capitalize">
              {row.original.jobTitle}
            </span>
          </div>

          <span className="text-sm text-muted-foreground">
            {row.original.createAt
              ? format(row.original.createAt, "MMM d")
              : ""}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "ATSScore",
    header: () => <div className=" p-2 text-[16px] font-bold">ATS Score</div>,
    cell: ({ row }) => {
      const score = row.original.feedback?.ATS.score;
      if (typeof score !== "number") {
        return <span className="text-muted-foreground">Processing...</span>;
      }
      return (
        <div
          className={`score-badge ${scoreColor(score)} w-fit p-2 rounded-[4px]`}
        >
          <span className="text-sm font-semibold">{score}</span>
        </div>
      );
    },
  },
];
