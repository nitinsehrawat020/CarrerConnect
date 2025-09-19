"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { ResumeSearchFilter } from "./resume-search-filter";
import { useState } from "react";
import NewResumeDialog from "./new-resume-dialog";

const ResumeHeaderList = () => {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  return (
    <>
      <NewResumeDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <div className="py-4 px-4 md:px-8 flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium text-xl">Resume Analysis</h5>
          <Button onClick={() => setIsDialogOpen((open) => !open)}>
            <PlusIcon /> Upload Reusme
          </Button>
        </div>
        <div className="flex items-center gap-x-2 p-1">
          <ResumeSearchFilter />
        </div>
      </div>
    </>
  );
};
export default ResumeHeaderList;
