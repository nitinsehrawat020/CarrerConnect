import { JSX, useState } from "react";

import { Button } from "@/components/ui/button";
import ResponsiveDialog from "@/components/responsice-dialog";

export const useConfirm = (
  title: string,
  description: string
): [() => JSX.Element, () => Promise<unknown>] => {
  const [promise, setpromise] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = () => {
    return new Promise((resolve) => {
      setpromise({ resolve });
    });
  };

  const handleClose = () => {
    setpromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(false);
  };

  const ConfirmationDialog = () => {
    return (
      <ResponsiveDialog
        open={promise !== null}
        onOpenChange={handleClose}
        title={title}
        description={description}
      >
        <div className="pt-4 w-full flex flex-col-reverse gap-y2 lg:flex-row gap-x-2 items-center justify-end">
          <Button
            onClick={handleCancel}
            className="w-full lg:w-auto"
            variant={"outline"}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="w-full lg:w-auto">
            Confirm
          </Button>
        </div>
      </ResponsiveDialog>
    );
  };
  return [ConfirmationDialog, confirm];
};
