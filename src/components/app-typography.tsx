import type { ReactNode } from "react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export function AppTypography({ children }: { children: ReactNode }) {
  return <div className={`app-typography ${inter.variable}`}>{children}</div>;
}
