"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Receipt, AlertCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { signupAction } from "@/actions/auth-actions";

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="w-full max-w-sm space-y-6">
      {/* Brand */}
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-2xl tracking-tight text-slate-900">BillYours</span>
        </Link>
        <h1 className="text-2xl font-black text-slate-900">Create your account</h1>
        <p className="text-slate-500 text-sm mt-1">Set up your shop and start billing in 2 minutes</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 text-red-700 text-sm rounded-xl flex items-center gap-2.5 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Business / Shop Name *</label>
          <input
            type="text"
            name="businessName"
            required
            placeholder="e.g. Ramesh Kirana or Royal Hair Salon"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Owner&apos;s Full Name *</label>
          <input
            type="text"
            name="ownerName"
            required
            placeholder="e.g. Ramesh Kumar"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Business Email *</label>
          <input
            type="email"
            name="email"
            required
            placeholder="you@business.com"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Password *</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={6}
              placeholder="Min. 6 characters"
              className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Business Type</label>
          <select
            name="businessType"
            defaultValue="retail"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="retail">Retail Shop / Grocery</option>
            <option value="restaurant">Restaurant / Cafe / Food</option>
            <option value="salon">Salon / Spa / Beauty</option>
            <option value="service">Services / Repairs / Tailoring</option>
            <option value="other">Other Business</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Phone Number <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="tel"
            name="phone"
            placeholder="+91 98765 43210"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Setting up your shop...
            </>
          ) : (
            "Create Account & Start Free Trial"
          )}
        </button>
      </form>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
        7-day full access · No credit card needed
      </div>

      <p className="text-center text-sm text-slate-500 border-t border-slate-100 pt-4">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
