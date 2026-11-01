import styles from "./landing.module.css";

/** Receipt-shaped brand mark: a torn thermal slip on the BillYours blue tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#2563EB" />
      <path
        d="M11 7.5h10a1.5 1.5 0 0 1 1.5 1.5v15.5l-2.17-1.5-2.16 1.5-2.17-1.5-2.17 1.5-2.16-1.5-2.17 1.5V9A1.5 1.5 0 0 1 11 7.5Z"
        fill="#fff"
      />
      <path d="M12.75 12.25h6.5M12.75 15.75h4" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="19.25" cy="19.25" r="1.75" fill="#F4A51C" />
    </svg>
  );
}

export function BrandLogo({ onInk = false }: { onInk?: boolean }) {
  return (
    <span className={`${styles.logo} ${onInk ? styles.logoOnInk : ""}`}>
      <BrandMark className={styles.logoMark} />
      <span className={styles.wordmark}>
        Bill<span className={styles.wordmarkAccent}>Yours</span>
      </span>
    </span>
  );
}
