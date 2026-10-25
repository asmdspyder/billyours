import crypto from "crypto";
import { sql } from "@/db";

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSharedBillLink(billId: string, expiresInDays = 90): Promise<{ token: string; linkId: string }> {
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const linkId = "shl_" + crypto.randomBytes(8).toString("hex");

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO shared_bill_links (id, bill_id, token_hash, expires_at, created_at)
    VALUES (${linkId}, ${billId}, ${tokenHash}, ${expiresAt.toISOString()}, NOW())
  `;

  return { token, linkId };
}

export async function getBillByShareToken(token: string) {
  if (!token || typeof token !== "string" || token.length < 32) {
    return null;
  }

  const tokenHash = hashToken(token);

  // Look up shared link that has not been revoked or expired
  const links = await sql`
    SELECT
      l.id as link_id,
      l.bill_id,
      l.expires_at,
      l.revoked_at,
      b.id,
      b.account_id,
      b.bill_number,
      b.customer_name_snapshot,
      b.customer_phone_snapshot,
      b.subtotal,
      b.discount_type,
      b.discount_value,
      b.discount_amount,
      b.tax_enabled,
      b.tax_label,
      b.tax_rate,
      b.tax_inclusive,
      b.taxable_amount,
      b.tax_amount,
      b.grand_total,
      b.payment_status,
      b.payment_method,
      b.amount_paid,
      b.status,
      b.notes,
      b.completed_at,
      b.cancelled_at,
      b.cancellation_reason,
      acc.business_name,
      acc.business_phone,
      acc.business_email,
      acc.address as business_address,
      acc.state as business_state,
      acc.currency
    FROM shared_bill_links l
    JOIN bills b ON l.bill_id = b.id
    JOIN business_accounts acc ON b.account_id = acc.id
    WHERE l.token_hash = ${tokenHash}
      AND (l.revoked_at IS NULL)
      AND (l.expires_at IS NULL OR l.expires_at > NOW())
    LIMIT 1;
  `;

  if (links.length === 0) {
    return null;
  }

  const bill = links[0];

  // Fetch line items for this specific bill
  const items = await sql`
    SELECT
      id,
      item_name_snapshot,
      unit_price,
      quantity,
      line_subtotal
    FROM bill_items
    WHERE bill_id = ${bill.bill_id}
    ORDER BY created_at ASC;
  `;

  return {
    bill,
    items,
  };
}

export async function revokeSharedLink(linkId: string, accountId: string): Promise<boolean> {
  const result = await sql`
    UPDATE shared_bill_links
    SET revoked_at = NOW()
    WHERE id = ${linkId}
      AND bill_id IN (SELECT id FROM bills WHERE account_id = ${accountId})
    RETURNING id;
  `;
  return result.length > 0;
}
