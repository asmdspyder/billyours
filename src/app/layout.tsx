import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/base-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: "BillYours — Simple Billing for Every Business",
  description:
    "Fast, lightweight billing application for small businesses in India. Create bills, print receipts, share on WhatsApp, and track sales without complicated software.",
  keywords: ["billing software", "invoicing app", "pos india", "receipt printer", "whatsapp invoice"],
  openGraph: {
    title: "BillYours — Simple Billing for Every Business",
    description: "Add items. Create a bill. Print or share it. Track your sales.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
