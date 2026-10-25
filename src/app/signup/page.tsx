import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";
import { Receipt } from "lucide-react";

export const metadata = {
  title: "Start Free — BillYours",
};

export default async function SignupPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/app/billing");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col">
      <header className="px-5 py-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-slate-900 text-base">BillYours</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <SignupForm />
      </div>
    </div>
  );
}
