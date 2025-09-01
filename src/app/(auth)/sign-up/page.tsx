import SignUpView from "@/app/modules/auth/ui/views/signUpView";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { headers } from "next/headers";

const page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!!session) {
    redirect("/");
  }
  return (
    <div>
      <SignUpView />
    </div>
  );
};
export default page;
