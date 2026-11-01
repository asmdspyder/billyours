"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Lock,
  Phone,
  ArrowRight,
  X,
  Sparkles,
  Building2,
  User,
  Mail,
  MapPin,
  Check,
} from "lucide-react";
import { submitPaidSetupRequestAction } from "@/actions/paid-setup-actions";

export function PricingPlans() {
  const [selectedPlan, setSelectedPlan] = useState<"Monthly" | "Yearly" | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openPlanModal = (plan: "Monthly" | "Yearly") => {
    setSelectedPlan(plan);
    setSubmitted(false);
    setFormError(null);
  };

  const closeModal = () => {
    setSelectedPlan(null);
    setSubmitted(false);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !contactName.trim() || !phone.trim()) {
      setFormError("Please fill in Business Name, Your Name, and Phone Number.");
      return;
    }
    setFormError(null);

    startTransition(async () => {
      await submitPaidSetupRequestAction({
        plan: selectedPlan || "Monthly",
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim() || undefined,
      });
      setSubmitted(true);
    });
  };

  const supportNumbers = [
    { display: "7904561269", tel: "+917904561269", wa: "917904561269" },
    { display: "7845418030", tel: "+917845418030", wa: "917845418030" },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {/* Free Plan / 10-Day Free Trial */}
        <div className="relative bg-white rounded-2xl border border-slate-200 p-6 space-y-5 flex flex-col justify-between shadow-xs">
          <div className="space-y-5">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                10-Day Free Trial
              </span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                ₹0 <span className="text-sm font-normal text-slate-400">/ 10 days</span>
              </div>
              <p className="text-slate-500 text-sm mt-1">Try all features risk-free</p>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-600">
              {[
                "Unlimited bills during trial",
                "Full item-level GST calculation",
                "Thermal receipt & A4 prints",
                "Staff & biller attribution",
                "WhatsApp bill sharing",
                "Google review link integration",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
              <li className="flex items-start gap-2.5 text-slate-400">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Dedicated support after trial</span>
              </li>
            </ul>
          </div>
          <div className="space-y-2 pt-4">
            <Link
              href="/signup"
              className="block w-full py-2.5 text-center bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm rounded-xl transition-colors"
            >
              Start 10-day free trial
            </Link>
            <p className="text-center text-xs text-slate-400">No credit card required</p>
          </div>
        </div>

        {/* Monthly Paid Plan */}
        <div className="relative bg-blue-600 rounded-2xl border border-blue-500 p-6 space-y-5 text-white shadow-xl shadow-blue-500/20 flex flex-col justify-between">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Most Popular
          </div>
          <div className="space-y-5">
            <div>
              <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">
                Monthly Plan
              </span>
              <div className="text-3xl font-black mt-1">
                ₹299 <span className="text-sm font-normal text-blue-300">/ month</span>
              </div>
              <p className="text-blue-200 text-sm mt-1">Full professional setup for growing shops</p>
            </div>
            <ul className="space-y-2.5 text-sm text-blue-100">
              {[
                "Unlimited bills & receipts",
                "Unlimited products & categories",
                "Complete item-level GST engine",
                "Staff details & bill attribution",
                "WhatsApp receipt & Google review link",
                "Thermal 58mm/80mm + A4 prints",
                "Sales dashboard & customer history",
                "Direct onboarding & setup assistance",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-200 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2 pt-4">
            <button
              onClick={() => openPlanModal("Monthly")}
              className="w-full py-2.5 text-center bg-white hover:bg-blue-50 text-blue-600 font-bold text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Get Monthly Plan
            </button>
            <p className="text-center text-xs text-blue-200">Direct assisted setup by our team</p>
          </div>
        </div>

        {/* Yearly Paid Plan */}
        <div className="relative bg-white rounded-2xl border border-slate-200 p-6 space-y-5 flex flex-col justify-between shadow-xs">
          <div className="absolute -top-3 right-4 bg-green-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full">
            Save 17%
          </div>
          <div className="space-y-5">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Yearly Plan
              </span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                ₹2,999 <span className="text-sm font-normal text-slate-400">/ year</span>
              </div>
              <p className="text-green-700 text-sm font-semibold mt-1">
                ≈ ₹250/mo · 2 months free
              </p>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-600">
              {[
                "Everything in Monthly Plan",
                "Full 12 months uninterrupted access",
                "Priority catalog onboarding support",
                "Staff team management & reporting",
                "Free bill customization & branding",
                "Direct phone & WhatsApp priority support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2 pt-4">
            <button
              onClick={() => openPlanModal("Yearly")}
              className="w-full py-2.5 text-center bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Get Yearly Plan
            </button>
            <p className="text-center text-xs text-slate-400">Best value for established shops</p>
          </div>
        </div>
      </div>

      {/* Paid Plan Form & Setup Confirmation Popup Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {submitted ? (
              /* Success / Contact Numbers Popup */
              <div className="text-center space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7 stroke-[2.5]" />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                    Details Received
                  </span>
                  <h3 className="text-xl font-black text-slate-900">
                    Thank You, {contactName}!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                    We have recorded your details for the <strong>{selectedPlan} Plan</strong>. To complete your setup and activate your account immediately, please contact us on these numbers:
                  </p>
                </div>

                {/* Contact Numbers Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    Direct Setup & Onboarding Helpline
                  </p>
                  {supportNumbers.map((num) => (
                    <div
                      key={num.display}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            +91 {num.display}
                          </span>
                          <span className="text-[10px] text-slate-500">BillYours Setup Support</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${num.tel}`}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${num.wa}?text=${encodeURIComponent(
                            `Hello, I want to set up the ${selectedPlan} Plan on BillYours for my shop "${businessName}". Contact: ${contactName} (${phone}).`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-500 text-center pt-1">
                    Please call or message us so our team can configure your account and set up your subscription right away.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              /* Lead Capture Form */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      Paid Plan Setup
                    </span>
                    <h3 className="text-lg font-black text-slate-900">
                      Configure Your {selectedPlan} Plan
                    </h3>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Please provide your business details below. Our team will contact you to perform full setup, catalog loading, and billing configuration.
                </p>

                {formError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-100">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 text-xs md:text-sm">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">
                      Business / Shop Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Sharma Supermarket or Modern Salon"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">
                      Your Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Ramesh Sharma"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700">City / State</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Bengaluru"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isPending ? "Submitting..." : "Submit Details & Contact Setup Team"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
