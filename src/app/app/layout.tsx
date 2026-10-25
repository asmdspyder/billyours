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
    <div className="min-h-screen flex flex-col bg-slate-50">
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

      <div className="flex-1 flex flex-col md:flex-row">
        <AppSidebar
          businessName={session.account.businessName}
          ownerName={session.user.name}
        />

        <main className="flex-1 pb-20 md:pb-6 overflow-y-auto min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
