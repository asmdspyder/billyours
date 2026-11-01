import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Percent,
  Plus,
  Printer,
  ReceiptText,
  Share2,
  ShieldCheck,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/landing/brand-logo";
import { FastBillingVisual, LookupVisual, PrintVisual, WhatsAppVisual } from "@/components/landing/feature-visuals";
import { brandFont } from "@/components/landing/fonts";
import { HeroReceipt } from "@/components/landing/hero-receipt";
import { CatalogArt, ShareArt, StopwatchArt } from "@/components/landing/how-it-works-art";
import { LandingMobileMenu } from "@/components/landing/landing-mobile-menu";
import { PricingPlans } from "@/components/landing/pricing-plans";
import { SalesShowcase } from "@/components/landing/sales-showcase";
import styles from "@/components/landing/landing.module.css";

export const metadata = {
  title: "BillYours — Simple Billing for Every Business",
  description:
    "Fast, lightweight billing software for small businesses in India. Create bills in seconds, share on WhatsApp, print receipts, and track daily sales.",
};

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const FACTS = [
  { value: "10s", label: "to complete a typical bill" },
  { value: "1 tap", label: "to send a receipt link on WhatsApp" },
  { value: "58/80mm", label: "thermal receipts, plus A4 invoices" },
  { value: "₹0", label: "to start. No credit card required." },
];

const STEPS = [
  {
    title: "Add your items",
    desc: "Save your products or services with prices in your catalog once — reuse forever.",
    art: <CatalogArt />,
  },
  {
    title: "Tap & complete",
    desc: "Select items, enter the customer’s phone (optional), hit Complete Bill. Done in seconds.",
    art: <StopwatchArt />,
  },
  {
    title: "Print or share",
    desc: "Print a thermal slip, send a WhatsApp link, or share a digital receipt link.",
    art: <ShareArt />,
  },
];

const DASHBOARD_METRICS = [
  "Today’s sales and bill count",
  "Average bill value",
  "Last 7 days and this month",
  "Daily sales trend for the week",
  "Collections by Cash, UPI and Card",
  "Your most recent completed bills",
];

const MORE_FEATURES = [
  {
    icon: Smartphone,
    title: "Works on any device",
    desc: "Android phone, iPhone, tablet or laptop. No app download needed.",
  },
  {
    icon: Percent,
    title: "GST & discounts",
    desc: "Flat or percentage discounts and optional GST (5%, 12%, 18%) on any bill.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    desc: "Data is isolated per business. Shared bill links use private, unguessable tokens.",
  },
  {
    icon: ReceiptText,
    title: "Sequential bill numbers",
    desc: "Automatic, gapless numbering with your own prefix, e.g. CBC-2026-000001.",
  },
];

const LEDGER = [
  { type: "General stores", item: "Toor dal 1 kg", price: "₹160" },
  { type: "Cafés & restaurants", item: "Masala chai × 2", price: "₹60" },
  { type: "Beauty salons", item: "Haircut & styling", price: "₹350" },
  { type: "Repair shops", item: "Screen replacement", price: "₹1,800" },
  { type: "Medical stores", item: "Cough syrup 100 ml", price: "₹95" },
  { type: "Service providers", item: "AC servicing", price: "₹599" },
];

const FAQS = [
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
    q: "What happens after my 10-day free trial?",
    a: "Your account enters renewal status and past records stay safe. Simply contact our setup team at 7904561269 or 7845418030 to activate your Monthly (₹299/mo) or Yearly (₹2,999/yr) plan.",
  },
  {
    q: "Can I apply GST to bills?",
    a: "Yes. There's a simple optional toggle to add GST percentage (5%, 12%, 18%) to any bill. Tax is completely optional per bill.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  copy,
  className = "",
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  className?: string;
}) {
  return (
    <div className={`${styles.reveal} max-w-2xl ${className}`}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={`${styles.display} ${styles.h2} mt-4`}>{title}</h2>
      {copy && <p className={`${styles.lead} mt-5`}>{copy}</p>}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  visual,
  className = "",
}: {
  icon: typeof Zap;
  title: string;
  desc: string;
  visual: ReactNode;
  className?: string;
}) {
  return (
    <article className={`${styles.card} ${styles.reveal} p-5 sm:p-6 gap-6 ${className}`}>
      {visual}
      <div className="flex gap-4">
        <span className={styles.iconChip}>
          <Icon aria-hidden="true" />
        </span>
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          <p className={`${styles.muted} text-[0.95rem] leading-relaxed mt-1.5`}>{desc}</p>
        </div>
      </div>
    </article>
  );
}

