import { requireAccountOwner, checkSubscriptionStatus } from "@/lib/auth";
import { SettingsForm } from "@/components/settings/settings-form";
import { SubscriptionExpiredScreen } from "@/components/subscription/subscription-expired-screen";

export const metadata = {
  title: "Settings — BillYours",
};

export default async function SettingsPage() {
  const session = await requireAccountOwner();
  const subStatus = checkSubscriptionStatus(session.account);

  if (subStatus.isExpired && !session.isImpersonating) {
    return (
      <SubscriptionExpiredScreen
        businessName={session.account.businessName}
        ownerName={session.user.name}
        accountId={session.account.id}
      />
    );
  }

  return (
    <div className="no-scrollbar mx-auto h-full w-full max-w-[1360px] space-y-6 overflow-y-auto px-3 py-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 pb-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Business Settings</h1>
        <p className="text-xs md:text-sm text-slate-500">
          Manage your business information, receipt preferences, and subscription status.
        </p>
      </div>

      <SettingsForm
        account={session.account}
        user={session.user}
        subscriptionInfo={{
          status: subStatus.status,
          daysRemaining: subStatus.daysRemaining,
          trialEndsAt: session.account.trialEndsAt.toLocaleDateString("en-IN", {
            dateStyle: "long",
          }),
        }}
      />
    </div>
  );
}
