import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { Receipt } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col">
      {/* Minimal header */}
      <header className="px-5 py-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-slate-900 text-base">BillYours</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-5">
        <LoginForm />
      </div>
    </div>
  );
}
