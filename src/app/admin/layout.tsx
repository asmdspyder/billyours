import { AppTypography } from "@/components/app-typography";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppTypography>{children}</AppTypography>;
}
