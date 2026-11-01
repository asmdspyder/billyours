import styles from "./landing.module.css";

// Sample data only. It mirrors the metrics the real dashboard reports: today's
// sales and bill count, average bill, last 7 days, this month, the daily trend,
// collections by payment mode and recent completed bills.

const WEEK = [
  { day: "Mon", total: 8240 },
  { day: "Tue", total: 9610 },
  { day: "Wed", total: 7980 },
  { day: "Thu", total: 11350 },
  { day: "Fri", total: 10420 },
  { day: "Sat", total: 14960 },
  { day: "Today", total: 12480 },
];
const SCALE_MAX = 15000;
const GRID = [0, 5000, 10000, 15000];

// Categorical order is fixed, and each hue was validated against the panel
// surface (#121829) for lightness, chroma, colour-blind separation and contrast.
const MODES = [
  { mode: "UPI", amount: 6740, color: "#5b8cff" },
  { mode: "Cash", amount: 3870, color: "#c47f0c" },
  { mode: "Card", amount: 1500, color: "#a274e8" },
  { mode: "Other", amount: 370, color: "#1f9a6a" },
];
const MODE_COLOR = Object.fromEntries(MODES.map((m) => [m.mode, m.color]));

const RECENT = [
  { bill: "BY-2026-000128", time: "10:42", amount: 207, mode: "UPI" },
  { bill: "BY-2026-000127", time: "10:39", amount: 95, mode: "Cash" },
  { bill: "BY-2026-000126", time: "10:31", amount: 1800, mode: "Card" },
];

const TODAY_BILLS = 86;
const MONTH = { total: 284650, bills: 1962 };

const inr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
const gridLabel = (value: number) => (value === 0 ? "₹0" : `₹${value / 1000}k`);

export function SalesShowcase() {
  const todayTotal = MODES.reduce((sum, m) => sum + m.amount, 0);
  const weekTotal = WEEK.reduce((sum, d) => sum + d.total, 0);
  const share = (amount: number) => Math.round((amount / todayTotal) * 100);

  return (
    <figure className={styles.dashStage}>
      <div className={styles.addedChip} aria-hidden="true">
        <b>+{inr(207)}</b>
        Bill #BY-2026-000128 added to today
      </div>

      <div className={styles.dash} aria-hidden="true">
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={styles.liveDot} />
            <p className="text-sm font-semibold text-white truncate">Corner Café · Sales</p>
          </div>
          <span className={styles.dashTag}>Sample data</span>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
          <div className={`${styles.dashCard} ${styles.statAccent} col-span-2 sm:col-span-1`}>
            <p className={styles.dashLabel}>Today’s sales</p>
            <p className={styles.statValue}>{inr(todayTotal)}</p>
            <p className={`${styles.dashLabel} mt-1 font-normal`}>{TODAY_BILLS} bills</p>
          </div>
          <div className={styles.dashCard}>
            <p className={styles.dashLabel}>Average bill</p>
            <p className={styles.statValue}>{inr(Math.round(todayTotal / TODAY_BILLS))}</p>
            <p className={`${styles.dashLabel} mt-1 font-normal`}>per bill today</p>
          </div>
          <div className={styles.dashCard}>
            <p className={styles.dashLabel}>This month</p>
            <p className={styles.statValue}>{inr(MONTH.total)}</p>
            <p className={`${styles.dashLabel} mt-1 font-normal`}>{MONTH.bills.toLocaleString("en-IN")} bills</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-[1.55fr_1fr] gap-2.5 mt-2.5">
          {/* Daily trend */}
          <div className={styles.dashCard}>
            <div className="flex items-baseline justify-between gap-2">
              <p className={styles.dashLabel}>Daily sales · last 7 days</p>
              <p className={`${styles.mono} text-[0.72rem] font-bold text-white`}>{inr(weekTotal)}</p>
            </div>
            <div className={styles.chart}>
              <div className={styles.plot}>
                {GRID.map((value) => (
                  <div key={value} className={styles.gridLine} style={{ bottom: `${(value / SCALE_MAX) * 100}%` }}>
                    <span className={styles.gridLabel}>{gridLabel(value)}</span>
                  </div>
                ))}
                <div className={styles.barsRow}>
                  {WEEK.map((d, index) => {
                    const isToday = index === WEEK.length - 1;
                    return (
                      <div key={d.day} className={styles.barCol}>
                        <span
                          className={`${styles.dayBar} ${isToday ? styles.dayBarToday : ""}`}
                          style={{ height: `${(d.total / SCALE_MAX) * 100}%` }}
                        >
                          <span className={`${styles.barTip} ${isToday ? styles.barTipShown : ""}`}>{inr(d.total)}</span>
                        </span>
                        <span className={`${styles.barDay} ${isToday ? "text-white font-bold" : ""}`}>{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Collections by payment mode */}
          <div className={styles.dashCard}>
            <p className={styles.dashLabel}>Collections by mode · today</p>
            <div className={styles.modeBar}>
              {MODES.map((m) => (
                <span key={m.mode} style={{ flexGrow: m.amount, background: m.color }} />
              ))}
            </div>
            <ul className="mt-4 space-y-2.5">
              {MODES.map((m) => (
                <li key={m.mode} className="flex items-center gap-2 text-[0.8rem]">
                  <span className={styles.swatch} style={{ background: m.color }} />
                  <span className="font-medium text-white">{m.mode}</span>
                  <span className={`${styles.mono} ml-auto text-white`}>{inr(m.amount)}</span>
                  <span className={`${styles.mono} ${styles.dashLabel} w-9 text-right`}>{share(m.amount)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recent bills */}
        <div className={`${styles.dashCard} mt-2.5`}>
          <p className={styles.dashLabel}>Recent completed bills</p>
          <ul className="mt-1.5 divide-y divide-white/5">
            {RECENT.map((b) => (
              <li key={b.bill} className="flex items-center gap-3 py-2 text-[0.8rem]">
                <span className={`${styles.mono} text-white truncate`}>{b.bill}</span>
                <span className={`${styles.mono} ${styles.dashLabel} hidden min-[420px]:inline`}>{b.time}</span>
                <span className={`${styles.modeChip} ml-auto`}>
                  <span style={{ background: MODE_COLOR[b.mode] }} />
                  {b.mode}
                </span>
                <span className={`${styles.mono} w-16 text-right font-bold text-white`}>{inr(b.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <figcaption className="sr-only">
        Sample BillYours sales dashboard: today’s sales {inr(todayTotal)} from {TODAY_BILLS} bills, this month{" "}
        {inr(MONTH.total)}.
      </figcaption>
      <table className="sr-only">
        <caption>Sample daily sales, last 7 days</caption>
        <tbody>
          {WEEK.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{inr(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="sr-only">
        <caption>Sample collections by payment mode, today</caption>
        <tbody>
          {MODES.map((m) => (
            <tr key={m.mode}>
              <th scope="row">{m.mode}</th>
              <td>
                {inr(m.amount)} ({share(m.amount)}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