export default function LandingPage() {
  return (
    <div className={`${styles.page} ${brandFont.variable}`}>
      {/* ─── Trial strip ──────────────────────────────────────────────────────── */}
      <div className={`${styles.topStrip} ${styles.onInk}`}>
        <p className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2.5 text-center">
          <span className={styles.stripDot} aria-hidden="true" />
          <span>
            <span className="hidden sm:inline">Start with our </span>
            <strong className="font-semibold text-white">10-day full access trial</strong>
            <span className="hidden sm:inline"> — no card required</span>
          </span>
          <a href="#pricing" className={styles.stripLink}>
            See pricing
            <ArrowRight aria-hidden="true" />
          </a>
        </p>
      </div>

      {/* ─── Nav ──────────────────────────────────────────────────────────────── */}
      <header className={`${styles.header} ${styles.onInk}`}>
        <div className={styles.headerBar}>
          <Link href="/" aria-label="BillYours home" className={styles.logoLink}>
            <BrandLogo onInk />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className={styles.navRail}>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={styles.navPill}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.headerActions}>
            <span className="hidden sm:block">
              <Link href="/login" className={styles.headerLink}>
                Sign In
              </Link>
            </span>
            {/* On the narrowest phones this CTA lives in the menu instead. */}
            <span className="hidden min-[360px]:block">
              <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnShine}`}>
                Try Free
                <ArrowRight className={`${styles.arrow} hidden sm:block`} aria-hidden="true" />
              </Link>
            </span>
            <LandingMobileMenu links={NAV_LINKS} />
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero ───────────────────────────────────────────────────────────── */}
        <section className={`${styles.hero} ${styles.onInk}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-20 sm:pt-16 sm:pb-24 lg:pt-20">
            <div className="grid lg:grid-cols-[1.12fr_0.88fr] gap-14 lg:gap-10 items-center">
              <div>
                <p className={`${styles.pill} ${styles.rise}`}>
                  <span className={styles.pillBadge} aria-hidden="true">
                    ₹
                  </span>
                  Built for Indian small businesses
                </p>

                <h1 className={`${styles.display} ${styles.heroTitle} text-white mt-7`}>
                  Bill your customers in{" "}
                  <span className={styles.swash}>
                    10 seconds
                    <svg className={styles.swashLine} viewBox="0 0 200 13" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M2 10C52 4 122 2 198 6" pathLength={1} />
                    </svg>
                  </span>{" "}
                  flat.
                </h1>

                <p className={`${styles.lead} ${styles.rise} ${styles.delay1} mt-7 max-w-xl`}>
                  Simple billing for cafés, shops, salons and service providers. WhatsApp share, thermal print and GST —
                  all with zero complexity.
                </p>

                <div className={`${styles.rise} ${styles.delay2} mt-9 flex flex-col sm:flex-row gap-3`}>
                  <Link href="/signup" className={`${styles.btn} ${styles.btnLg} ${styles.btnPrimary}`}>
                    Start for free
                    <ArrowRight className={styles.arrow} aria-hidden="true" />
                  </Link>
                  <Link href="/login" className={`${styles.btn} ${styles.btnLg} ${styles.btnGhostLight}`}>
                    Sign in
                  </Link>
                </div>

                <p className={`${styles.rise} ${styles.delay2} ${styles.mutedOnInk} text-sm mt-4`}>
                  Free forever for basic billing · No credit card required
                </p>
              </div>

              <div className={`${styles.rise} ${styles.delay2} lg:pl-4`}>
                <HeroReceipt />
              </div>
            </div>

            <ul className={`${styles.facts} ${styles.rise} ${styles.delay3} mt-16 lg:mt-20`}>
              {FACTS.map((fact) => (
                <li key={fact.value}>
                  <p className={styles.factValue}>{fact.value}</p>
                  <p className={styles.factLabel}>{fact.label}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.tornBottom} aria-hidden="true" />
        </section>

        {/* ─── The name ───────────────────────────────────────────────────────── */}
        <section aria-labelledby="name-heading" className={`${styles.section} overflow-hidden`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className={`${styles.reveal} text-center`}>
              <p className={styles.eyebrow}>What’s in a name</p>
            </div>

            <h2 id="name-heading" className={`${styles.specimen} ${styles.reveal} mt-8`}>
              <span className={styles.specimenBill}>Bill</span>
              <span className={styles.specimenYours}>Yours</span>
            </h2>

            <div className={`${styles.seam} mt-12 grid md:grid-cols-2 gap-12 md:gap-0`}>
              <div className={`${styles.reveal} md:pr-10 lg:pr-16 md:text-right`}>
                <div className={styles.definition}>
                  <p>
                    <span className={styles.headword}>bill</span>{" "}
                    <span className={styles.phonetic}>/bɪl/ · verb</span>
                  </p>
                  <p className="text-lg font-medium mt-2">To hand a customer a record of what they bought and what they owe.</p>
                  <p className={`${styles.inProduct} mt-6`}>In BillYours</p>
                  <p className={`${styles.muted} leading-relaxed mt-2`}>
                    Tap items, adjust quantities, add a discount or GST, complete. A finished bill in about ten seconds —
                    printed on 58mm, 80mm or A4, or sent as a WhatsApp link.
                  </p>
                </div>
              </div>

              <div className={`${styles.reveal} md:pl-10 lg:pl-16`}>
                <div className={`${styles.definition} ${styles.definitionYours}`}>
                  <p>
                    <span className={`${styles.headword} text-[#2563eb]`}>yours</span>{" "}
                    <span className={styles.phonetic}>/jɔːz/ · pronoun</span>
                  </p>
                  <p className="text-lg font-medium mt-2">Belonging to you.</p>
                  <p className={`${styles.inProduct} mt-6`}>In BillYours</p>
                  <p className={`${styles.muted} leading-relaxed mt-2`}>
                    Your catalog and prices, your bill prefix, your customers and their history, your daily sales by
                    payment mode — isolated to your business and no one else’s.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── How it works ───────────────────────────────────────────────────── */}
        <section id="how-it-works" className={`${styles.section} ${styles.sectionDeep} ${styles.anchor}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-16 items-end">
              <SectionHeading eyebrow="How it works" title="Three steps. About ten seconds." />
              <p className={`${styles.lead} ${styles.reveal} max-w-md`}>
                Add your items once. After that, every bill is the same three moves — at the counter, on any phone.
              </p>
            </div>

            <ol className="mt-14 grid md:grid-cols-3 gap-5 md:gap-8">
              {STEPS.map((step, index) => (
                <li key={step.title} className={`${styles.storyCard} ${styles.reveal}`}>
                  <div className={styles.storyArt}>{step.art}</div>
                  <div className="p-6">
                    <span className={styles.stepNum} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className={`${styles.cardTitle} mt-3`}>{step.title}</h3>
                    <p className={`${styles.muted} leading-relaxed mt-2`}>{step.desc}</p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <span className={styles.storyArrow} aria-hidden="true">
                      <ArrowRight />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── Sales dashboard ────────────────────────────────────────────────── */}
        <section id="dashboard" className={`${styles.section} ${styles.anchor} overflow-hidden`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-16 items-end">
              <SectionHeading eyebrow="Sales dashboard" title="Every bill adds up. Watch it happen." />
              <div className={`${styles.reveal} max-w-md`}>
                <p className={styles.lead}>
                  Each bill you complete flows straight into your dashboard — no spreadsheets, no end-of-day maths.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary}`}>
                    See your own numbers
                    <ArrowRight className={styles.arrow} aria-hidden="true" />
                  </Link>
                  <span className={`${styles.muted} text-sm`}>Full dashboard on Monthly &amp; Yearly</span>
                </div>
              </div>
            </div>

            <div className={`${styles.reveal} mt-16`}>
              <SalesShowcase />
            </div>

            <ul className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              {DASHBOARD_METRICS.map((metric) => (
                <li key={metric} className="flex items-center gap-3 font-medium">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-[#2563eb]" aria-hidden="true" />
                  {metric}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Features ───────────────────────────────────────────────────────── */}
        <section id="features" className={`${styles.section} ${styles.sectionDeep} ${styles.anchor}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionHeading
              eyebrow="Features"
              title="Built for the counter, not the accounts department."
              copy="Everything you need. Nothing you don't. Designed for ordinary shop owners, not accountants or enterprise IT."
            />

            <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <FeatureCard
                className="md:col-span-2"
                icon={Zap}
                title="10-second billing"
                desc="Tap items from your catalog, adjust quantities, apply discounts, and complete a bill in seconds."
                visual={<FastBillingVisual />}
              />
              <FeatureCard
                icon={Share2}
                title="WhatsApp in one tap"
                desc="Send customers a prefilled WhatsApp message with a secure digital receipt link instantly."
                visual={<WhatsAppVisual />}
              />
              <FeatureCard
                icon={Printer}
                title="Thermal & A4 printing"
                desc="Print 58mm and 80mm thermal receipts or clean A4 invoices from your browser — no drivers."
                visual={<PrintVisual />}
              />
              <FeatureCard
                className="md:col-span-2"
                icon={Users}
                title="Customer auto-lookup"
                desc="Type a mobile number and instantly see the customer's name and purchase history."
                visual={<LookupVisual />}
              />
            </div>

            <ul className="mt-4 sm:mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {MORE_FEATURES.map((feature) => (
                <li key={feature.title} className={`${styles.card} ${styles.reveal} p-5`}>
                  <span className={styles.iconChip}>
                    <feature.icon aria-hidden="true" />
                  </span>
                  <h3 className="font-bold tracking-tight mt-4">{feature.title}</h3>
                  <p className={`${styles.muted} text-sm leading-relaxed mt-1`}>{feature.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Made for ───────────────────────────────────────────────────────── */}
        <section aria-labelledby="made-for-heading" className={`${styles.inkBlock} ${styles.onInk} ${styles.section}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className={`${styles.reveal} grid lg:grid-cols-2 gap-6 lg:gap-16 items-end`}>
              <div>
                <p className={styles.eyebrow}>Made for</p>
                <h2 id="made-for-heading" className={`${styles.display} ${styles.h2} text-white mt-4`}>
                  Every counter in the neighbourhood.
                </h2>
              </div>
              <p className={`${styles.lead} max-w-md`}>
                Whatever you sell — chai, haircuts or repairs — a bill looks the same: items, a total, and a receipt your
                customer can keep.
              </p>
            </div>

            <ul className={`${styles.ledger} ${styles.reveal} mt-12`}>
              {LEDGER.map((row) => (
                <li key={row.type} className={styles.ledgerRow}>
                  <span className={styles.ledgerType}>{row.type}</span>
                  <span className={styles.ledgerLeader} aria-hidden="true" />
                  <span className={styles.ledgerItem}>{row.item}</span>
                  <span className={styles.ledgerPrice}>{row.price}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Pricing ────────────────────────────────────────────────────────── */}
        <section id="pricing" className={`${styles.section} ${styles.sectionDeep} ${styles.anchor}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionHeading
              className="mx-auto text-center"
              eyebrow="Pricing"
              title="Simple, honest pricing."
              copy="Start with our 10-day full access trial. Choose a paid plan for dedicated assisted setup."
            />

            <div className="mt-16 max-w-5xl mx-auto">
              <PricingPlans />
            </div>
          </div>
        </section>

        {/* ─── FAQ ────────────────────────────────────────────────────────────── */}
        <section id="faq" className={`${styles.section} ${styles.anchor}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
            <div>
              <SectionHeading eyebrow="FAQ" title="Frequently asked questions." />
              <p className={`${styles.muted} ${styles.reveal} mt-5 max-w-sm`}>
                Still deciding? The free plan lets you try the full billing flow with your own items.
              </p>
            </div>

            <div className={`${styles.reveal} border-t border-[rgba(10,14,26,0.18)]`}>
              {FAQS.map((faq) => (
                <details key={faq.q} className={styles.faqItem}>
                  <summary>
                    <h3>{faq.q}</h3>
                    <span className={styles.faqToggle} aria-hidden="true">
                      <Plus />
                    </span>
                  </summary>
                  <p className={`${styles.muted} leading-relaxed pb-6 pr-12 -mt-1`}>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ────────────────────────────────────────────────────────────── */}
        <section aria-labelledby="cta-heading" className={`${styles.finale} ${styles.onInk} pt-28 pb-24 sm:pt-36 sm:pb-32 px-4`}>
          <div className={styles.tornTop} aria-hidden="true" />
          <div className={`${styles.reveal} max-w-3xl mx-auto text-center`}>
            <p className={styles.eyebrow}>Your first bill is minutes away</p>
            <h2 id="cta-heading" className={`${styles.display} ${styles.finaleTitle} text-white mt-5`}>
              Start billing today.
            </h2>
            <p className={`${styles.lead} mt-5`}>Free to start. No credit card. Ready in 2 minutes.</p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/signup" className={`${styles.btn} ${styles.btnLg} ${styles.btnPrimary}`}>
                Create your free account
                <ArrowRight className={styles.arrow} aria-hidden="true" />
              </Link>
              <Link href="/login" className={`${styles.btn} ${styles.btnLg} ${styles.btnGhostLight}`}>
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ───────────────────────────────────────────────────────────── */}
      <footer className={`${styles.footer} ${styles.onInk}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14">
          <div className="grid gap-10 grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" aria-label="BillYours home">
                <BrandLogo onInk />
              </Link>
              <p className={`${styles.mutedOnInk} text-sm mt-4 max-w-xs leading-relaxed`}>
                Simple billing for every business. Add items, create a bill, print or share it, track your sales.
              </p>
            </div>

            <nav aria-label="Product">
              <p className={styles.footerHeading}>Product</p>
              <ul className="mt-4 space-y-2.5">
                <li><a href="#features" className={styles.footerLink}>Features</a></li>
                <li><a href="#pricing" className={styles.footerLink}>Pricing</a></li>
                <li><a href="#faq" className={styles.footerLink}>FAQ</a></li>
              </ul>
            </nav>

            <nav aria-label="Account">
              <p className={styles.footerHeading}>Account</p>
              <ul className="mt-4 space-y-2.5">
                <li><Link href="/login" className={styles.footerLink}>Sign In</Link></li>
                <li><Link href="/signup" className={styles.footerLink}>Get Started</Link></li>
              </ul>
            </nav>

            <nav aria-label="Legal">
              <p className={styles.footerHeading}>Legal</p>
              <ul className="mt-4 space-y-2.5">
                <li><Link href="/privacy" className={styles.footerLink}>Privacy</Link></li>
                <li><Link href="/terms" className={styles.footerLink}>Terms</Link></li>
              </ul>
            </nav>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p>© {new Date().getFullYear()} BillYours · Made for India’s small businesses</p>
            <Link href="/admin/login" className="text-[#7d879c] hover:text-white transition-colors">
              Admin
            </Link>
          </div>
        </div>

        <p className={`${styles.giantWordmark} mt-10`} aria-hidden="true">
          <span>Bill</span>
          <span>Yours</span>
        </p>
      </footer>
    </div>
  );
}
