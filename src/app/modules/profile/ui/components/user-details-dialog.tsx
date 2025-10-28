import ResponsiveDialog from "@/components/responsice-dialog";
import UserEditForm from "./user-edit-form";
import { userGetOne } from "../../type";

interface newMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: userGetOne;
}

const UserDetailsDialog = ({
  open,
  user,
  onOpenChange,
}: newMeetingDialogProps) => {
  return (
    <ResponsiveDialog
      title={`${user.idealJob && user.careerPath && user.previousJob && user.targetCompany ? "Edit" : "Add"} user details`}
      description={`${user.idealJob && user.careerPath && user.previousJob && user.targetCompany ? "Edit" : "Add"} user details to make agent to have mroe context about your goal`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <UserEditForm
        user={user}
        onCancel={() => onOpenChange(!open)}
        onSuccess={() => onOpenChange(!open)}
      />
    </ResponsiveDialog>
  );
};
export default UserDetailsDialog;
