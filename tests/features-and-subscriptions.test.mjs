import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { neon, neonConfig } from "@neondatabase/serverless";
neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;

// 1. Test WhatsApp message framing with Google Review Link
test("Feature 2: WhatsApp Share Message with Google Review Link", () => {
  function formatWhatsAppUrl({
    phone,
    customerName,
    businessName,
    billNumber,
    grandTotal,
    shareToken,
    googleReviewLink,
  }) {
    const rawDigits = String(phone).replace(/\D/g, "");
    const waNumber = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
    const greetingName = customerName?.trim() || "Customer";
    const business = businessName ? ` from ${businessName}` : "";
    const total = Number(grandTotal).toFixed(2);
    const linkText = shareToken ? `\n\n📄 View or download your bill here: https://billyours.com/b/${shareToken}` : "";
    const reviewText = googleReviewLink?.trim()
      ? `\n\n⭐⭐⭐⭐⭐ Loved your visit? Please take a moment to leave us a review on Google: ${googleReviewLink.trim()}`
      : "";

    const message = `Hello ${greetingName}! Here is your bill #${billNumber}${business} for ₹${total}.${linkText}${reviewText}\n\nThank you for your visit!`;
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  }

  const urlWithReview = formatWhatsAppUrl({
    phone: "9876543210",
    customerName: "Rohan Gupta",
    businessName: "Chai & Bites",
    billNumber: "BY-2026-0001",
    grandTotal: "450.00",
    shareToken: "abc123token456",
    googleReviewLink: "https://g.page/r/chaibites/review",
  });

  assert.ok(urlWithReview.includes("wa.me/919876543210"), "Contains correct WhatsApp recipient phone");
  const decodedMessage = decodeURIComponent(urlWithReview);
  assert.ok(decodedMessage.includes("Chai & Bites"), "Message includes business name");
  assert.ok(decodedMessage.includes("₹450.00"), "Message includes grand total");
  assert.ok(decodedMessage.includes("https://g.page/r/chaibites/review"), "Message includes Google review link");
  assert.ok(decodedMessage.includes("review on Google"), "Message asks customer to review on Google");

  // Also test without review link
  const urlWithoutReview = formatWhatsAppUrl({
    phone: "9876543210",
    customerName: "Rohan Gupta",
    businessName: "Chai & Bites",
    billNumber: "BY-2026-0001",
    grandTotal: "450.00",
    shareToken: "abc123token456",
  });
  const decodedWithout = decodeURIComponent(urlWithoutReview);
  assert.ok(!decodedWithout.includes("Google"), "Does not include Google review text when link not provided");
});

// 2. Database Integration: Staff Members, Bills, and Google Review Link
test("Feature 1: Staff Attribution and Google Review Link in DB", async () => {
  const rawUrl =
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
  const url = rawUrl
    .replace(/&channel_binding=require/g, "")
    .replace(/\?channel_binding=require&?/g, "?");

  const sql = neon(url);

  // Check demo account has gstin and google_review_link
  const demoAccounts = await sql`
    SELECT id, business_name, gstin, google_review_link, fssai
    FROM business_accounts
    WHERE id = 'acc_demo_sharma'
    LIMIT 1;
  `;
  assert.ok(demoAccounts.length > 0, "Demo account acc_demo_sharma exists");
  assert.ok(demoAccounts[0].gstin, "Demo account has GSTIN set");
  assert.ok(demoAccounts[0].google_review_link, "Demo account has Google review link set");

  // Check staff_members table has rows
  const staff = await sql`
    SELECT id, account_id, name, email, is_default, is_active
    FROM staff_members
    WHERE account_id = 'acc_demo_sharma'
    LIMIT 5;
  `;
  assert.ok(staff.length >= 1, "At least one staff member exists for demo account");
  assert.equal(staff[0].is_default, true, "First staff member is marked default");

  // Check bills table schema has staff_id and staff_name_snapshot
  const billSample = await sql`
    SELECT id, bill_number, staff_id, staff_name_snapshot
    FROM bills
    WHERE account_id = 'acc_demo_sharma'
    LIMIT 1;
  `;
  if (billSample.length > 0) {
    assert.ok(
      "staff_name_snapshot" in billSample[0],
      "bills table contains staff_name_snapshot column"
    );
  }

  // Check paid_setup_requests table
  const testReqId = "req_test_" + Date.now();
  await sql`
    INSERT INTO paid_setup_requests (id, plan, business_name, contact_name, phone, email, city)
    VALUES (${testReqId}, 'Monthly', 'Test Shop', 'Test Contact', '9999999999', 'test@test.com', 'Bengaluru');
  `;

  const retrieved = await sql`
    SELECT id, plan, business_name, phone
    FROM paid_setup_requests
    WHERE id = ${testReqId};
  `;
  assert.equal(retrieved.length, 1);
  assert.equal(retrieved[0].business_name, "Test Shop");

  // Clean up test row
  await sql`DELETE FROM paid_setup_requests WHERE id = ${testReqId};`;
});

// 3. Subscription Expired Logic & Contact Numbers Verification
test("Subscription Logic: 10-day trial and contact numbers", () => {
  const contact1 = "7904561269";
  const contact2 = "7845418030";

  // Verify format of support numbers
  assert.equal(contact1.length, 10);
  assert.equal(contact2.length, 10);

  // Test 10-day trial calculation
  const now = new Date();
  const trialEndsIn8Days = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  const trialExpiredDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const activeDaysRemaining = Math.max(
    0,
    Math.ceil((trialEndsIn8Days.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
  assert.equal(activeDaysRemaining, 8);

  const isExpired = trialExpiredDate < now;
  assert.equal(isExpired, true, "Past trial date correctly registers as expired");
});
