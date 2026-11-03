import { requireBusinessAccount, checkSubscriptionStatus } from "@/lib/auth";
import { getStaffMembersAction } from "@/actions/staff-actions";
import { StaffManagement } from "@/components/staff/staff-management";
import { SubscriptionExpiredScreen } from "@/components/subscription/subscription-expired-screen";

export const metadata = {
  title: "Staff & Team — BillYours",
};

export default async function StaffPage() {
  const session = await requireBusinessAccount();
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

  const res = await getStaffMembersAction();
  const initialStaff = res.staff || [];

  return <StaffManagement initialStaff={initialStaff} />;
}
