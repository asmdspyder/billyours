import {
  pgTable,
  varchar,
  text,
  timestamp,
  numeric,
  boolean,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users table
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("USER"), // 'USER' | 'ADMIN'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_role").on(table.role),
  ]
);

// 2. Business Accounts (Tenants)
export const businessAccounts = pgTable(
  "business_accounts",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    ownerName: varchar("owner_name", { length: 255 }).notNull(),
    businessType: varchar("business_type", { length: 100 }).notNull().default("retail"),
    businessEmail: varchar("business_email", { length: 255 }),
    businessPhone: varchar("business_phone", { length: 50 }),
    address: text("address"),
    state: varchar("state", { length: 100 }),
    currency: varchar("currency", { length: 10 }).notNull().default("INR"),
    timezone: varchar("timezone", { length: 100 }).notNull().default("Asia/Kolkata"),
    invoicePrefix: varchar("invoice_prefix", { length: 20 }).notNull().default("BY"),
    receiptPreference: varchar("receipt_preference", { length: 20 }).notNull().default("thermal"), // 'thermal' | 'a4'
    defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }).default("0"),
    defaultTaxLabel: varchar("default_tax_label", { length: 50 }).default("GST"),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
    subscriptionStatus: varchar("subscription_status", { length: 50 }).notNull().default("TRIAL"), // 'TRIAL' | 'ACTIVE' | 'EXPIRED'
    subscriptionPlan: varchar("subscription_plan", { length: 50 }), // 'MONTHLY' | 'YEARLY'
    trialStartsAt: timestamp("trial_starts_at", { withTimezone: true }).notNull().defaultNow(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
    subscriptionStartsAt: timestamp("subscription_starts_at", { withTimezone: true }),
    subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_business_accounts_status").on(table.status),
    index("idx_business_accounts_sub_status").on(table.subscriptionStatus),
    index("idx_business_accounts_trial_ends").on(table.trialEndsAt),
  ]
);

// 3. Account Memberships
export const accountMemberships = pgTable(
  "account_memberships",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    accountId: varchar("account_id", { length: 64 })
      .notNull()
      .references(() => businessAccounts.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("OWNER"), // 'OWNER' | 'STAFF'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_memberships_account_user").on(table.accountId, table.userId),
    index("idx_memberships_user").on(table.userId),
    index("idx_memberships_account").on(table.accountId),
  ]
);

// 4. Sessions
export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    activeAccountId: varchar("active_account_id", { length: 64 }).references(
      () => businessAccounts.id,
      { onDelete: "set null" }
    ),
    impersonatedByAdminId: varchar("impersonated_by_admin_id", { length: 64 }).references(
      () => users.id,
      { onDelete: "set null" }
    ),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_sessions_token_hash").on(table.tokenHash),
    index("idx_sessions_user").on(table.userId),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ]
);

// 5. Items (Catalog)
export const items = pgTable(
  "items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    accountId: varchar("account_id", { length: 64 })
      .notNull()
      .references(() => businessAccounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }),
    unitLabel: varchar("unit_label", { length: 50 }).default("piece"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_items_account_active").on(table.accountId, table.isActive),
    index("idx_items_account_name").on(table.accountId, table.name),
  ]
);

// 6. Customers
export const customers = pgTable(
  "customers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    accountId: varchar("account_id", { length: 64 })
      .notNull()
      .references(() => businessAccounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    normalizedPhone: varchar("normalized_phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_customers_account_phone").on(table.accountId, table.normalizedPhone),
    index("idx_customers_account_name").on(table.accountId, table.name),
  ]
);

// 7. Bill Sequences (Atomic number allocator)
export const billSequences = pgTable(
  "bill_sequences",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    accountId: varchar("account_id", { length: 64 })
      .notNull()
      .references(() => businessAccounts.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    currentNumber: integer("current_number").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_bill_sequences_account_year").on(table.accountId, table.year),
  ]
);

