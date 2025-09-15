"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ResumeGetMany } from "../../types";
import {
  CornerDownRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import GeneratedAvatar from "@/components/generated-avatar";

const scoreColor = (score?: number) => {
  if (typeof score !== "number") return "bg-gray-100 text-gray-500";
  if (score >= 90) return "bg-green-100 text-green-800";
  if (score >= 80) return "bg-blue-100 text-blue-800";
  if (score >= 70) return "bg-gray-100 text-gray-800";
  if (score >= 60) return "bg-rose-100 text-rose-800";
  return "bg-rose-100 text-rose-800";
};

const StatusIndicator = ({ status }: { status: string }) => {
  switch (status) {
    case "uploading":
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Upload className="size-4" />
          <span className="text-sm font-medium">Uploading</span>
        </div>
      );
    case "converting":
      return (
        <div className="flex items-center gap-2 text-orange-600">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm font-medium">Converting</span>
        </div>
      );
    case "analyzing":
      return (
        <div className="flex items-center gap-2 text-purple-600">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm font-medium">Analyzing</span>
        </div>
      );
    case "completed":
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="size-4" />
          <span className="text-sm font-medium">Completed</span>
        </div>
      );
    case "failed":
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="size-4" />
          <span className="text-sm font-medium">Failed</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="size-4" />
          <span className="text-sm font-medium">Pending</span>
        </div>
      );
  }
};

export const columns: ColumnDef<ResumeGetMany[number]>[] = [
  {
    accessorKey: "CompanyName",
    header: () => <div className="p-2 text-[16px] font-bold">Company Name</div>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <GeneratedAvatar
            varient="initials"
            seed={row.original.companyName}
            className="size-7"
          />
          <span className="font-semibold capitalize">
            {row.original.companyName}
          </span>
        </div>

        <div className="flex items-center gap-x-2">
          <div className="flex items-center gap-x-1">
            <CornerDownRight className="size-3 text-muted-foreground" />
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
    accessorKey: "status",
    header: () => <div className="p-2 text-[16px] font-bold">Status</div>,
    cell: ({ row }) => (
      <StatusIndicator status={row.original.status || "uploading"} />
    ),
  },
  {
    accessorKey: "ATSScore",
    header: () => (
      <div className=" p-2 text-[16px] font-bold">Overall Score</div>
    ),
    cell: ({ row }) => {
      const score = row.original.feedback?.overallScore;
      const status = row.original.status;

      if (status !== "completed" || typeof score !== "number") {
        return <span className="text-muted-foreground">-</span>;
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
