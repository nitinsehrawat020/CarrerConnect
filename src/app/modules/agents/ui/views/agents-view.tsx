"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import ResponsiveDialog from "@/components/responsice-dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const AgentsView = () => {
  const trpc = useTRPC();
  const [isOpen, setIsopen] = useState(false);
  const { data } = useSuspenseQuery(trpc.agents.getMany.queryOptions());

  return (
    <div>
      <ResponsiveDialog
        title="responsive Test"
        description="responsive Description"
        open={isOpen}
        onOpenChange={setIsopen}
      >
        <Button>Some Action</Button>
      </ResponsiveDialog>
      {JSON.stringify(data, null, 2)}
    </div>
  );
};
