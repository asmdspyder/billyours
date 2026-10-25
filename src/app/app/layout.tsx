import { requireBusinessAccount, checkSubscriptionStatus } from "@/lib/auth";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { AdminBanner } from "@/components/admin/admin-banner";
import { TrialBanner } from "@/components/nav/trial-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireBusinessAccount();
  const subStatus = checkSubscriptionStatus(session.account);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {session.isImpersonating && session.adminUser && (
        <AdminBanner
          businessName={session.account.businessName}
          adminEmail={session.adminUser.email}
        />
      )}

      <TrialBanner
        status={subStatus.status}
        daysRemaining={subStatus.daysRemaining}
        isExpired={subStatus.isExpired}
      />

      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        <AppSidebar
          businessName={session.account.businessName}
          ownerName={session.user.name}
        />

        {/* Main content area — pb-16 for mobile/tablet bottom nav */}
        <main className="flex-1 pb-16 lg:pb-0 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
