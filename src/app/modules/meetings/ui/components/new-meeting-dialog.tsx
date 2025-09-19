import ResponsiveDialog from "@/components/responsice-dialog";
import MeetingForm from "./meeting-form";
import { useRouter } from "next/navigation";

interface newMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewMeetingDialog = ({ open, onOpenChange }: newMeetingDialogProps) => {
  const router = useRouter();
  return (
    <ResponsiveDialog
      title="New Meeting"
      description="Create a new Meeting"
      open={open}
      onOpenChange={onOpenChange}
    >
      <MeetingForm
        onCancel={() => onOpenChange(false)}
        onSuccess={(id) => {
          onOpenChange(false);
          router.push(`/meetings/${id}`);
        }}
      />
    </ResponsiveDialog>
  );
};
export default NewMeetingDialog;
