import { getWhatsAppNumber } from "./phone-utils";
import { getBaseUrl, getBillShareUrl } from "./base-url";

export interface WhatsAppMessageParams {
  phone?: string | null;
  customerName?: string | null;
  businessName?: string | null;
  billNumber: string;
  grandTotal: string | number;
  billLink?: string | null;
  shareToken?: string | null;
  googleReviewLink?: string | null;
}

export function buildWhatsAppShareUrl(params: WhatsAppMessageParams): string | null {
  const waNumber = getWhatsAppNumber(params.phone);
  if (!waNumber) return null;

  const greetingName = params.customerName?.trim() || "Customer";
  const business = params.businessName ? ` from ${params.businessName}` : "";
  const total = Number(params.grandTotal).toFixed(2);

  // Dynamically resolve link: prefer shareToken if given, or ensure billLink has full domain
  let finalLink = params.billLink || (params.shareToken ? getBillShareUrl(params.shareToken) : null);
  if (finalLink && !finalLink.startsWith("http")) {
    finalLink = `${getBaseUrl()}${finalLink.startsWith("/") ? "" : "/"}${finalLink}`;
  }

  const linkText = finalLink ? `\n\n📄 View or download your bill here: ${finalLink}` : "";
  const reviewText = params.googleReviewLink?.trim()
    ? `\n\n⭐ We'd love your feedback! Please rate us on Google:\n${params.googleReviewLink.trim()}`
    : "";

  const message = `Hi ${greetingName}, thank you for your purchase${business}!\nYour bill #${params.billNumber} for ₹${total} is ready.${linkText}${reviewText}\n\nHave a great day!`;

  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}
