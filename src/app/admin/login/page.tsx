import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/auth/admin-login-form";

export const metadata = {
  title: "Administrator Sign In — BillYours",
};

export default async function AdminLoginPage() {
  const session = await getCurrentSession();
  if (session && session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <AdminLoginForm />
    </div>
  );
}
