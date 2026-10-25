"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Receipt, AlertCircle, ShieldCheck } from "lucide-react";
import { signupAction } from "@/actions/auth-actions";

export function SignupForm() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await signupAction(null, formData);
      if (res && !res.success) {
        setErrorMsg(res.error || "Failed to create account. Please try again.");
      }
    });
  };

  return (
    <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-1">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-sm">
            <Receipt className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">BillYours</span>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Start 7-Day Free Trial</h1>
        <p className="text-xs text-slate-500">Create bills and print receipts in less than 2 minutes</p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Business / Shop Name *</label>
          <input
            type="text"
            name="businessName"
            required
            placeholder="e.g. Ramesh Kirana or Royal Hair Salon"
            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Owner&apos;s Full Name *</label>
          <input
            type="text"
            name="ownerName"
            required
            placeholder="e.g. Ramesh Kumar"
            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Business Email *</label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@business.com"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password *</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="Min. 6 chars"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Business Type</label>
          <select
            name="businessType"
            defaultValue="retail"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="retail">Retail Shop / Grocery</option>
            <option value="restaurant">Restaurant / Cafe / Food</option>
            <option value="salon">Salon / Spa / Beauty</option>
            <option value="service">Services / Repairs / Tailoring</option>
            <option value="other">Other Business</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
          <input
            type="tel"
            name="phone"
            placeholder="+91 98765 43210"
            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isPending ? "Setting Up Shop..." : "Start Free Trial (Instant Access)"}
          </button>
        </div>
      </form>

      {/* Trial terms footnote */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
        <span>7 days free • No credit card needed • Cancel anytime</span>
      </div>

      <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-blue-600 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
