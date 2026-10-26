import Link from "next/link";
import {
  ReceiptText,
  Zap,
  Printer,
  Share2,
  Users,
  TrendingUp,
  Percent,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Store,
  Sparkles,
  Lock,
} from "lucide-react";

export const metadata = {
  title: "BillYours — Simple Billing for Every Business",
  description:
    "Fast, lightweight billing software for small businesses in India. Create bills in seconds, share on WhatsApp, print receipts, and track daily sales.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ─── Nav ──────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <ReceiptText className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-black text-slate-900 text-lg tracking-tight">BillYours</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3 py-2 transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors">
              Try Free
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="pt-16 pb-20 px-5 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Built for Indian small businesses
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-slate-900 mb-5">
          Bill your customers
          <br />
          <span className="text-blue-600">in 10 seconds flat.</span>
        </h1>

        <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed mb-8">
          Simple billing for cafes, shops, salons, and service providers.
          WhatsApp share, thermal print, GST — all with zero complexity.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-2xl shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.99]"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-base rounded-2xl transition-colors"
          >
            Sign in
          </Link>
        </div>

        <p className="text-sm text-slate-400">
          Free forever for basic billing · No credit card required
        </p>

        {/* App Preview mockup */}
        <div className="mt-14 max-w-3xl mx-auto">
          <div className="bg-slate-900 rounded-2xl p-1.5 shadow-2xl">
            <div className="bg-white rounded-xl overflow-hidden">
              {/* Fake browser bar */}
              <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-400 text-center">
                  billyours.com/app/billing
                </div>
              </div>

              {/* Fake UI */}
              <div className="grid grid-cols-5 divide-x divide-slate-100 min-h-[260px]">
                {/* Left: item grid */}
                <div className="col-span-3 p-4 space-y-3 bg-slate-50">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white rounded-lg px-3 py-2 text-xs text-slate-400 border border-slate-200">🔍 Search items...</div>
                    <div className="bg-slate-900 text-white text-xs font-bold px-2.5 py-2 rounded-lg">+ Custom</div>
                  </div>
                  <div className="flex gap-1.5 text-[10px]">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-full font-bold">All</span>
                    <span className="bg-white text-slate-600 px-2 py-1 rounded-full border border-slate-200">Hot Drinks</span>
                    <span className="bg-white text-slate-600 px-2 py-1 rounded-full border border-slate-200">Snacks</span>
                    <span className="bg-white text-slate-600 px-2 py-1 rounded-full border border-slate-200">Desserts</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: "Masala Chai", price: "₹30", selected: true },
                      { name: "Cold Coffee", price: "₹60" },
                      { name: "Veg Sandwich", price: "₹80", selected: true },
                      { name: "Samosa (2pc)", price: "₹25" },
                      { name: "Maggi", price: "₹50" },
                      { name: "Brownie", price: "₹90" },
                    ].map((item) => (
                      <div
                        key={item.name}
                        className={`p-2.5 rounded-lg border text-left text-[10px] ${
                          item.selected
                            ? "bg-blue-50 border-blue-400 ring-1 ring-blue-300"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                        <p className="text-blue-600 font-black mt-1">{item.price}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: bill */}
                <div className="col-span-2 p-4 space-y-3 bg-white">
                  <div className="flex items-center gap-1.5">
                    <ReceiptText className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Current Bill</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">2 items</span>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex items-center justify-between bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-900">Masala Chai</span>
                      <div className="flex items-center gap-1">
                        <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded">−</span>
                        <span className="font-bold">1</span>
                        <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded">+</span>
                        <span className="font-bold w-10 text-right">₹30</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-900">Veg Sandwich</span>
                      <div className="flex items-center gap-1">
                        <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded">−</span>
                        <span className="font-bold">1</span>
                        <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded">+</span>
                        <span className="font-bold w-10 text-right">₹80</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-2 text-[10px] space-y-0.5">
                    <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹110</span></div>
                    <div className="flex justify-between text-green-600 font-bold"><span>Discount 10%</span><span>−₹11</span></div>
                    <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-100 mt-1">
                      <span>Total</span>
                      <span className="text-blue-600">₹99</span>
                    </div>
                  </div>
                  <div className="bg-blue-600 rounded-lg py-2 text-center text-white text-[10px] font-black">
                    ✓ Complete Bill · ₹99
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Logos / Social Proof ──────────────────────────────────────────────── */}
      <section className="py-10 border-y border-slate-100 bg-slate-50">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <p className="text-sm text-slate-400 font-medium mb-6">Trusted by shops, cafes & service providers</p>
          <div className="flex flex-wrap justify-center gap-8 text-slate-500 text-sm font-semibold">
            {["General Stores", "Cafes & Restaurants", "Beauty Salons", "Repair Shops", "Medical Stores", "Service Providers"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-400" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-5 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto">
            Designed for ordinary shop owners, not accountants or enterprise IT.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Zap,
              color: "bg-blue-100 text-blue-600",
              title: "10-Second Billing",
              desc: "Tap items from your catalog, adjust quantities, apply discounts, and complete a bill in seconds.",
            },
            {
              icon: Smartphone,
              color: "bg-violet-100 text-violet-600",
              title: "Works on Any Device",
              desc: "Fully responsive — use it on your Android phone, iPhone, or tablet. No app download needed.",
            },
            {
              icon: Share2,
              color: "bg-green-100 text-green-600",
              title: "WhatsApp in One Tap",
              desc: "Send customers a prefilled WhatsApp message with a secure digital receipt link instantly.",
            },
            {
              icon: Printer,
              color: "bg-amber-100 text-amber-600",
              title: "Thermal & A4 Printing",
              desc: "Print 58mm and 80mm thermal receipts or clean A4 invoices from your browser — no drivers.",
            },
            {
              icon: Users,
              color: "bg-sky-100 text-sky-600",
              title: "Customer Auto-Lookup",
              desc: "Type a mobile number and instantly see the customer's name and purchase history.",
            },
            {
              icon: Percent,
              color: "bg-rose-100 text-rose-600",
              title: "GST & Discount Support",
              desc: "Apply flat or percentage discounts and optional GST (5%, 12%, 18%) to any bill.",
            },
            {
              icon: TrendingUp,
              color: "bg-emerald-100 text-emerald-600",
              title: "Sales Dashboard",
              desc: "See today's revenue, bill count, average order value, and collections by payment mode at a glance.",
            },
            {
              icon: ShieldCheck,
              color: "bg-slate-100 text-slate-600",
              title: "Secure by Default",
              desc: "Your data is isolated per business. Bill links are cryptographically signed and private.",
            },
            {
              icon: ReceiptText,
              color: "bg-orange-100 text-orange-600",
              title: "Sequential Bill Numbers",
              desc: "Automatic, gapless bill numbering with your custom prefix (e.g. CBC-2026-000001).",
            },
          ].map((f) => (
            <div key={f.title} className="group p-6 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all bg-white">
              <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-12">Up and running in 3 steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "1", title: "Add your items", desc: "Save your products or services with prices in your catalog once — reuse forever." },
              { n: "2", title: "Tap & complete", desc: "Select items, enter customer phone (optional), hit Complete Bill. Done in seconds." },
              { n: "3", title: "Print or share", desc: "Print a thermal slip, send a WhatsApp link, or share a digital receipt link." },
            ].map((s) => (
              <div key={s.n} className="relative flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center mb-4 shadow-md shadow-blue-500/20">
                  {s.n}
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-5">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Simple, honest pricing
          </h2>
          <p className="text-slate-500 text-base">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="relative bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Free</span>
              <div className="text-3xl font-black text-slate-900 mt-1">₹0 <span className="text-sm font-normal text-slate-400">/ forever</span></div>
              <p className="text-slate-500 text-sm mt-1">For individuals just getting started</p>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-600">
              {[
                "Up to 50 bills / month",
                "Unlimited catalog items",
                "WhatsApp share links",
                "Basic thermal printing",
                "1 business account",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
              <li className="flex items-start gap-2.5 text-slate-400">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                Customer history (limited)
              </li>
              <li className="flex items-start gap-2.5 text-slate-400">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                Sales dashboard (limited)
              </li>
            </ul>
            <Link
              href="/signup"
              className="block w-full py-2.5 text-center bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm rounded-xl transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* Monthly */}
          <div className="relative bg-blue-600 rounded-2xl border border-blue-500 p-6 space-y-5 text-white shadow-xl shadow-blue-500/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <div>
              <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Monthly</span>
              <div className="text-3xl font-black mt-1">₹299 <span className="text-sm font-normal text-blue-300">/ month</span></div>
              <p className="text-blue-200 text-sm mt-1">For growing businesses</p>
            </div>
            <ul className="space-y-2.5 text-sm text-blue-100">
              {[
                "Unlimited bills & receipts",
                "Unlimited catalog items",
                "WhatsApp share links",
                "Thermal 58mm/80mm + A4 print",
                "Full customer history",
                "Complete sales dashboard",
                "GST & discount support",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-200 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block w-full py-2.5 text-center bg-white hover:bg-blue-50 text-blue-600 font-bold text-sm rounded-xl transition-colors shadow-sm"
            >
              Start 7-day free trial
            </Link>
            <p className="text-center text-xs text-blue-300">No card required to start</p>
          </div>

          {/* Yearly */}
          <div className="relative bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="absolute -top-3 right-4 bg-green-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full">
              Save 17%
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Yearly</span>
              <div className="text-3xl font-black text-slate-900 mt-1">₹2,999 <span className="text-sm font-normal text-slate-400">/ year</span></div>
              <p className="text-green-700 text-sm font-semibold mt-1">≈ ₹250/mo · 2 months free</p>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-600">
              {[
                "Everything in Monthly",
                "Full 12 months access",
                "Priority onboarding support",
                "Early access to new features",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-medium">
              💳 Online payments coming soon. Contact us to pay manually.
            </p>
            <Link
              href="/signup"
              className="block w-full py-2.5 text-center bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors"
            >
              Start 7-day free trial
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-slate-50 border-t border-slate-100">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Is BillYours difficult to use?",
                a: "Not at all. If you can use WhatsApp, you can use BillYours. It's designed specifically for shop owners — tap items, hit complete, done.",
              },
              {
                q: "Can I use it on my mobile phone?",
                a: "Yes. BillYours has a mobile-first layout with a tab-based billing screen. Items on one tab, bill on the other — no scrolling chaos.",
              },
              {
                q: "Can I print bills and share on WhatsApp?",
                a: "Yes to both. Print thermal 58mm/80mm receipts or A4 invoices from your browser. Share a secure digital receipt link on WhatsApp with one tap.",
              },
              {
                q: "What's the difference between the Free and Monthly plan?",
                a: "Free gives you up to 50 bills per month — perfect for very small operations. Monthly/Yearly removes all limits and includes full customer history, sales dashboard, and priority support.",
              },
              {
                q: "What happens after my 7-day free trial?",
                a: "Your data stays safe in read-only mode. You can still view past bills and records. Upgrade anytime to resume creating new bills.",
              },
              {
                q: "Can I apply GST to bills?",
                a: "Yes. There's a simple optional toggle to add GST percentage (5%, 12%, 18%) to any bill. Tax is completely optional per bill.",
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">{faq.q}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-slate-900 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Start billing today.
          </h2>
          <p className="text-slate-400 text-base mb-8">
            Free to start. No credit card. Ready in 2 minutes.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-blue-500/30 transition-all"
          >
            Create your free account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-500 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <ReceiptText className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">BillYours</span>
          </div>

          <div className="flex flex-wrap justify-center gap-5 text-xs">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Get Started</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/admin/login" className="hover:text-white transition-colors text-slate-700">Admin</Link>
          </div>

          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} BillYours
          </p>
        </div>
      </footer>
    </div>
  );
}
