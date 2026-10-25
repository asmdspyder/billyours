import { requireBusinessAccount, checkSubscriptionStatus } from "@/lib/auth";
import { AppNavbar } from "@/components/nav/app-navbar";
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

      <AppNavbar
        businessName={session.account.businessName}
        ownerName={session.user.name}
      />

      {/* Main content area — full width on tablet/laptop/desktop, pb-14 on mobile */}
      <main className="flex-1 pb-14 md:pb-0 overflow-y-auto min-h-0 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
