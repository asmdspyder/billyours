"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./landing.module.css";

type NavLink = { href: string; label: string };

export function LandingMobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.menuIcon} data-open={open} aria-hidden="true">
          <span />
          <span />
        </span>
      </button>

      <div id={panelId} className={styles.menuPanel} data-open={open}>
        <nav aria-label="Mobile">
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={styles.menuLink} onClick={close}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/10">
          <Link href="/login" className={`${styles.btn} ${styles.btnGhostLight}`} onClick={close}>
            Sign in
          </Link>
          <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary}`} onClick={close}>
            Try free
            <ArrowRight className={styles.arrow} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
