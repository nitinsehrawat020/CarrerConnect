import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import SignInView from "@/app/modules/auth/ui/views/signInView";
import { Card } from "@/components/ui/card";

const page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!!session) {
    redirect("/");
  }
  return <SignInView />;
};
export default page;
