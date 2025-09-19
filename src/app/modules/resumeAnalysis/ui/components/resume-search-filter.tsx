import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

export const ResumeSearchFilter = () => {
  return (
    <div className="relative">
      <Input
        placeholder="Filter by company"
        className="h-9 bg-white w-[200px] pl-7"
      />
      <SearchIcon className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
};
