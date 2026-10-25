"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Receipt, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { loginAction } from "@/actions/auth-actions";

export function LoginForm() {
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
      const res = await loginAction(null, formData);
      if (res && !res.success) {
        setErrorMsg(res.error || "Invalid email or password.");
      }
    });
  };

  const handleFillDemo = () => {
    setEmail("demo@billyours.com");
    setPassword("DemoOwner2026!");
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
        <h1 className="text-xl font-bold text-slate-900">Sign in to your shop</h1>
        <p className="text-xs text-slate-500">Enter your business email and password to access billing</p>
      </div>

      {/* Quick Demo Fill button */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-blue-900 font-medium">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Testing? Quick-fill demo shop credentials</span>
        </div>
        <button
          type="button"
          onClick={handleFillDemo}
          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-2xs"
        >
          Fill Demo
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            name="email"
            required
            placeholder="you@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-semibold text-slate-700">Password</label>
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            name="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isPending ? "Signing in..." : "Sign In to BillYours"}
        </button>
      </form>

      {/* Footer link */}
      <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-blue-600 hover:underline">
          Start 7-day free trial
        </Link>
      </div>
    </div>
  );
}
