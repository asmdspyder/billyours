"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireBusinessAccount } from "@/lib/auth";
import { sql } from "@/db";

export interface StaffMemberRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  totalBills: number;
  totalSales: string;
}

export interface StaffBillRecord {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone: string | null;
  grandTotal: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  completedAt: string;
}

/**
 * Get all staff members for the current business account with aggregated bill statistics.
 */
export async function getStaffMembersAction(): Promise<{
  success: boolean;
  staff?: StaffMemberRecord[];
  error?: string;
}> {
  try {
    const session = await requireBusinessAccount();
    const accountId = session.account.id;

    const rows = await sql`
      SELECT
        s.id,
        s.name,
        s.email,
        s.phone,
        s.is_active,
        s.is_default,
        s.created_at,
        COUNT(b.id)::int as total_bills,
        COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.grand_total ELSE 0 END), 0)::numeric as total_sales
      FROM staff_members s
      LEFT JOIN bills b ON (b.staff_id = s.id OR (b.staff_id IS NULL AND b.staff_name_snapshot = s.name))
        AND b.account_id = ${accountId}
      WHERE s.account_id = ${accountId}
      GROUP BY s.id, s.name, s.email, s.phone, s.is_active, s.is_default, s.created_at
      ORDER BY s.is_default DESC, s.name ASC;
    `;

    const staff: StaffMemberRecord[] = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email || null,
      phone: r.phone || null,
      isActive: Boolean(r.is_active),
      isDefault: Boolean(r.is_default),
      createdAt: new Date(r.created_at).toLocaleDateString("en-IN"),
      totalBills: Number(r.total_bills || 0),
      totalSales: Number(r.total_sales || 0).toFixed(2),
    }));

    return { success: true, staff };
  } catch (err: any) {
    console.error("Error fetching staff members:", err);
    return { success: false, error: err.message || "Failed to load staff list." };
  }
}

/**
 * Create a new staff member.
 */
export async function createStaffMemberAction(data: {
  name: string;
  email?: string;
  phone?: string;
  isDefault?: boolean;
}): Promise<{ success: boolean; staffId?: string; error?: string }> {
  try {
    const session = await requireBusinessAccount();
    const accountId = session.account.id;

    const name = data.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: "Please enter a valid staff name (min 2 characters)." };
    }

    const email = data.email?.trim() || null;
    const phone = data.phone?.trim() || null;
    const isDefault = Boolean(data.isDefault);

    // If marked as default, remove default flag from other staff in the same account
    if (isDefault) {
      await sql`
        UPDATE staff_members
        SET is_default = false
        WHERE account_id = ${accountId};
      `;
    }

    const staffId = "stf_" + crypto.randomBytes(8).toString("hex");

    await sql`
      INSERT INTO staff_members (
        id, account_id, name, email, phone, is_active, is_default, created_at, updated_at
      )
      VALUES (
        ${staffId}, ${accountId}, ${name}, ${email}, ${phone}, true, ${isDefault}, NOW(), NOW()
      );
    `;

    revalidatePath("/app/staff");
    revalidatePath("/app/billing");
    return { success: true, staffId };
  } catch (err: any) {
    console.error("Error creating staff member:", err);
    return { success: false, error: err.message || "Failed to create staff member." };
  }
}

/**
 * Update existing staff member details.
 */
export async function updateStaffMemberAction(
  staffId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    isDefault?: boolean;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireBusinessAccount();
    const accountId = session.account.id;

    const name = data.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: "Please enter a valid staff name." };
    }

    const email = data.email?.trim() || null;
    const phone = data.phone?.trim() || null;
    const isDefault = Boolean(data.isDefault);
    const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;

    if (isDefault) {
      await sql`
        UPDATE staff_members
        SET is_default = false
        WHERE account_id = ${accountId} AND id != ${staffId};
      `;
    }

    await sql`
      UPDATE staff_members
      SET
        name = ${name},
        email = ${email},
        phone = ${phone},
        is_default = ${isDefault},
        is_active = ${isActive},
        updated_at = NOW()
      WHERE id = ${staffId} AND account_id = ${accountId};
    `;

    revalidatePath("/app/staff");
    revalidatePath("/app/billing");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating staff member:", err);
    return { success: false, error: err.message || "Failed to update staff member." };
  }
}

/**
 * Delete or deactivate staff member.
 */
export async function deleteStaffMemberAction(
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireBusinessAccount();
    const accountId = session.account.id;

    // Check if staff has associated bills
    const associatedBills = await sql`
      SELECT COUNT(*)::int as count
      FROM bills
      WHERE staff_id = ${staffId} AND account_id = ${accountId};
    `;

    const count = Number(associatedBills[0]?.count || 0);

    if (count > 0) {
      // Soft-delete to preserve bill audit snapshots
      await sql`
        UPDATE staff_members
        SET is_active = false, is_default = false, updated_at = NOW()
        WHERE id = ${staffId} AND account_id = ${accountId};
      `;
    } else {
      // Hard delete if never used on any bills
      await sql`
        DELETE FROM staff_members
        WHERE id = ${staffId} AND account_id = ${accountId};
      `;
    }

    revalidatePath("/app/staff");
    revalidatePath("/app/billing");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting staff member:", err);
    return { success: false, error: err.message || "Failed to delete staff member." };
  }
}

/**
 * Get all bills associated with a specific staff member.
 */
export async function getStaffBillsAction(
  staffId: string
): Promise<{ success: boolean; bills?: StaffBillRecord[]; staffName?: string; error?: string }> {
  try {
    const session = await requireBusinessAccount();
    const accountId = session.account.id;

    const staffRow = await sql`
      SELECT name FROM staff_members WHERE id = ${staffId} AND account_id = ${accountId} LIMIT 1;
    `;

    if (staffRow.length === 0) {
      return { success: false, error: "Staff member not found." };
    }

    const staffName = staffRow[0].name;

    const billRows = await sql`
      SELECT
        b.id,
        b.bill_number,
        b.customer_name_snapshot,
        b.customer_phone_snapshot,
        b.grand_total,
        b.payment_method,
        b.payment_status,
        b.status,
        b.completed_at
      FROM bills b
      WHERE b.account_id = ${accountId}
        AND (b.staff_id = ${staffId} OR (b.staff_id IS NULL AND b.staff_name_snapshot = ${staffName}))
      ORDER BY b.completed_at DESC;
    `;

    const bills: StaffBillRecord[] = billRows.map((r: any) => ({
      id: r.id,
      billNumber: r.bill_number,
      customerName: r.customer_name_snapshot || "Walk-in Customer",
      customerPhone: r.customer_phone_snapshot || null,
      grandTotal: Number(r.grand_total || 0).toFixed(2),
      paymentMethod: r.payment_method || "CASH",
      paymentStatus: r.payment_status || "PAID",
      status: r.status || "COMPLETED",
      completedAt: new Date(r.completed_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }),
    }));

    return { success: true, bills, staffName };
  } catch (err: any) {
    console.error("Error getting staff bills:", err);
    return { success: false, error: err.message || "Failed to load staff bills." };
  }
}
