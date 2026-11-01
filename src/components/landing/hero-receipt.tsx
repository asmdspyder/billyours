import { CheckCircle2, Clock } from "lucide-react";
import { BrandMark } from "./brand-logo";
import styles from "./landing.module.css";

const LINES = [
  { name: "Masala Chai", qty: 2, price: 30 },
  { name: "Veg Sandwich", qty: 1, price: 80 },
  { name: "Brownie", qty: 1, price: 90 },
];

/** Decorative hero centrepiece: a thermal printer printing a BillYours receipt. */
export function HeroReceipt() {
  const subtotal = LINES.reduce((sum, line) => sum + line.qty * line.price, 0);
  const discount = Math.round(subtotal * 0.1);

  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.printer}>
        <span className={styles.printerLed} />
        <span className={styles.printerLabel}>80mm · thermal</span>
        <span className={styles.printerSlot} />
      </div>

      <div className={styles.paperClip}>
        <div className={styles.paperShadow}>
          <div className={styles.heroReceipt}>
            <div className="text-center">
              <p className={styles.receiptShop}>Corner Café</p>
              <p className={styles.muted}>Bill #BY-2026-000128</p>
              <p className={styles.muted}>28 Oct · 10:42 AM</p>
            </div>
            <div className={styles.rule} />
            <ul>
              {LINES.map((line) => (
                <li key={line.name} className={styles.leaderRow}>
                  <span>
                    {line.qty} × {line.name}
                  </span>
                  <span className={styles.leader} />
                  <span>{line.qty * line.price}</span>
                </li>
              ))}
            </ul>
            <div className={styles.rule} />
            <p className={styles.leaderRow}>
              <span>Subtotal</span>
              <span className={styles.leader} />
              <span>{subtotal}</span>
            </p>
            <p className={styles.leaderRow}>
              <span>Discount 10%</span>
              <span className={styles.leader} />
              <span>−{discount}</span>
            </p>
            <div className={styles.rule} />
            <div className="flex items-end justify-between">
              <span className="font-bold tracking-[0.12em]">TOTAL</span>
              <span className={styles.receiptTotal}>₹{subtotal - discount}</span>
            </div>
            <p className={`${styles.muted} mt-1`}>Paid · UPI</p>
            <div className={`${styles.barcode} mt-5`} />
            <p className="text-center mt-3">Thank you! Visit again.</p>
            <p className={`${styles.muted} mt-2 flex items-center justify-center gap-1.5 text-[0.68rem]`}>
              <BrandMark className="w-3.5 h-3.5" />
              Billed with BillYours
            </p>
          </div>
        </div>
      </div>

      <div className={styles.stamp}>
        <span className={styles.stampWord}>PAID</span>
        <span className={styles.stampSub}>UPI</span>
      </div>

      <div className={`${styles.floatCard} ${styles.floatWhatsApp}`}>
        <span className={`${styles.floatIcon} bg-[#e3f5e8] text-[#15803d]`}>
          <CheckCircle2 />
        </span>
        <span>
          <span className="block font-bold">Sent on WhatsApp</span>
          <span className={`block ${styles.muted}`}>to Rahul · ₹{subtotal - discount}.00</span>
        </span>
      </div>

      <div className={`${styles.floatCard} ${styles.floatTimer}`}>
        <span className={`${styles.floatIcon} bg-[#e8eeff] text-[#2563eb]`}>
          <Clock />
        </span>
        <span>
          <span className="block font-bold">Billed in 8.4s</span>
          <span className={`block ${styles.muted}`}>3 items · 1 discount</span>
        </span>
      </div>
    </div>
  );
}
