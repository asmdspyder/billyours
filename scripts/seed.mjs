import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

function generateId(prefix = "") {
  return (prefix ? prefix + "_" : "") + crypto.randomBytes(12).toString("hex");
}

function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+91")) return cleaned;
  if (cleaned.startsWith("91") && cleaned.length === 12) return "+" + cleaned;
  if (cleaned.length === 10) return "+91" + cleaned;
  return cleaned;
}

async function seed() {
  console.log("Seeding BillYours database with Cafe Demo data...");

  // 1. Super Admin credentials
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@billyours.com";
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "AdminSecure2026!";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const adminId = "usr_admin_" + crypto.randomBytes(6).toString("hex");

  const existingAdmin = await sql`SELECT id FROM users WHERE email = ${adminEmail}`;
  let finalAdminId = adminId;
  if (existingAdmin.length === 0) {
    await sql`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (${adminId}, 'Platform Administrator', ${adminEmail}, ${adminHash}, 'ADMIN', NOW(), NOW())
    `;
    console.log(`✓ Super Admin created: ${adminEmail}`);
  } else {
    finalAdminId = existingAdmin[0].id;
    await sql`
      UPDATE users SET password_hash = ${adminHash}, role = 'ADMIN', updated_at = NOW()
      WHERE id = ${finalAdminId}
    `;
    console.log(`✓ Super Admin updated: ${adminEmail}`);
  }

  // 2. Demo Cafe Owner credentials
  const demoEmail = "demo@billyours.com";
  const demoPassword = "DemoOwner2026!";
  const demoHash = await bcrypt.hash(demoPassword, 10);
  const demoUserId = "usr_demo_" + crypto.randomBytes(6).toString("hex");

  const existingDemoUser = await sql`SELECT id FROM users WHERE email = ${demoEmail}`;
  let finalDemoUserId = demoUserId;
  if (existingDemoUser.length === 0) {
    await sql`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (${demoUserId}, 'Rohan Verma', ${demoEmail}, ${demoHash}, 'USER', NOW(), NOW())
    `;
    console.log(`✓ Demo user created: ${demoEmail}`);
  } else {
    finalDemoUserId = existingDemoUser[0].id;
    await sql`
      UPDATE users SET name = 'Rohan Verma', password_hash = ${demoHash}, updated_at = NOW()
      WHERE id = ${finalDemoUserId}
    `;
    console.log(`✓ Demo user updated: ${demoEmail}`);
  }

  // 3. Demo Business Account - Small Cafe
  const accountId = "acc_demo_sharma"; // keep same ID for continuity or update details
  const now = new Date();
  const trialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const existingAccount = await sql`SELECT id FROM business_accounts WHERE id = ${accountId}`;
  if (existingAccount.length === 0) {
    await sql`
      INSERT INTO business_accounts (
        id, business_name, owner_name, business_type, business_email, business_phone,
        address, state, currency, timezone, invoice_prefix, receipt_preference,
        default_tax_rate, default_tax_label, status, subscription_status,
        trial_starts_at, trial_ends_at, created_at, updated_at
      )
      VALUES (
        ${accountId}, 'Chai & Bites Cafe', 'Rohan Verma', 'restaurant', ${demoEmail},
        '+91 98765 43210', 'Shop 4, 100ft Road, Indiranagar, Bengaluru', 'Karnataka',
        'INR', 'Asia/Kolkata', 'CBC', 'thermal', '5.00', 'GST',
        'ACTIVE', 'TRIAL', NOW(), ${trialEnds.toISOString()}, NOW(), NOW()
      )
    `;
  } else {
    await sql`
      UPDATE business_accounts
      SET
        business_name = 'Chai & Bites Cafe',
        owner_name = 'Rohan Verma',
        business_type = 'restaurant',
        business_phone = '+91 98765 43210',
        address = 'Shop 4, 100ft Road, Indiranagar, Bengaluru',
        state = 'Karnataka',
        invoice_prefix = 'CBC',
        receipt_preference = 'thermal',
        default_tax_rate = '5.00',
        default_tax_label = 'GST',
        status = 'ACTIVE',
        subscription_status = 'TRIAL',
        trial_ends_at = ${trialEnds.toISOString()},
        updated_at = NOW()
      WHERE id = ${accountId}
    `;
  }
  console.log("✓ Demo Cafe Account updated: Chai & Bites Cafe (Food & Beverages)");

  // 4. Membership link
  const existingMembership = await sql`
    SELECT id FROM account_memberships WHERE account_id = ${accountId} AND user_id = ${finalDemoUserId}
  `;
  if (existingMembership.length === 0) {
    await sql`
      INSERT INTO account_memberships (id, account_id, user_id, role, created_at)
      VALUES (${generateId("mem")}, ${accountId}, ${finalDemoUserId}, 'OWNER', NOW())
    `;
  }

  // 5. Clean up old non-cafe items and add delicious Cafe Food & Beverage Items
  await sql`DELETE FROM items WHERE account_id = ${accountId}`;

  const cafeItems = [
    // Beverages
    { name: "Special Kulhad Masala Chai", category: "Hot Beverages", unit: "cup", price: "30.00" },
    { name: "Filter Coffee", category: "Hot Beverages", unit: "cup", price: "40.00" },
    { name: "Cold Coffee with Ice Cream", category: "Cold Beverages", unit: "glass", price: "95.00" },
    { name: "Iced Lemon Tea", category: "Cold Beverages", unit: "glass", price: "70.00" },
    { name: "Fresh Mint Mojito", category: "Cold Beverages", unit: "glass", price: "85.00" },

    // Sandwiches & Wraps
    { name: "Veg Cheese Grilled Sandwich", category: "Sandwiches", unit: "plate", price: "110.00" },
    { name: "Paneer Tikka Grilled Sandwich", category: "Sandwiches", unit: "plate", price: "135.00" },
    { name: "Bombay Masala Toast", category: "Sandwiches", unit: "plate", price: "90.00" },
    { name: "Crispy Paneer Wrap", category: "Wraps & Rolls", unit: "piece", price: "120.00" },

    // Quick Bites & Snacks
    { name: "Crispy Peri Peri Fries", category: "Quick Bites", unit: "portion", price: "90.00" },
    { name: "Cheese Chilli Toast", category: "Quick Bites", unit: "plate", price: "100.00" },
    { name: "Classic Veg Burger", category: "Burgers", unit: "piece", price: "99.00" },
    { name: "Crispy Veggie Maggi", category: "Maggi Specials", unit: "bowl", price: "65.00" },
    { name: "Cheese Butter Maggi", category: "Maggi Specials", unit: "bowl", price: "85.00" },
    { name: "Maska Bun with Jam", category: "Bakery", unit: "piece", price: "45.00" },

    // Desserts
    { name: "Warm Chocolate Brownie", category: "Desserts", unit: "piece", price: "90.00" },
    { name: "Brownie with Vanilla Ice Cream", category: "Desserts", unit: "plate", price: "130.00" },
  ];

  const itemMap = new Map();
  for (const it of cafeItems) {
    const itId = generateId("itm");
    await sql`
      INSERT INTO items (id, account_id, name, category, unit_label, unit_price, is_active, created_at, updated_at)
      VALUES (${itId}, ${accountId}, ${it.name}, ${it.category}, ${it.unit}, ${it.price}, true, NOW(), NOW())
    `;
    itemMap.set(it.name, itId);
  }
  console.log(`✓ Seeded ${cafeItems.length} cafe food & beverage items across Hot Beverages, Sandwiches, Quick Bites, Maggi, and Desserts`);

  // 6. Seed Cafe Customers
  const cafeCustomers = [
    { name: "Aarav Mehta", phone: "9876541111", email: "aarav@gmail.com" },
    { name: "Pooja Hegde", phone: "9876542222", email: "pooja.h@gmail.com" },
    { name: "Karan Johar", phone: "9876543333", email: "karan@gmail.com" },
    { name: "Ananya Panday", phone: "9876544444", email: "ananya@gmail.com" },
  ];

  const customerMap = new Map();
  for (const cust of cafeCustomers) {
    const norm = normalizePhone(cust.phone);
    const existing = await sql`
      SELECT id FROM customers WHERE account_id = ${accountId} AND normalized_phone = ${norm}
    `;
    if (existing.length === 0) {
      const cId = generateId("cst");
      await sql`
        INSERT INTO customers (id, account_id, name, phone, normalized_phone, email, created_at, updated_at)
        VALUES (${cId}, ${accountId}, ${cust.name}, ${cust.phone}, ${norm}, ${cust.email}, NOW(), NOW())
      `;
      customerMap.set(cust.name, cId);
    } else {
      customerMap.set(cust.name, existing[0].id);
    }
  }
  console.log("✓ Cafe customers ready");

  // 7. Re-seed Cafe Bills with food orders
  await sql`DELETE FROM bill_items WHERE account_id = ${accountId}`;
  await sql`DELETE FROM bills WHERE account_id = ${accountId}`;

  const currentYear = new Date().getFullYear();
  await sql`
    INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
    VALUES (${generateId("seq")}, ${accountId}, ${currentYear}, 3, NOW())
    ON CONFLICT (account_id, year)
    DO UPDATE SET current_number = 3, updated_at = NOW();
  `;

  // Order 1: Aarav Mehta - Cold coffee, sandwich, fries (UPI paid)
  const b1Id = generateId("bil");
  const b1Number = `CBC-${currentYear}-000001`;
  const aaravId = customerMap.get("Aarav Mehta");

  // Subtotal: 95 (Cold Coffee) + 110 (Veg Cheese Grilled Sandwich) + 90 (Peri Peri Fries) = 295.00
  // Discount: 5% = 14.75 -> Taxable: 280.25
  // GST 5%: 14.01 -> Grand Total: 294.26
  await sql`
    INSERT INTO bills (
      id, account_id, bill_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
      subtotal, discount_type, discount_value, discount_amount, tax_enabled, tax_label,
      tax_rate, tax_inclusive, taxable_amount, tax_amount, grand_total, payment_status,
      payment_method, amount_paid, status, completed_at, created_by_user_id, created_at, updated_at
    ) VALUES (
      ${b1Id}, ${accountId}, ${b1Number}, ${aaravId}, 'Aarav Mehta', '+919876541111',
      '295.00', 'PERCENTAGE', '5.00', '14.75', true, 'GST',
      '5.00', false, '280.25', '14.01', '294.26', 'PAID',
      'UPI', '294.26', 'COMPLETED', NOW(), ${finalDemoUserId}, NOW(), NOW()
    );
  `;

  await sql`
    INSERT INTO bill_items (id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at)
    VALUES
      (${generateId("bli")}, ${accountId}, ${b1Id}, ${itemMap.get("Cold Coffee with Ice Cream")}, 'Cold Coffee with Ice Cream', '95.00', 1, '95.00', NOW()),
      (${generateId("bli")}, ${accountId}, ${b1Id}, ${itemMap.get("Veg Cheese Grilled Sandwich")}, 'Veg Cheese Grilled Sandwich', '110.00', 1, '110.00', NOW()),
      (${generateId("bli")}, ${accountId}, ${b1Id}, ${itemMap.get("Crispy Peri Peri Fries")}, 'Crispy Peri Peri Fries', '90.00', 1, '90.00', NOW())
  `;

  // Order 2: Pooja Hegde - 2 Kulhad Chai + 2 Maska Bun (Cash paid)
  const b2Id = generateId("bil");
  const b2Number = `CBC-${currentYear}-000002`;
  const poojaId = customerMap.get("Pooja Hegde");
  // 2 * 30 = 60, 2 * 45 = 90. Total = 150.00
  await sql`
    INSERT INTO bills (
      id, account_id, bill_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
      subtotal, discount_type, discount_value, discount_amount, tax_enabled, tax_label,
      tax_rate, tax_inclusive, taxable_amount, tax_amount, grand_total, payment_status,
      payment_method, amount_paid, status, completed_at, created_by_user_id, created_at, updated_at
    ) VALUES (
      ${b2Id}, ${accountId}, ${b2Number}, ${poojaId}, 'Pooja Hegde', '+919876542222',
      '150.00', NULL, '0.00', '0.00', false, 'GST',
      '0.00', false, '150.00', '0.00', '150.00', 'PAID',
      'CASH', '150.00', 'COMPLETED', NOW(), ${finalDemoUserId}, NOW(), NOW()
    );
  `;

  await sql`
    INSERT INTO bill_items (id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at)
    VALUES
      (${generateId("bli")}, ${accountId}, ${b2Id}, ${itemMap.get("Special Kulhad Masala Chai")}, 'Special Kulhad Masala Chai', '30.00', 2, '60.00', NOW()),
      (${generateId("bli")}, ${accountId}, ${b2Id}, ${itemMap.get("Maska Bun with Jam")}, 'Maska Bun with Jam', '45.00', 2, '90.00', NOW())
  `;

  // Order 3: Walk-in Cafe Customer - Cheese Butter Maggi + Brownie with Ice Cream (Card paid)
  const b3Id = generateId("bil");
  const b3Number = `CBC-${currentYear}-000003`;
  // 85 + 130 = 215.00
  await sql`
    INSERT INTO bills (
      id, account_id, bill_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
      subtotal, discount_type, discount_value, discount_amount, tax_enabled, tax_label,
      tax_rate, tax_inclusive, taxable_amount, tax_amount, grand_total, payment_status,
      payment_method, amount_paid, status, completed_at, created_by_user_id, created_at, updated_at
    ) VALUES (
      ${b3Id}, ${accountId}, ${b3Number}, NULL, 'Table 4 Walk-in', NULL,
      '215.00', NULL, '0.00', '0.00', false, 'GST',
      '0.00', false, '215.00', '0.00', '215.00', 'PAID',
      'CARD', '215.00', 'COMPLETED', NOW(), ${finalDemoUserId}, NOW(), NOW()
    );
  `;

  await sql`
    INSERT INTO bill_items (id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at)
    VALUES
      (${generateId("bli")}, ${accountId}, ${b3Id}, ${itemMap.get("Cheese Butter Maggi")}, 'Cheese Butter Maggi', '85.00', 1, '85.00', NOW()),
      (${generateId("bli")}, ${accountId}, ${b3Id}, ${itemMap.get("Brownie with Vanilla Ice Cream")}, 'Brownie with Vanilla Ice Cream', '130.00', 1, '130.00', NOW())
  `;

  // Seed public share link for Bill 1
  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await sql`
    INSERT INTO shared_bill_links (id, bill_id, token_hash, created_at)
    VALUES (${generateId("shl")}, ${b1Id}, ${tokenHash}, NOW())
  `;

  console.log("\n=======================================================");
  console.log("SEEDED CAFE CREDENTIALS:");
  console.log("Business Name: Chai & Bites Cafe");
  console.log("Type:          Restaurant / Food & Beverages");
  console.log("Owner:         Rohan Verma");
  console.log(`Email:         ${demoEmail}`);
  console.log(`Password:      ${demoPassword}`);
  console.log("Menu Items:    16 delicious food & beverage items");
  console.log("=======================================================\n");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
