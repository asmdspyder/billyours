import { requireBusinessAccount } from "@/lib/auth";
import { getStaffMembersAction } from "@/actions/staff-actions";
import { StaffManagement } from "@/components/staff/staff-management";

export const metadata = {
  title: "Staff & Team — BillYours",
};

export default async function StaffPage() {
  await requireBusinessAccount();
  const res = await getStaffMembersAction();
  const initialStaff = res.staff || [];

  return <StaffManagement initialStaff={initialStaff} />;
}