// 8. Bills
export const bills = pgTable(
  "bills",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    accountId: varchar("account_id", { length: 64 })
      .notNull()
      .references(() => businessAccounts.id, { onDelete: "cascade" }),
    billNumber: varchar("bill_number", { length: 50 }).notNull(),
    customerId: varchar("customer_id", { length: 64 }).references(() => customers.id, {
      onDelete: "set null",
    }),
    customerNameSnapshot: varchar("customer_name_snapshot", { length: 255 }),
    customerPhoneSnapshot: varchar("customer_phone_snapshot", { length: 50 }),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    discountType: varchar("discount_type", { length: 20 }), // 'FIXED' | 'PERCENTAGE'
    discountValue: numeric("discount_value", { precision: 12, scale: 2 }).notNull().default("0"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    taxEnabled: boolean("tax_enabled").notNull().default(false),
    taxLabel: varchar("tax_label", { length: 50 }).default("GST"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    taxInclusive: boolean("tax_inclusive").notNull().default(false),
    taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
    paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("PAID"), // 'PAID' | 'UNPAID'
    paymentMethod: varchar("payment_method", { length: 20 }).default("CASH"), // 'CASH' | 'UPI' | 'CARD' | 'OTHER'
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    status: varchar("status", { length: 20 }).notNull().default("COMPLETED"), // 'COMPLETED' | 'CANCELLED'
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    createdByUserId: varchar("created_by_user_id", { length: 64 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_bills_account_number").on(table.accountId, table.billNumber),
    index("idx_bills_account_completed").on(table.accountId, table.completedAt),
    index("idx_bills_account_status").on(table.accountId, table.status),
    index("idx_bills_account_customer").on(table.accountId, table.customerId),
  ]
);

// 9. Bill Items (Historical Snapshots)
export const billItems = pgTable(
  "bill_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    accountId: varchar("account_id", { length: 64 })
      .notNull()
      .references(() => businessAccounts.id, { onDelete: "cascade" }),
    billId: varchar("bill_id", { length: 64 })
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    itemId: varchar("item_id", { length: 64 }).references(() => items.id, {
      onDelete: "set null",
    }),
    itemNameSnapshot: varchar("item_name_snapshot", { length: 255 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    lineSubtotal: numeric("line_subtotal", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_bill_items_bill").on(table.billId),
    index("idx_bill_items_account").on(table.accountId),
  ]
);

// 10. Shared Bill Links (Public bearer token)
export const sharedBillLinks = pgTable(
  "shared_bill_links",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    billId: varchar("bill_id", { length: 64 })
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_shared_links_token_hash").on(table.tokenHash),
    index("idx_shared_links_bill").on(table.billId),
  ]
);

// 11. Admin Audit Logs
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    adminUserId: varchar("admin_user_id", { length: 64 }).references(() => users.id, {
      onDelete: "set null",
    }),
    targetAccountId: varchar("target_account_id", { length: 64 }).references(
      () => businessAccounts.id,
      { onDelete: "set null" }
    ),
    action: varchar("action", { length: 100 }).notNull(),
    details: text("details"),
    impersonationSessionId: varchar("impersonation_session_id", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_logs_target").on(table.targetAccountId),
    index("idx_audit_logs_created").on(table.createdAt),
  ]
);

// 12. Password Resets
export const passwordResets = pgTable(
  "password_resets",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_pwd_resets_token").on(table.tokenHash),
    index("idx_pwd_resets_user").on(table.userId),
  ]
);

// Drizzle relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(accountMemberships),
  sessions: many(sessions),
}));

export const businessAccountsRelations = relations(businessAccounts, ({ many }) => ({
  memberships: many(accountMemberships),
  items: many(items),
  customers: many(customers),
  bills: many(bills),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  account: one(businessAccounts, {
    fields: [bills.accountId],
    references: [businessAccounts.id],
  }),
  customer: one(customers, {
    fields: [bills.customerId],
    references: [customers.id],
  }),
  items: many(billItems),
  sharedLinks: many(sharedBillLinks),
}));

export const billItemsRelations = relations(billItems, ({ one }) => ({
  bill: one(bills, {
    fields: [billItems.billId],
    references: [bills.id],
  }),
}));
