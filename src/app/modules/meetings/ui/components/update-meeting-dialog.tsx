import ResponsiveDialog from "@/components/responsice-dialog";
import MeetingForm from "./meeting-form";
import { meetingGetOne } from "../../types";

interface newMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: meetingGetOne;
}

const UpdateMeetingDialog = ({
  open,
  onOpenChange,
  initialValues,
}: newMeetingDialogProps) => {
  return (
    <ResponsiveDialog
      title="Edit Meeting"
      description="Edit the Meeting details"
      open={open}
      onOpenChange={onOpenChange}
    >
      <MeetingForm
        onCancel={() => onOpenChange(false)}
        onSuccess={() => {
          onOpenChange(false);
        }}
        initialValues={initialValues}
      />
    </ResponsiveDialog>
  );
};
export default UpdateMeetingDialog;
