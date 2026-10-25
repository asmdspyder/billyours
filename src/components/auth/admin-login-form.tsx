"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ShieldCheck, AlertCircle, Sparkles, ArrowLeft } from "lucide-react";
import { adminLoginAction } from "@/actions/auth-actions";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await adminLoginAction(null, formData);
      if (res && !res.success) {
        setErrorMsg(res.error || "Invalid admin credentials.");
      }
    });
  };

  const handleFillAdmin = () => {
    setEmail("admin@billyours.com");
    setPassword("AdminSecure2026!");
  };

  return (
    <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center font-black mx-auto mb-2 shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Platform Administrator</h1>
        <p className="text-xs text-slate-500">Sign in to manage business tenants and subscriptions</p>
      </div>

      {/* Quick Admin Demo Fill button */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-amber-900 font-medium">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Quick-fill Admin Credentials</span>
        </div>
        <button
          type="button"
          onClick={handleFillAdmin}
          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors shadow-2xs"
        >
          Fill Admin
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Admin Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Admin Email</label>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Admin Password</label>
          <input
            type="password"
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all"
        >
          {isPending ? "Authenticating..." : "Sign In to Admin Panel"}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-100">
        <Link href="/login" className="hover:text-slate-600 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Business Login</span>
        </Link>
      </div>
    </div>
  );
}
