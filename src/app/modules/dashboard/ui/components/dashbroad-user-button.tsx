"use client";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  ChevronDown,
  CreditCardIcon,
  LogOutIcon,
  UserPenIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import UserDetailsDialog from "@/app/modules/profile/ui/components/user-details-dialog";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

const DashbroadUserButton = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isPending } = authClient.useSession();

  const router = useRouter();
  const isMobile = useIsMobile();

  const trpc = useTRPC();
  const { data: user } = useSuspenseQuery(trpc.user.getOne.queryOptions());

  const onLogout = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/sign-in"),
      },
    });
  };
  if (isPending || !data?.user) {
    return null;
  }

  if (isMobile) {
    return (
      <>
        <UserDetailsDialog
          open={isDialogOpen}
          onOpenChange={() => setIsDialogOpen((value) => !value)}
          user={user}
        />
        <Drawer>
          <DrawerTrigger
            asChild
            className="rounded-lg border border-border/10 p-3 w-full flex items-center justify-between bg-white/5 hover:bg-white/10 overflow-hidden"
          >
            <div className="rounded-lg border border-border/10 p-3 w-full flex items-center justify-between bg-white/5 hover:bg-white/10 overflow-hidden">
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
            </div>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{data.user.name}</DrawerTitle>
              <DrawerDescription>{data.user.email}</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <Button
                variant={"outline"}
                onClick={() => {
                  authClient.customer.portal();
                }}
              >
                <CreditCardIcon className="size-4 text-black" />
                Billing
              </Button>
              <Button variant={"outline"} onClick={onLogout}>
                <LogOutIcon className="size-4 text-black" />
                Logout
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <UserDetailsDialog
        open={isDialogOpen}
        onOpenChange={() => setIsDialogOpen((value) => !value)}
        user={user}
      />
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
          side="top"
          className="rounded-lg border border-border p-3 w-full flex flex-col items-center justify-between bg-white/5 hover:bg-white/10  overflow-hidden gap-1 "
        >
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0 ">
              <span className="font-medium  truncate">{data.user.name}</span>
              <span className="text-sm font-extralight text-white truncate">
                {data.user.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer flex items-center justify-between  w-full"
            onClick={() => setIsDialogOpen((value) => !value)}
          >
            User details <UserPenIcon className="size-4 " />
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer flex items-center justify-between  w-full"
            onClick={() => {
              authClient.customer.portal();
            }}
          >
            Billing <CreditCardIcon className="size-4 " />
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer flex items-center justify-between  w-full"
            onClick={onLogout}
          >
            Logout
            <LogOutIcon className="size-4 " />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
export default DashbroadUserButton;
