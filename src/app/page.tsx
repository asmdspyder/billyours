import Link from "next/link";
import {
  Receipt,
  Zap,
  Printer,
  Share2,
  Users,
  TrendingUp,
  Percent,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Store,
  Smartphone,
} from "lucide-react";

export const metadata = {
  title: "BillYours — Simple Billing for Every Business",
  description:
    "Fast, lightweight billing software for small businesses in India. Create bills in seconds, share on WhatsApp, print receipts, and track daily sales.",
};

export default function LandingPage() {
  const faqs = [
    {
      q: "Is BillYours difficult to use?",
      a: "No! BillYours was created specifically for shop and business owners who want zero complexity. If you can use WhatsApp or tap a screen, you can create a bill in 10 seconds.",
    },
    {
      q: "Can I use it on my mobile phone?",
      a: "Yes. BillYours has a thumb-friendly mobile layout that works smoothly on any smartphone or tablet browser without needing to download a heavy app.",
    },
    {
      q: "Can I print receipts and bills?",
      a: "Yes. You can print 58mm or 80mm thermal receipts directly using your standard browser print flow, or print clean A4 invoices for clients.",
    },
    {
      q: "Can I send bills on WhatsApp?",
      a: "Yes! With one tap, BillYours opens WhatsApp with a prefilled message and a secure, private link for your customer to view or download their bill.",
    },
    {
      q: "Do I need to manage complex inventory or stock?",
      a: "No. BillYours is focused purely on fast billing. You save your item names and selling prices, and bill quickly without inventory headaches.",
    },
    {
      q: "Can I apply GST or tax to bills?",
      a: "Yes. There is a simple, optional toggle to add a percentage tax (e.g. 5%, 12%, 18%) to any bill whenever needed.",
    },
    {
      q: "What happens after my 7-day free trial?",
      a: "All your bills, customer records, and items are permanently saved in read-only mode. You can upgrade to our monthly (₹299/mo) or yearly plan to continue creating new bills.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              BillYours
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 px-3 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-colors"
            >
              Start 7-Day Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-xs">
          <Zap className="w-3.5 h-3.5" />
          <span>Simple billing for small Indian businesses</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
          Billing made simple. <br />
          <span className="text-blue-600">Business made easier.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Create bills in seconds, share on WhatsApp, print receipts, and track your daily sales — built for retail shops, salons, cafes, and service providers.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            Start 7-day free trial
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-base rounded-xl border border-slate-200 transition-colors"
          >
            Sign in to your shop
          </Link>
        </div>

        <p className="text-xs text-slate-400 font-medium">
          No credit card required • Instant setup • 7-day full access
        </p>

        {/* Product Preview Card */}
        <div className="pt-8 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-4 md:p-6 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-xs font-semibold text-slate-500 ml-2">BillYours Workspace</span>
              </div>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">
                Live & Fast
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <p className="font-bold text-slate-900 text-sm">Sharma General Store</p>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>Basmati Rice 1kg (x2)</span>
                  <span className="font-bold">₹240.00</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>Fortune Sunflower Oil 1L</span>
                  <span className="font-bold">₹145.00</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Discount (10%)</span>
                  <span className="text-green-600 font-bold">- ₹38.50</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1">
                  <span>Total Payable:</span>
                  <span className="text-blue-600 font-black">₹346.50</span>
                </div>
              </div>

              <div className="flex flex-col justify-between bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                    Instant Actions
                  </span>
                  <p className="text-slate-600 text-xs">
                    Print thermal POS receipt or tap to share securely on WhatsApp with customer.
                  </p>
                </div>
                <div className="flex gap-2 pt-3">
                  <span className="flex-1 py-2 text-center bg-slate-900 text-white font-bold rounded-lg text-xs">
                    Print Receipt
                  </span>
                  <span className="flex-1 py-2 text-center bg-green-600 text-white font-bold rounded-lg text-xs">
                    WhatsApp Share
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white border-y border-slate-200 px-4">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="text-sm text-slate-500">
              Designed for ordinary shop and business owners, not accountants or enterprise IT departments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Fast 10-Second Billing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add catalog items or custom items with one tap, adjust quantities, apply discounts, and complete bills instantly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center font-bold">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Print-Ready Receipts & A4</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect your ordinary thermal receipt printer (58mm or 80mm) or print clean A4 invoices directly from your browser.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">One-Tap WhatsApp Sharing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Send customers a prefilled WhatsApp message with a secure, private link to view and download their digital receipt.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Automatic Customer Lookup</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Type a customer&apos;s mobile number and BillYours instantly retrieves their name and complete purchase history.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Simple Sales Dashboard</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Know today&apos;s sales, bill count, average order value, and collected versus unpaid amounts at a single glance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                <Percent className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Optional GST / Tax Toggle</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Need to add tax? Enable the simple percentage toggle (5%, 12%, 18%) whenever applicable. Tax is completely optional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4 max-w-4xl mx-auto space-y-10 text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          How BillYours Works in 3 Steps
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="font-bold text-base text-slate-900">Add Your Items</h3>
            <p className="text-xs text-slate-500">
              Save frequent items and their selling prices in your catalog, or add custom one-time items on the fly.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="font-bold text-base text-slate-900">Create & Complete Bill</h3>
            <p className="text-xs text-slate-500">
              Tap items to add to cart, optionally enter customer mobile, and click Complete Bill. Sequential numbers allocate automatically.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="font-bold text-base text-slate-900">Print, Share & Track</h3>
            <p className="text-xs text-slate-500">
              Hand out a printed slip, send a WhatsApp link to your customer, and monitor your sales progress on the dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-white border-t border-slate-200 px-4">
        <div className="max-w-4xl mx-auto space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-slate-500">
              Both plans include all features. Start with our 7-day free trial. No card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto text-left">
            {/* Monthly */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Monthly Plan</h3>
                <p className="text-xs text-slate-500">For flexible month-to-month billing</p>
              </div>
              <div className="text-3xl font-black text-slate-900">
                ₹299 <span className="text-xs font-normal text-slate-500">/ month</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Unlimited bills & receipts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  WhatsApp share link generation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Thermal 58mm/80mm & A4 printing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Customer history & sales dashboard
                </li>
              </ul>
              <Link
                href="/signup"
                className="block w-full py-2.5 text-center bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Start 7-Day Free Trial
              </Link>
            </div>

            {/* Yearly */}
            <div className="bg-blue-50/70 p-6 rounded-2xl border-2 border-blue-500 space-y-4 relative">
              <div className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full">
                Save ~17% (2 Months Free)
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Yearly Plan</h3>
                <p className="text-xs text-slate-500">Best value for established shops</p>
              </div>
              <div className="text-3xl font-black text-blue-600">
                ₹2,999 <span className="text-xs font-normal text-slate-500">/ year</span>
              </div>
              <p className="text-[11px] text-blue-700 font-semibold -mt-2">
                Equivalent to approximately ₹250 / month
              </p>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  All core features included
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Full 12 months access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Priority support & backup
                </li>
              </ul>
              <Link
                href="/signup"
                className="block w-full py-2.5 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                Start 7-Day Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-black text-slate-900 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
              <h3 className="font-bold text-sm text-slate-900">{faq.q}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-10 px-4 text-xs border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-xs">
              BY
            </div>
            <span>BillYours</span>
          </div>

          <div className="flex flex-wrap gap-4 text-slate-400">
            <Link href="/login" className="hover:text-white">Sign In</Link>
            <Link href="/signup" className="hover:text-white">Start Free Trial</Link>
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            <Link href="/admin/login" className="hover:text-white text-slate-500">Admin</Link>
          </div>

          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} BillYours. Simple billing for every business.
          </p>
        </div>
      </footer>
    </div>
  );
}
