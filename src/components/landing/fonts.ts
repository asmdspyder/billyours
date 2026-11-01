import { Bricolage_Grotesque } from "next/font/google";

// Display face for the landing page only. next/font downloads it once at build
// time and serves it from this app's own domain, so visitors never contact Google.
export const brandFont = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-brand",
});
