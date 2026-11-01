"use client";

import { useState, useTransition } from "react";
import { Store, Receipt, ShieldCheck, CheckCircle2, AlertCircle, Building2, HelpCircle } from "lucide-react";
import { updateBusinessDetailsAction, updateBillPreferencesAction } from "@/actions/settings-actions";
import { INDIAN_STATES } from "@/lib/billing-calculations";

interface SettingsFormProps {
  account: {
    id: string;
    businessName: string;
    ownerName: string;
    businessType: string;
    businessEmail: string | null;
    businessPhone: string | null;
    address: string | null;
    state: string | null;
    currency: string;
    invoicePrefix: string;
    receiptPreference: string;
    defaultTaxRate: string | null;
    defaultTaxLabel: string | null;
    gstin?: string | null;
    gstRegistrationType?: string | null;
    pan?: string | null;
    fssai?: string | null;
    website?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    googleReviewLink?: string | null;
  };
  user: {
    name: string;
    email: string;
  };
  subscriptionInfo: {
    status: string;
    daysRemaining: number;
    trialEndsAt: string;
  };
}

export function SettingsForm({ account, user, subscriptionInfo }: SettingsFormProps) {
  const [bizMessage, setBizMessage] = useState<string | null>(null);
  const [prefMessage, setPrefMessage] = useState<string | null>(null);
  const [isBizPending, startBizTransition] = useTransition();
  const [isPrefPending, startPrefTransition] = useTransition();

  const handleUpdateBusiness = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBizMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startBizTransition(async () => {
      const res = await updateBusinessDetailsAction(formData);
      if (res.success) {
        setBizMessage("Business details updated successfully!");
        setTimeout(() => setBizMessage(null), 3000);
      } else {
        setBizMessage(res.error || "Failed to update business details.");
      }
    });
  };

  const handleUpdatePreferences = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPrefMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startPrefTransition(async () => {
      const res = await updateBillPreferencesAction(formData);
      if (res.success) {
        setPrefMessage("Bill preferences updated successfully!");
        setTimeout(() => setPrefMessage(null), 3000);
      } else {
        setPrefMessage(res.error || "Failed to update billing preferences.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Business Profile Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Store className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-base text-slate-900">Business Profile & Bill Print Details</h2>
        </div>

        {bizMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{bizMessage}</span>
          </div>
        )}

        <form onSubmit={handleUpdateBusiness} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                name="businessName"
                required
                defaultValue={account.businessName}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Owner Name *
              </label>
              <input
                type="text"
                name="ownerName"
                required
                defaultValue={account.ownerName}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Phone
              </label>
              <input
                type="tel"
                name="phone"
                defaultValue={account.businessPhone || ""}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Printed on bill if provided</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Email
              </label>
              <input
                type="email"
                name="email"
                defaultValue={account.businessEmail || ""}
                placeholder="contact@business.com"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Printed on bill if provided</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop / Office Address
              </label>
              <input
                type="text"
                name="address"
                defaultValue={account.address || ""}
                placeholder="Shop number, Street, Area, City"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Business State *
              </label>
              <select
                name="state"
                defaultValue={account.state || "Karnataka"}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Default state for sales and Intra-state GST</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Category
              </label>
              <select
                name="businessType"
                defaultValue={account.businessType}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="retail">Retail Shop</option>
                <option value="restaurant">Restaurant / Cafe / Food</option>
                <option value="salon">Salon / Beauty Business</option>
                <option value="service">Services / Repairs</option>
                <option value="other">Other Business</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GST Registration Type *
              </label>
              <select
                name="gstRegistrationType"
                defaultValue={account.gstRegistrationType || "REGULAR"}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="REGULAR">Regular Taxpayer (Standard GST Invoicing)</option>
                <option value="COMPOSITION">Composition Scheme (Bill of Supply - No GST collection)</option>
                <option value="UNREGISTERED">Unregistered Business (No GST)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN (Goods & Services Tax ID)
              </label>
              <input
                type="text"
                name="gstin"
                maxLength={15}
                defaultValue={account.gstin || ""}
                placeholder="e.g. 29ABCDE1234F1Z5"
                className="w-full px-3 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Printed on bill if provided</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                FSSAI License Number
              </label>
              <input
                type="text"
                name="fssai"
                maxLength={20}
                defaultValue={account.fssai || ""}
                placeholder="e.g. 11223344556677"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Food safety license — printed on bill if provided</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                name="pan"
                maxLength={10}
                defaultValue={account.pan || ""}
                placeholder="e.g. ABCDE1234F"
                className="w-full px-3 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Website
              </label>
              <input
                type="text"
                name="website"
                defaultValue={account.website || ""}
                placeholder="e.g. www.chaibites.in"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Printed on bill if provided</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Facebook Account Name
              </label>
              <input
                type="text"
                name="facebook"
                defaultValue={account.facebook || ""}
                placeholder="e.g. @chaibites or fb.com/chaibites"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Printed on bill if provided</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instagram Account Name
              </label>
              <input
                type="text"
                name="instagram"
                defaultValue={account.instagram || ""}
                placeholder="e.g. @chaibites.official"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Printed on bill if provided</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Review Link
              </label>
              <input
                type="url"
                name="googleReviewLink"
                defaultValue={account.googleReviewLink || ""}
                placeholder="e.g. https://g.page/r/chaibites-review/review"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Included in WhatsApp bill messages to request customer reviews.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isBizPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              {isBizPending ? "Saving..." : "Save Business Details"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Billing & Receipt Preferences */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Receipt className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-base text-slate-900">Billing & Receipt Preferences</h2>
        </div>

        {prefMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{prefMessage}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePreferences} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill Number Prefix
              </label>
              <input
                type="text"
                name="invoicePrefix"
                maxLength={6}
                defaultValue={account.invoicePrefix}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Example: BY produces BY-2026-000001</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Print Format
              </label>
              <select
                name="receiptPreference"
                defaultValue={account.receiptPreference}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="thermal">Thermal POS Receipt (58mm / 80mm)</option>
                <option value="a4">Standard A4 / PDF Invoice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Tax Rate (%)
              </label>
              <input
                type="number"
                name="defaultTaxRate"
                min="0"
                max="100"
                step="0.01"
                defaultValue={account.defaultTaxRate || "0"}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Can still be enabled or changed per bill</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Tax Label
              </label>
              <input
                type="text"
                name="defaultTaxLabel"
                defaultValue={account.defaultTaxLabel || "GST"}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPrefPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              {isPrefPending ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Account & Subscription Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-base text-slate-900">Subscription & Account</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Status</span>
            <p className="font-bold text-sm text-slate-900 mt-0.5">
              {subscriptionInfo.status === "TRIAL"
                ? `10-Day Free Trial (${subscriptionInfo.daysRemaining} days left)`
                : subscriptionInfo.status}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Valid Until</span>
            <p className="font-bold text-sm text-slate-900 mt-0.5">{subscriptionInfo.trialEndsAt}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Account Owner</span>
            <p className="font-bold text-sm text-slate-900 mt-0.5 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
