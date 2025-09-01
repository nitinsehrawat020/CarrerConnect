import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import HomeView from "./modules/home/ui/views/HomeView";
import { headers } from "next/headers";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }
  return <HomeView />;
}
