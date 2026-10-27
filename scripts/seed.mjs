import { neon, neonConfig } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const rawConnectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const connectionString = rawConnectionString.replace(/&channel_binding=require/g, "").replace(/\?channel_binding=require&?/g, "?");

const originalFetch = globalThis.fetch;
neonConfig.fetchFunction = async (url, options) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await originalFetch(url, options);
      if ((response.status === 503 || response.status === 504) && attempts < 2) {
        attempts++;
        await new Promise((r) => setTimeout(r, 400 * attempts));
        continue;
      }
      return response;
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempts));
    }
  }
  return originalFetch(url, options);
};

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

  // 7. Seed Cafe Bills with realistic 30-day history (Hourly today, daily past 30 days)
  await sql`DELETE FROM bill_items WHERE account_id = ${accountId}`;
  await sql`DELETE FROM shared_bill_links WHERE bill_id IN (SELECT id FROM bills WHERE account_id = ${accountId})`;
  await sql`DELETE FROM bills WHERE account_id = ${accountId}`;

  const currentYear = new Date().getFullYear();
  let billSeq = 1;
  const paymentMethods = ['UPI', 'CASH', 'UPI', 'CARD', 'UPI', 'CASH'];
  const now = new Date();
  const allOrders = [];

  function addOrder(daysAgo, hour, minute, customer, itemList, paymentMethod) {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);

    let subtotal = 0;
    const lineItems = [];
    for (const { name, qty } of itemList) {
      const it = itemMap.get(name) || cafeItems[0];
      const price = Number(it.price || it.unit_price || 30);
      const lineSub = price * qty;
      subtotal += lineSub;
      lineItems.push({
        id: generateId("bli"),
        itemId: itemMap.get(name) || null,
        name: name,
        price: price.toFixed(2),
        qty,
        lineSub: lineSub.toFixed(2)
      });
    }

    const discountAmount = subtotal > 300 ? 20 : 0;
    const taxable = subtotal - discountAmount;
    const taxAmount = Number((taxable * 0.05).toFixed(2));
    const grandTotal = Number((taxable + taxAmount).toFixed(2));

    const billId = generateId("bil");
    const billNumber = `CBC-${currentYear}-${String(billSeq++).padStart(6, '0')}`;

    allOrders.push({
      billId,
      billNumber,
      customerId: customer?.id || null,
      customerName: customer?.name || "Walk-in Guest",
      customerPhone: customer?.phone || null,
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxableAmount: taxable.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      paymentMethod,
      completedAt: d.toISOString(),
      lineItems
    });
  }

  // Today (12 orders)
  const cList = Array.from(customerMap.entries()).map(([name, id]) => ({ id, name }));
  addOrder(0, 8, 30, cList[0], [{ name: "Special Kulhad Masala Chai", qty: 2 }, { name: "Maska Bun with Jam", qty: 2 }], 'UPI');
  addOrder(0, 9, 15, cList[1], [{ name: "Filter Coffee", qty: 1 }, { name: "Cheese Chilli Toast", qty: 1 }], 'CASH');
  addOrder(0, 10, 5, null, [{ name: "Special Kulhad Masala Chai", qty: 3 }], 'UPI');
  addOrder(0, 11, 20, cList[2], [{ name: "Veg Cheese Grilled Sandwich", qty: 2 }, { name: "Fresh Mint Mojito", qty: 2 }], 'UPI');
  addOrder(0, 12, 45, null, [{ name: "Classic Veg Burger", qty: 1 }, { name: "Crispy Peri Peri Fries", qty: 1 }, { name: "Cold Coffee with Ice Cream", qty: 1 }], 'CARD');
  addOrder(0, 13, 30, cList[3], [{ name: "Paneer Tikka Grilled Sandwich", qty: 2 }, { name: "Crispy Veggie Maggi", qty: 1 }], 'UPI');
  addOrder(0, 15, 10, null, [{ name: "Filter Coffee", qty: 2 }, { name: "Warm Chocolate Brownie", qty: 1 }], 'CASH');
  addOrder(0, 16, 40, cList[0], [{ name: "Special Kulhad Masala Chai", qty: 4 }, { name: "Crispy Peri Peri Fries", qty: 2 }], 'UPI');
  addOrder(0, 17, 25, cList[1], [{ name: "Iced Lemon Tea", qty: 2 }, { name: "Cheese Butter Maggi", qty: 2 }], 'UPI');
  addOrder(0, 18, 15, null, [{ name: "Special Kulhad Masala Chai", qty: 2 }, { name: "Bombay Masala Toast", qty: 2 }], 'CASH');
  addOrder(0, 19, 30, cList[2], [{ name: "Brownie with Vanilla Ice Cream", qty: 2 }, { name: "Cold Coffee with Ice Cream", qty: 2 }], 'CARD');
  addOrder(0, 20, 15, cList[3], [{ name: "Crispy Paneer Wrap", qty: 2 }, { name: "Crispy Peri Peri Fries", qty: 1 }], 'UPI');

  // Yesterday (7 orders)
  addOrder(1, 9, 0, cList[1], [{ name: "Special Kulhad Masala Chai", qty: 2 }, { name: "Maska Bun with Jam", qty: 1 }], 'CASH');
  addOrder(1, 11, 30, null, [{ name: "Veg Cheese Grilled Sandwich", qty: 1 }, { name: "Cold Coffee with Ice Cream", qty: 1 }], 'UPI');
  addOrder(1, 13, 15, cList[0], [{ name: "Classic Veg Burger", qty: 2 }, { name: "Crispy Peri Peri Fries", qty: 2 }], 'CARD');
  addOrder(1, 16, 45, cList[2], [{ name: "Special Kulhad Masala Chai", qty: 3 }, { name: "Cheese Chilli Toast", qty: 1 }], 'UPI');
  addOrder(1, 18, 20, cList[3], [{ name: "Cheese Butter Maggi", qty: 2 }, { name: "Fresh Mint Mojito", qty: 1 }], 'UPI');
  addOrder(1, 19, 50, null, [{ name: "Brownie with Vanilla Ice Cream", qty: 2 }], 'CASH');
  addOrder(1, 21, 10, cList[1], [{ name: "Filter Coffee", qty: 2 }, { name: "Paneer Tikka Grilled Sandwich", qty: 1 }], 'UPI');

  // Days 2 to 29 (Past 4 weeks)
  for (let d = 2; d <= 29; d++) {
    const ordersToday = (d % 6 === 0 || d % 7 === 0) ? 4 : 2;
    for (let o = 0; o < ordersToday; o++) {
      const cust = cList[Math.floor(Math.random() * cList.length)];
      const hr = 10 + Math.floor(Math.random() * 11);
      const min = Math.floor(Math.random() * 60);
      const pm = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      addOrder(d, hr, min, cust, [
        { name: "Special Kulhad Masala Chai", qty: 1 + Math.floor(Math.random() * 3) },
        { name: cafeItems[Math.floor(Math.random() * cafeItems.length)].name, qty: 1 }
      ], pm);
    }
  }

  for (const o of allOrders) {
    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
        subtotal, discount_type, discount_value, discount_amount, tax_enabled, tax_label,
        tax_rate, tax_inclusive, taxable_amount, tax_amount, grand_total, payment_status,
        payment_method, amount_paid, status, completed_at, created_by_user_id, created_at, updated_at
      ) VALUES (
        ${o.billId}, ${accountId}, ${o.billNumber}, ${o.customerId}, ${o.customerName}, ${o.customerPhone},
        ${o.subtotal}, 'FIXED', '0.00', ${o.discountAmount}, true, 'GST',
        '5.00', false, ${o.taxableAmount}, ${o.taxAmount}, ${o.grandTotal}, 'PAID',
        ${o.paymentMethod}, ${o.grandTotal}, 'COMPLETED', ${o.completedAt}, ${finalDemoUserId}, ${o.completedAt}, ${o.completedAt}
      );
    `;

    if (o.lineItems.length > 0) {
      const ids = o.lineItems.map(l => l.id);
      const itemIds = o.lineItems.map(l => l.itemId);
      const names = o.lineItems.map(l => l.name);
      const prices = o.lineItems.map(l => l.price);
      const quantities = o.lineItems.map(l => l.qty);
      const subtotals = o.lineItems.map(l => l.lineSub);

      await sql`
        INSERT INTO bill_items (
          id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at
        )
        SELECT
          u.id, ${accountId}, ${o.billId}, u.item_id, u.item_name, u.unit_price::numeric, u.qty::numeric, u.line_subtotal::numeric, ${o.completedAt}::timestamp
        FROM unnest(
          ${ids}::varchar[], ${itemIds}::varchar[], ${names}::varchar[], ${prices}::numeric[], ${quantities}::numeric[], ${subtotals}::numeric[]
        ) AS u(id, item_id, item_name, unit_price, qty, line_subtotal);
      `;
    }
  }

  await sql`
    INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
    VALUES (${generateId("seq")}, ${accountId}, ${currentYear}, ${billSeq}, NOW())
    ON CONFLICT (account_id, year)
    DO UPDATE SET current_number = ${billSeq}, updated_at = NOW();
  `;

  // Seed public share link for latest bill
  const latestBill = allOrders[0];
  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await sql`
    INSERT INTO shared_bill_links (id, bill_id, token_hash, created_at)
    VALUES (${generateId("shl")}, ${latestBill.billId}, ${tokenHash}, NOW())
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
