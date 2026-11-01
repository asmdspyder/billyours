import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { neon, neonConfig } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2]?.trim();
    }
  }
}

const rawUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const url = rawUrl
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?");

neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;
const sql = neon(url);

async function queryWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
}

test("Business Branding Fields: Persistence and Retrieval", async () => {
  // 1. Get active account
  const accounts = await queryWithRetry(() => sql`
    SELECT id, business_name
    FROM business_accounts
    WHERE status = 'ACTIVE' AND (id = 'acc_demo_sharma' OR id NOT LIKE 'acc_%_%')
    ORDER BY created_at ASC
    LIMIT 1;
  `);
  assert.ok(accounts.length > 0, "Active account found");
  const accountId = accounts[0].id;

  // 2. Update branding fields
  const testFssai = "11223344556677";
  const testWebsite = "www.chaibites.in";
  const testFacebook = "@chaibites";
  const testInstagram = "@chaibites.official";

  await sql`
    UPDATE business_accounts
    SET
      fssai = ${testFssai},
      website = ${testWebsite},
      facebook = ${testFacebook},
      instagram = ${testInstagram}
    WHERE id = ${accountId};
  `;

  // 3. Query back and verify
  const updated = await sql`
    SELECT id, business_name, fssai, website, facebook, instagram, gstin, business_phone, business_email
    FROM business_accounts
    WHERE id = ${accountId};
  `;

  assert.equal(updated[0].fssai, testFssai);
  assert.equal(updated[0].website, testWebsite);
  assert.equal(updated[0].facebook, testFacebook);
  assert.equal(updated[0].instagram, testInstagram);
});
