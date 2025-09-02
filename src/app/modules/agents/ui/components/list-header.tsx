"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon, XCircleIcon } from "lucide-react";
import NewAgentDialog from "./new-agent-dialog";
import { useState } from "react";
import { useAgentsFilter } from "../../hooks/use-agents-filter";
import { SearchFilter } from "./agents-search-filter";
import { DEFAULT_PAGE } from "@/constant";

const ListHeader = () => {
  const [filter, setFilters] = useAgentsFilter();
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const isAnyFilterModified = !!filter.search;

  const onClearFilters = () => {
    setFilters({
      search: "",
      page: DEFAULT_PAGE,
    });
  };
  return (
    <>
      <NewAgentDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <div className="py-4 px-4 md:px-8 flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium text-xl">My Agents</h5>
          <Button
            onClick={() => {
              setIsDialogOpen(true);
            }}
          >
            <PlusIcon /> New Agent
          </Button>
        </div>
        <div className="flex items-center gap-x-2 p-1">
          {" "}
          <SearchFilter />
          {isAnyFilterModified && (
            <Button variant={"outline"} size="sm" onClick={onClearFilters}>
              <XCircleIcon className="" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
export default ListHeader;
