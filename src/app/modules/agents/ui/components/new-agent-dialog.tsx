import ResponsiveDialog from "@/components/responsice-dialog";
import AgentForm from "./agent-form";

interface newAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewAgentDialog = ({ open, onOpenChange }: newAgentDialogProps) => {
  return (
    <ResponsiveDialog
      title="New Agent"
      description="Create a new Agent"
      open={open}
      onOpenChange={onOpenChange}
    >
      <AgentForm
        onSucces={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
};
export default NewAgentDialog;
