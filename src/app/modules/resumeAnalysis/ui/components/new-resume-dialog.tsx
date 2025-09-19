import ResponsiveDialog from "@/components/responsice-dialog";
import { ResumeForm } from "./resume-form";

interface newResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewResumeDialog = ({ open, onOpenChange }: newResumeDialogProps) => {
  return (
    <ResponsiveDialog
      title="Analysis New Resume"
      description="Analysis a new Agent"
      open={open}
      onOpenChange={onOpenChange}
    >
      <ResumeForm
        onCancel={() => onOpenChange(false)}
        onSucces={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
};
export default NewResumeDialog;
