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
  console.log("Seeding BillYours database...");

  // 1. Super Admin credentials
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@billyours.com";
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "AdminSecure2026!";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const adminId = "usr_admin_" + crypto.randomBytes(6).toString("hex");

  // Check if admin exists
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

  // 2. Demo Business Owner credentials
  const demoEmail = "demo@billyours.com";
  const demoPassword = "DemoOwner2026!";
  const demoHash = await bcrypt.hash(demoPassword, 10);
  const demoUserId = "usr_demo_" + crypto.randomBytes(6).toString("hex");

  const existingDemoUser = await sql`SELECT id FROM users WHERE email = ${demoEmail}`;
  let finalDemoUserId = demoUserId;
  if (existingDemoUser.length === 0) {
    await sql`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (${demoUserId}, 'Rajesh Sharma', ${demoEmail}, ${demoHash}, 'USER', NOW(), NOW())
    `;
    console.log(`✓ Demo user created: ${demoEmail}`);
  } else {
    finalDemoUserId = existingDemoUser[0].id;
    await sql`
      UPDATE users SET password_hash = ${demoHash}, updated_at = NOW()
      WHERE id = ${finalDemoUserId}
    `;
    console.log(`✓ Demo user updated: ${demoEmail}`);
  }

  // 3. Demo Business Account
  const accountId = "acc_demo_sharma";
  const existingAccount = await sql`SELECT id FROM business_accounts WHERE id = ${accountId}`;
  const now = new Date();
  const trialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (existingAccount.length === 0) {
    await sql`
      INSERT INTO business_accounts (
        id, business_name, owner_name, business_type, business_email, business_phone,
        address, state, currency, timezone, invoice_prefix, receipt_preference,
        default_tax_rate, default_tax_label, status, subscription_status,
        trial_starts_at, trial_ends_at, created_at, updated_at
      )
      VALUES (
        ${accountId}, 'Sharma General Store', 'Rajesh Sharma', 'retail', ${demoEmail},
        '+91 98765 43210', 'Shop 12, Market Road, Bengaluru', 'Karnataka',
        'INR', 'Asia/Kolkata', 'BY', 'thermal', '5.00', 'GST',
        'ACTIVE', 'TRIAL', NOW(), ${trialEnds.toISOString()}, NOW(), NOW()
      )
    `;
    console.log("✓ Demo business account created: Sharma General Store");
  }

  // 4. Membership link
  const existingMembership = await sql`
    SELECT id FROM account_memberships WHERE account_id = ${accountId} AND user_id = ${finalDemoUserId}
  `;
  if (existingMembership.length === 0) {
    await sql`
      INSERT INTO account_memberships (id, account_id, user_id, role, created_at)
      VALUES (${generateId("mem")}, ${accountId}, ${finalDemoUserId}, 'OWNER', NOW())
    `;
    console.log("✓ Owner membership linked");
  }

  // 5. Pre-seed catalog items
  const demoItems = [
    { name: "Basmati Rice 1kg", category: "Groceries", unit: "kg", price: "120.00" },
    { name: "Aashirvaad Atta 5kg", category: "Groceries", unit: "bag", price: "260.00" },
    { name: "Tata Salt 1kg", category: "Groceries", unit: "pack", price: "28.00" },
    { name: "Amul Butter 100g", category: "Dairy", unit: "pack", price: "56.00" },
    { name: "Parle-G Gold Biscuit", category: "Snacks", unit: "pack", price: "15.00" },
    { name: "Cadbury Dairy Milk Silk", category: "Chocolates", unit: "pack", price: "90.00" },
    { name: "Taj Mahal Tea 250g", category: "Beverages", unit: "box", price: "175.00" },
    { name: "Dettol Soap 75g", category: "Personal Care", unit: "piece", price: "40.00" },
    { name: "Fortune Sunflower Oil 1L", category: "Groceries", unit: "litre", price: "145.00" },
    { name: "Maggi 2-Minute Noodles 4-pack", category: "Snacks", unit: "pack", price: "55.00" },
  ];

  const itemMap = new Map();
  for (const it of demoItems) {
    const existing = await sql`
      SELECT id FROM items WHERE account_id = ${accountId} AND name = ${it.name}
    `;
    if (existing.length === 0) {
      const itId = generateId("itm");
      await sql`
        INSERT INTO items (id, account_id, name, category, unit_label, unit_price, is_active, created_at, updated_at)
        VALUES (${itId}, ${accountId}, ${it.name}, ${it.category}, ${it.unit}, ${it.price}, true, NOW(), NOW())
      `;
      itemMap.set(it.name, itId);
    } else {
      itemMap.set(it.name, existing[0].id);
    }
  }
  console.log(`✓ Catalog items ready (${demoItems.length} items)`);

  // 6. Pre-seed Customers
  const demoCustomers = [
    { name: "Priya Patel", phone: "9876511111", email: "priya@example.com" },
    { name: "Amit Kumar", phone: "9876522222", email: "amit@example.com" },
    { name: "Sneha Reddy", phone: "9876533333", email: "sneha@example.com" },
  ];

  const customerMap = new Map();
  for (const cust of demoCustomers) {
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
  console.log("✓ Demo customers ready");

  // 7. Seed Initial Bill Sequence & Sample Bills if not present
  const currentYear = new Date().getFullYear();
  const existingSeq = await sql`
    SELECT id, current_number FROM bill_sequences WHERE account_id = ${accountId} AND year = ${currentYear}
  `;

  if (existingSeq.length === 0) {
    await sql`
      INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
      VALUES (${generateId("seq")}, ${accountId}, ${currentYear}, 3, NOW())
    `;

    // Bill 1: Priya Patel
    const b1Id = generateId("bil");
    const b1Number = `BY-${currentYear}-000001`;
    const priyaId = customerMap.get("Priya Patel");
    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
        subtotal, discount_type, discount_value, discount_amount, tax_enabled, tax_label,
        tax_rate, tax_inclusive, taxable_amount, tax_amount, grand_total, payment_status,
        payment_method, amount_paid, status, completed_at, created_by_user_id, created_at, updated_at
      ) VALUES (
        ${b1Id}, ${accountId}, ${b1Number}, ${priyaId}, 'Priya Patel', '+919876511111',
        '405.00', 'PERCENTAGE', '10.00', '40.50', true, 'GST',
        '5.00', false, '364.50', '18.23', '382.73', 'PAID',
        'UPI', '382.73', 'COMPLETED', NOW(), ${finalDemoUserId}, NOW(), NOW()
      )
    `;

    await sql`
      INSERT INTO bill_items (id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at)
      VALUES
        (${generateId("bli")}, ${accountId}, ${b1Id}, ${itemMap.get("Basmati Rice 1kg")}, 'Basmati Rice 1kg', '120.00', 2, '240.00', NOW()),
        (${generateId("bli")}, ${accountId}, ${b1Id}, ${itemMap.get("Fortune Sunflower Oil 1L")}, 'Fortune Sunflower Oil 1L', '145.00', 1, '145.00', NOW()),
        (${generateId("bli")}, ${accountId}, ${b1Id}, ${itemMap.get("Amul Butter 100g")}, 'Amul Butter 100g', '56.00', 1, '56.00', NOW())
    `;

    // Bill 2: Amit Kumar
    const b2Id = generateId("bil");
    const b2Number = `BY-${currentYear}-000002`;
    const amitId = customerMap.get("Amit Kumar");
    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
        subtotal, discount_type, discount_value, discount_amount, tax_enabled, tax_label,
        tax_rate, tax_inclusive, taxable_amount, tax_amount, grand_total, payment_status,
        payment_method, amount_paid, status, completed_at, created_by_user_id, created_at, updated_at
      ) VALUES (
        ${b2Id}, ${accountId}, ${b2Number}, ${amitId}, 'Amit Kumar', '+919876522222',
        '330.00', 'FIXED', '30.00', '30.00', false, 'GST',
        '0.00', false, '300.00', '0.00', '300.00', 'PAID',
        'CASH', '300.00', 'COMPLETED', NOW(), ${finalDemoUserId}, NOW(), NOW()
      )
    `;

    await sql`
      INSERT INTO bill_items (id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at)
      VALUES
        (${generateId("bli")}, ${accountId}, ${b2Id}, ${itemMap.get("Aashirvaad Atta 5kg")}, 'Aashirvaad Atta 5kg', '260.00', 1, '260.00', NOW()),
        (${generateId("bli")}, ${accountId}, ${b2Id}, ${itemMap.get("Tata Salt 1kg")}, 'Tata Salt 1kg', '28.00', 1, '28.00', NOW()),
        (${generateId("bli")}, ${accountId}, ${b2Id}, ${itemMap.get("Dettol Soap 75g")}, 'Dettol Soap 75g', '40.00', 1, '40.00', NOW())
    `;

    // Bill 3: Cash customer without contact details
    const b3Id = generateId("bil");
    const b3Number = `BY-${currentYear}-000003`;
    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
        subtotal, discount_type, discount_value, discount_amount, tax_enabled, tax_label,
        tax_rate, tax_inclusive, taxable_amount, tax_amount, grand_total, payment_status,
        payment_method, amount_paid, status, completed_at, created_by_user_id, created_at, updated_at
      ) VALUES (
        ${b3Id}, ${accountId}, ${b3Number}, NULL, 'Walk-in Customer', NULL,
        '145.00', NULL, '0.00', '0.00', false, 'GST',
        '0.00', false, '145.00', '0.00', '145.00', 'PAID',
        'CASH', '145.00', 'COMPLETED', NOW(), ${finalDemoUserId}, NOW(), NOW()
      )
    `;

    await sql`
      INSERT INTO bill_items (id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at)
      VALUES
        (${generateId("bli")}, ${accountId}, ${b3Id}, ${itemMap.get("Cadbury Dairy Milk Silk")}, 'Cadbury Dairy Milk Silk', '90.00', 1, '90.00', NOW()),
        (${generateId("bli")}, ${accountId}, ${b3Id}, ${itemMap.get("Maggi 2-Minute Noodles 4-pack")}, 'Maggi 2-Minute Noodles 4-pack', '55.00', 1, '55.00', NOW())
    `;

    // Seed a shared bill token for Bill 1
    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await sql`
      INSERT INTO shared_bill_links (id, bill_id, token_hash, created_at)
      VALUES (${generateId("shl")}, ${b1Id}, ${tokenHash}, NOW())
    `;

    console.log("✓ Sample bills seeded with historical items and sequential numbering");
  }

  console.log("\n=======================================================");
  console.log("SEEDED CREDENTIALS:");
  console.log("Platform Administrator:");
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log(`  Role:     ADMIN`);
  console.log("Demo Business Owner:");
  console.log(`  Email:    ${demoEmail}`);
  console.log(`  Password: ${demoPassword}`);
  console.log(`  Business: Sharma General Store (Trial active)`);
  console.log("=======================================================\n");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
