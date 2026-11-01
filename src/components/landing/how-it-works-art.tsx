import { Printer } from "lucide-react";
import styles from "./landing.module.css";

// Decorative illustrations for the three "How it works" steps. They describe the
// flow with objects (tags, a stopwatch, a receipt) rather than app screens, so
// they stay accurate as the product UI evolves.

const TAGS = [
  { name: "Masala Chai", price: "₹30", tone: "", position: "left-0 top-1 -rotate-[7deg]" },
  { name: "Veg Sandwich", price: "₹80", tone: styles.tagBlue, position: "left-[58px] top-[50px] rotate-[4deg]" },
  { name: "Brownie", price: "₹90", tone: styles.tagMarigold, position: "left-[22px] top-[98px] -rotate-2" },
];

export function CatalogArt() {
  return (
    <div className="relative w-[226px] h-[168px]" aria-hidden="true">
      {TAGS.map((tag) => (
        <div key={tag.name} className={`${styles.tagShadow} ${tag.position}`}>
          <div className={`${styles.priceTag} ${tag.tone}`}>
            <span className={styles.tagHole} />
            <span className={styles.tagName}>{tag.name}</span>
            <span className={styles.tagPrice}>{tag.price}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StopwatchArt() {
  return (
    <div className="flex flex-col items-center gap-4" aria-hidden="true">
      <div className={styles.watch}>
        <span className={styles.watchCrown} />
        <svg viewBox="0 0 120 120" className={styles.watchFace}>
          <circle cx="60" cy="60" r="56" fill="#fff" />
          <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(10,14,26,0.08)" strokeWidth="9" />
          <g className={styles.watchRing}>
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="#2563eb"
              strokeWidth="9"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="84 100"
              transform="rotate(-90 60 60)"
            />
          </g>
        </svg>
        <div className={styles.watchReadout}>
          <span className="text-[2rem] leading-none">8.4</span>
          <span className="text-base ml-0.5">s</span>
        </div>
      </div>
      <span className={styles.watchStamp}>Bill complete · ₹207</span>
    </div>
  );
}

export function ShareArt() {
  return (
    <div className="relative w-[250px] h-[172px]" aria-hidden="true">
      <div className={`${styles.sheetShadow} absolute left-1 top-1 -rotate-6`}>
        <div className={`${styles.slip} ${styles.zigzag}`}>
          <p className="text-center font-bold tracking-[0.1em]">CORNER CAFÉ</p>
          <div className={styles.rule} />
          <p className="flex justify-between"><span>2 × Masala Chai</span><span>60</span></p>
          <p className="flex justify-between"><span>1 × Veg Sandwich</span><span>80</span></p>
          <p className="flex justify-between"><span>1 × Brownie</span><span>90</span></p>
          <p className="flex justify-between"><span>Discount 10%</span><span>−23</span></p>
          <div className={styles.rule} />
          <p className="flex justify-between font-bold"><span>TOTAL</span><span>₹207</span></p>
        </div>
      </div>

      <div className={`${styles.miniBubble} absolute right-0 top-11 rotate-[3deg]`}>
        <p>Your bill #BY-2026-000128 for ₹207.00 is ready.</p>
        <p className={`${styles.bubbleLink} mt-1`}>billyours.com/b/9f3c…</p>
        <span className={styles.bubbleMeta}>10:42 ✓✓</span>
      </div>

      <span className={`${styles.tag} absolute left-3 bottom-0 gap-1`}>
        <Printer className="w-3 h-3" />
        58 / 80mm
      </span>
    </div>
  );
}
