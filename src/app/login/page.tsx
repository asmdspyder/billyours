import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign In — BillYours",
};

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    if (session.user.role === "ADMIN" && !session.account) {
      redirect("/admin");
    }
    redirect("/app/billing");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
