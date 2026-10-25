import { requireAccountOwner, checkSubscriptionStatus } from "@/lib/auth";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata = {
  title: "Settings — BillYours",
};

export default async function SettingsPage() {
  const session = await requireAccountOwner();
  const subStatus = checkSubscriptionStatus(session.account);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
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
