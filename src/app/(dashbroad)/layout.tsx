import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "../modules/dashboard/ui/components/dashboard-sidebar";
import DashboardNavbar from "../modules/dashboard/ui/components/dashboard-navbar";
import { getQueryClient, trpc } from "@/trpc/server";

import { ErrorState } from "@/components/error-state";
import { ErrorBoundary } from "react-error-boundary";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

interface Props {
  children: React.ReactNode;
}

const layout = ({ children }: Props) => {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(trpc.user.getOne.queryOptions());
  return (
    <SidebarProvider>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ErrorBoundary
          fallback={
            <ErrorState
              title="Error loading resume"
              description="Please try again later"
            />
          }
        >
          <DashboardSidebar />
        </ErrorBoundary>
      </HydrationBoundary>
      <main className="flex flex-col h-screen w-screen bg-muted">
        <DashboardNavbar />
        {children}
      </main>
    </SidebarProvider>
  );
};
export default layout;
