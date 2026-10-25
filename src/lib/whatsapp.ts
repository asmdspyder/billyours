import { getWhatsAppNumber } from "./phone-utils";

export interface WhatsAppMessageParams {
  phone?: string | null;
  customerName?: string | null;
  businessName?: string | null;
  billNumber: string;
  grandTotal: string | number;
  billLink?: string | null;
}

export function buildWhatsAppShareUrl(params: WhatsAppMessageParams): string | null {
  const waNumber = getWhatsAppNumber(params.phone);
  if (!waNumber) return null;

  const greetingName = params.customerName?.trim() || "Customer";
  const business = params.businessName ? ` from ${params.businessName}` : "";
  const total = Number(params.grandTotal).toFixed(2);
  const linkText = params.billLink ? `\n\nView or download your bill here: ${params.billLink}` : "";

  const message = `Hi ${greetingName}, thank you for your purchase${business}!\nYour bill #${params.billNumber} for ₹${total} is ready.${linkText}\n\nHave a great day!`;

  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}
