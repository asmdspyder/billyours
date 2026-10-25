import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service — BillYours",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <h1 className="text-2xl font-black text-slate-900">Terms of Service</h1>
        <p className="text-xs text-slate-400">Effective Date: October 2026</p>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By registering an account on BillYours, you agree to these Terms of Service. BillYours provides a billing and invoicing software tool for small businesses.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-slate-900">2. Free Trial & Subscriptions</h2>
          <p>
            New business accounts receive a 7-day free trial. Following the trial, accounts transition to read-only access where historical records are permanently preserved. Subscription plans are available at ₹299/month and ₹2,999/year.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-slate-900">3. Tax Calculation Scope Limitation</h2>
          <p>
            BillYours provides manual, percentage-based tax calculations as a convenience feature. It does not provide automated GST return filing, e-invoicing, or place-of-supply determination. Businesses are responsible for their own tax and statutory filings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-slate-900">4. Responsible Use</h2>
          <p>
            You agree not to use BillYours for unlawful, fraudulent, or abusive billing activities.
          </p>
        </section>
      </div>
    </div>
  );
}
