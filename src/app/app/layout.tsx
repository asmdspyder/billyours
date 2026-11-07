import { requireBusinessAccount, checkSubscriptionStatus } from "@/lib/auth";
import { AppNavbar } from "@/components/nav/app-navbar";
import { AdminBanner } from "@/components/admin/admin-banner";
import { TrialBanner } from "@/components/nav/trial-banner";
import { SubscriptionExpiredScreen } from "@/components/subscription/subscription-expired-screen";
import { AppTypography } from "@/components/app-typography";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireBusinessAccount();
  const subStatus = checkSubscriptionStatus(session.account);

  // When free trial or paid subscription has expired, block access and show contact numbers
  if (subStatus.isExpired && !session.isImpersonating) {
    return (
      <AppTypography>
        <SubscriptionExpiredScreen
          businessName={session.account.businessName}
          ownerName={session.user.name}
          accountId={session.account.id}
        />
      </AppTypography>
    );
  }

  return (
    <AppTypography>
      <div className="app-shell h-[100dvh] flex flex-col overflow-hidden">
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

        {/* Main content area — full width on tablet/laptop/desktop, pb-14 on mobile above fixed nav */}
        <main className="app-content flex-1 pb-14 md:pb-0 min-h-0 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </AppTypography>
  );
}
