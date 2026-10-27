"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Receipt, AlertCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { loginAction } from "@/actions/auth-actions";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Brand */}
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 transition-transform group-hover:scale-105">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-2xl tracking-tight text-slate-900">
            Bill<span className="text-blue-600">Yours</span>
          </span>
        </Link>
        <h1 className="text-2xl font-black text-slate-900">Welcome back</h1>
        <p className="text-slate-500 text-sm mt-1">Sign in to your billing workspace</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 text-red-700 text-sm rounded-xl flex items-center gap-2.5 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Email address</label>
          <input
            type="email"
            name="email"
            required
            placeholder="you@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in to BillYours"
          )}
        </button>
      </form>

      <div className="flex flex-col gap-2 text-center text-sm text-slate-500">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-blue-600 hover:underline">
            Start free trial
          </Link>
        </p>
        <div className="pt-2 border-t border-slate-100">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform Administrator Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
