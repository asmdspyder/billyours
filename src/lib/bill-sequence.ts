import { sql } from "@/db";
import crypto from "crypto";

export async function allocateNextBillNumber(
  accountId: string,
  prefix = "BY"
): Promise<{ billNumber: string; sequenceNumber: number }> {
  const currentYear = new Date().getFullYear();
  const seqId = "seq_" + crypto.randomBytes(8).toString("hex");

  // Atomic PostgreSQL sequence increment with upsert
  const result = await sql`
    INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
    VALUES (${seqId}, ${accountId}, ${currentYear}, 1, NOW())
    ON CONFLICT (account_id, year)
    DO UPDATE SET
      current_number = bill_sequences.current_number + 1,
      updated_at = NOW()
    RETURNING current_number;
  `;

  const sequenceNumber = Number(result[0].current_number);
  // Pad with leading zeros: 6 digits (e.g. 000001)
  const padded = String(sequenceNumber).padStart(6, "0");
  const cleanPrefix = (prefix || "BY").trim().toUpperCase();
  const billNumber = `${cleanPrefix}-${currentYear}-${padded}`;

  return { billNumber, sequenceNumber };
}
