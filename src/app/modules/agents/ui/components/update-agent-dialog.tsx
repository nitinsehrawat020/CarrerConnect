import ResponsiveDialog from "@/components/responsice-dialog";
import AgentForm from "./agent-form";
import { AgentGetOne } from "../../types";

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: AgentGetOne;
}

const UpdateAgentDialog = ({
  open,
  onOpenChange,
  initialValues,
}: UpdateDialogProps) => {
  return (
    <ResponsiveDialog
      title="Edit Agent"
      description="Edit the Agent details"
      open={open}
      onOpenChange={onOpenChange}
    >
      <AgentForm
        onSucces={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
        initialValues={initialValues}
      />
    </ResponsiveDialog>
  );
};
export default UpdateAgentDialog;
