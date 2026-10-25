import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — BillYours",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <h1 className="text-2xl font-black text-slate-900">Privacy Policy</h1>
        <p className="text-xs text-slate-400">Effective Date: October 2026</p>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-slate-900">1. Information We Collect</h2>
          <p>
            BillYours collects business contact details (business name, owner name, email address, optional phone number) and billing records created by users (item descriptions, unit prices, customer contact details when provided, invoice amounts).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-slate-900">2. Tenant Data Isolation</h2>
          <p>
            We strictly enforce multi-tenant isolation. Your customer records, catalog items, and sales bills are strictly accessible only by your authenticated business account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-slate-900">3. WhatsApp Sharing & Public Links</h2>
          <p>
            When you choose to share a bill via WhatsApp or link, a cryptographically secure, unpredictable link token is generated so that your customer can view only their specific bill without accessing any other tenant records.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-slate-900">4. Data Security</h2>
          <p>
            All passwords are cryptographically hashed. All communication is encrypted via TLS/HTTPS. We do not sell or monetize your business or customer records.
          </p>
        </section>
      </div>
    </div>
  );
}
