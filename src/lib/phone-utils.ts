/**
 * Phone number normalization and formatting utilities.
 */

export function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const trimmed = rawPhone.trim();
  if (!trimmed) return null;

  // Remove spaces, hyphens, parentheses, dots
  let digits = trimmed.replace(/[\s\-\(\)\.]/g, "");

  // If starts with +
  if (digits.startsWith("+")) {
    const withoutPlus = digits.substring(1);
    // If Indian number +91...
    if (withoutPlus.startsWith("91") && withoutPlus.length === 12) {
      return "+" + withoutPlus;
    }
    return "+" + withoutPlus;
  }

  // If starts with 0 (e.g. 09876543210)
  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.substring(1);
  }

  // Standard Indian 10-digit mobile number
  if (/^[6-9]\d{9}$/.test(digits)) {
    return "+91" + digits;
  }

  // If 91 followed by 10 digits
  if (/^91[6-9]\d{9}$/.test(digits)) {
    return "+" + digits;
  }

  return digits.length >= 7 ? "+" + digits : digits;
}

export function formatPhoneForDisplay(phone?: string | null): string {
  if (!phone) return "";
  const normalized = normalizePhone(phone);
  if (!normalized) return phone || "";

  if (normalized.startsWith("+91") && normalized.length === 13) {
    // Format as +91 98765 43210
    return `+91 ${normalized.slice(3, 8)} ${normalized.slice(8)}`;
  }

  return normalized;
}

export function getWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  // wa.me requires international format without + or spaces or special characters
  return normalized.replace(/\+/g, "");
}
