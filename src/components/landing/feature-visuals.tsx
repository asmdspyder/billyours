import { Phone } from "lucide-react";
import styles from "./landing.module.css";

// Decorative product illustrations for the features grid. The card text carries
// the meaning, so every visual is hidden from assistive technology.

export function FastBillingVisual() {
  const steps = [
    { at: "0s", label: "Tap items" },
    { at: "4s", label: "Phone (optional)" },
    { at: "8s", label: "Complete bill" },
  ];

  return (
    <div className={`${styles.visual} p-5 sm:p-6`} aria-hidden="true">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className={`${styles.mono} text-4xl sm:text-5xl font-bold tracking-tight`}>
          00:08<span className="text-[#2563eb]">.4</span>
        </p>
        <span className={styles.tag}>BY-2026-000128 · ₹126</span>
      </div>
      <div className="mt-5 space-y-1.5">
        <div className={styles.track}>
          <span className={styles.trackFill} />
        </div>
        <div className={styles.trackTicks} />
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-3">
        {steps.map((step) => (
          <li key={step.label}>
            <p className={`${styles.mono} text-[0.68rem] ${styles.muted}`}>{step.at}</p>
            <p className="text-[0.82rem] font-semibold leading-snug">{step.label}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function WhatsAppVisual() {
  return (
    <div className={`${styles.visual} ${styles.chatBg} p-4`} aria-hidden="true">
      <div className={styles.bubble}>
        <p>Hi Rahul, thank you for your purchase from Corner Café!</p>
        <p>Your bill #BY-2026-000128 for ₹126.00 is ready.</p>
        <p className="mt-2">
          View or download your bill here: <span className={styles.bubbleLink}>billyours.com/b/9f3c…</span>
        </p>
        <p className="mt-2">Have a great day!</p>
        <span className={styles.bubbleMeta}>10:42 ✓✓</span>
      </div>
    </div>
  );
}

export function PrintVisual() {
  const sheets = [
    { label: "58mm", width: 46, height: 92, thermal: true },
    { label: "80mm", width: 62, height: 108, thermal: true },
    { label: "A4", width: 92, height: 122, thermal: false },
  ];

  return (
    <div className={`${styles.visual} ${styles.visualDeep} px-4 pt-6 pb-4`} aria-hidden="true">
      <div className="flex items-end justify-center gap-4 sm:gap-5">
        {sheets.map((sheet) => (
          <div key={sheet.label} className="flex flex-col items-center gap-2">
            <div className={styles.sheetShadow}>
              <div
                className={`${styles.sheet} ${sheet.thermal ? styles.zigzag : "rounded-[3px]"}`}
                style={{ width: sheet.width, height: sheet.height }}
              />
            </div>
            <span className={styles.tag}>{sheet.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LookupVisual() {
  return (
    <div className={`${styles.visual} p-4 space-y-2.5`} aria-hidden="true">
      <div className={styles.field}>
        <Phone className="w-4 h-4 text-[#2563eb]" />
        <span className={`${styles.mono} text-sm font-semibold`}>
          98765 43210<span className={styles.caret} />
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-[0_0_0_1px_rgba(11,16,32,0.09)]">
        <span className={styles.avatar}>RS</span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">Rahul Sharma</p>
          <p className={`text-xs ${styles.muted}`}>Returning customer · 6 bills</p>
        </div>
        <span className={`${styles.tag} ml-auto`}>Found</span>
      </div>
    </div>
  );
}
