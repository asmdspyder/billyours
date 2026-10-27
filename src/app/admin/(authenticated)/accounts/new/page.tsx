"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Store, AlertCircle } from "lucide-react";
import { adminCreateAccountAction } from "@/actions/admin-actions";

export default function AdminNewAccountPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await adminCreateAccountAction(formData);
      if (res.success && res.accountId) {
        router.push(`/admin/accounts/${res.accountId}`);
      } else {
        setErrorMsg(res.error || "Failed to create account.");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Accounts</span>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Store className="w-5 h-5 text-blue-600" />
          <h1 className="font-bold text-lg text-slate-900">Create Business Account</h1>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Name *</label>
              <input
                type="text"
                name="businessName"
                required
                placeholder="e.g. Metro Fashion Shop"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Owner Full Name *</label>
              <input
                type="text"
                name="ownerName"
                required
                placeholder="e.g. Suresh Patel"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Owner Email *</label>
              <input
                type="email"
                name="email"
                required
                placeholder="owner@business.com"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Temporary Password</label>
              <input
                type="text"
                name="password"
                defaultValue="Welcome2026!"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Type</label>
              <select
                name="businessType"
                defaultValue="retail"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="retail">Retail Shop</option>
                <option value="restaurant">Restaurant / Cafe</option>
                <option value="salon">Salon / Beauty</option>
                <option value="service">Services / Repairs</option>
                <option value="other">Other Business</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Free Trial (Days)</label>
              <input
                type="number"
                name="trialDays"
                min="1"
                max="365"
                defaultValue="7"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Link
              href="/admin/accounts"
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              {isPending ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
