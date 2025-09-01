import GeneratedAvatar from "@/components/generated-avatar";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { ChevronDown, CreditCardIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

const DashbroadUserButton = () => {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();

  if (isPending || !data?.user) {
    return null;
  }
  const onLogout = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/sign-in"),
      },
    });
  };

  return (
    <DropdownMenu>
      {" "}
      <DropdownMenuTrigger className="rounded-lg border border-border/10 p-3 w-full flex items-center justify-between bg-white/5 hover:bg-white/10 overflow-hidden">
        {data.user.image ? (
          <Avatar>
            <AvatarImage src={data.user.image} />
          </Avatar>
        ) : (
          <GeneratedAvatar
            seed={data.user.name}
            varient="initials"
            className="size-9 mr-3"
          />
        )}

        <div className="flex flex-col gap-0.5 text-left overflow-hiddenflex-1 min-w-0">
          <p className="text-sm truncate w-full ">{data.user.name}</p>
          <p className="text-xs truncate w-full ">{data.user.email}</p>
        </div>
        <ChevronDown className="size-4 shirnk-0" />
      </DropdownMenuTrigger>{" "}
      <DropdownMenuContent
        align="end"
        side="right"
        className="rounded-lg border border-border p-3 w-full flex flex-col items-center justify-between bg-white hover:bg-white/10 overflow-hidden"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1 ">
            <span className="font-medium text-black truncate">
              {data.user.name}
            </span>
            <span className="text-sm font-normal text-muted-foreground truncate">
              {data.user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer flex items-center justify-between text-accent-foreground w-full">
          Billing <CreditCardIcon className="size-4 " />
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer flex items-center justify-between text-accent-foreground w-full"
          onClick={onLogout}
        >
          Logout
          <LogOutIcon className="size-4 " />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
export default DashbroadUserButton;
