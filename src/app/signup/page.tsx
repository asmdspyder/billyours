import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Start 7-Day Free Trial — BillYours",
};

export default async function SignupPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/app/billing");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <SignupForm />
    </div>
  );
}
