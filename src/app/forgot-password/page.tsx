"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">BillYours</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Reset your password</h1>
          <p className="text-xs text-slate-500">Enter your business email to receive reset instructions</p>
        </div>

        {submitted ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2 text-center text-xs text-green-800">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
            <p className="font-bold text-sm">Reset link dispatched</p>
            <p>
              If an account with <strong>{email}</strong> exists, password reset instructions have been sent.
            </p>
            <div className="pt-2">
              <Link href="/login" className="text-blue-600 font-bold hover:underline">
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              Send Reset Instructions
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-100">
          <Link href="/login" className="hover:text-slate-600 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
