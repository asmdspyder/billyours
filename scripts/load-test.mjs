import crypto from "crypto";
import { neon, neonConfig } from "@neondatabase/serverless";
import fs from "fs";

if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2]?.trim();
    }
  }
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL is required to run load tests.");
}

const url = rawUrl
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?");

neonConfig.fetchEndpoint = (h) => `https://${h}/sql`;

const originalFetch = globalThis.fetch;
neonConfig.fetchFunction = async (fetchUrl, options) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await originalFetch(fetchUrl, options);
      if ((response.status === 503 || response.status === 504) && attempts < 2) {
        attempts++;
        await new Promise((r) => setTimeout(r, 150 * attempts));
        continue;
      }
      return response;
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, 150 * attempts));
    }
  }
  return originalFetch(fetchUrl, options);
};

const sql = neon(url);

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runLoadStage(concurrency, totalTransactions, accountId, prefix, currentYear) {
  console.log(`\n======================================================`);
  console.log(`🚀 STAGE: ${concurrency} Concurrent Workers | ${totalTransactions} Iterations`);
  console.log(`======================================================`);

  const createdBillIds = [];
  const readLatencies = [];
  const invoiceWriteLatencies = [];
  let errorCount = 0;
  const stageStartTime = Date.now();

  const transactionsPerWorker = Math.ceil(totalTransactions / concurrency);

  const workers = Array.from({ length: concurrency }, async (_, workerId) => {
    for (let i = 0; i < transactionsPerWorker; i++) {
      const txStart = Date.now();
      try {
        // 1. Session resolution simulation
        const t1 = Date.now();
        await sql`
          SELECT s.id, u.id as u_id, u.name, ba.id as ba_id, ba.business_name
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          LEFT JOIN business_accounts ba ON ba.id = s.active_account_id
          WHERE ba.id = ${accountId}
          LIMIT 1;
        `;
        readLatencies.push(Date.now() - t1);

        // 2. Product search simulation
        const t2 = Date.now();
        await sql`
          SELECT id, name, unit_price, gst_rate, price_type
          FROM items
          WHERE account_id = ${accountId} AND is_active = true
          ORDER BY name ASC
          LIMIT 10;
        `;
        readLatencies.push(Date.now() - t2);

        // 3. Customer lookup simulation
        const t3 = Date.now();
        await sql`
          SELECT id, name, phone
          FROM customers
          WHERE account_id = ${accountId} AND archived_at IS NULL
          LIMIT 5;
        `;
        readLatencies.push(Date.now() - t3);

        // 4. Atomic invoice creation (header + sequence + line items + share link)
        const tWrite = Date.now();
        const testBillId = `bil_load_${workerId}_${i}_${crypto.randomBytes(4).toString("hex")}`;
        const seqId = `seq_load_${workerId}_${i}_${crypto.randomBytes(4).toString("hex")}`;
        const linkId = `shl_load_${workerId}_${i}_${crypto.randomBytes(4).toString("hex")}`;
        const tokenHash = crypto.randomBytes(16).toString("hex");
        const idempotencyKey = `idem_load_${workerId}_${i}_${crypto.randomBytes(4).toString("hex")}`;

        const created = await sql`
          WITH next_seq AS (
            INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
            VALUES (${seqId}, ${accountId}, ${currentYear}, 1, NOW())
            ON CONFLICT (account_id, year)
            DO UPDATE SET current_number = bill_sequences.current_number + 1, updated_at = NOW()
            RETURNING current_number
          ),
          inserted_bill AS (
            INSERT INTO bills (
              id, account_id, bill_number, idempotency_key, subtotal, taxable_amount,
              grand_total, payment_status, payment_method, status, completed_at, created_at, updated_at
            )
            SELECT
              ${testBillId}, ${accountId},
              ${prefix} || '-' || ${currentYear} || '-' || LPAD(next_seq.current_number::text, 6, '0'),
              ${idempotencyKey}, 350.00, 350.00, 350.00, 'PAID', 'UPI', 'COMPLETED',
              NOW(), NOW(), NOW()
            FROM next_seq
            RETURNING id, bill_number
          ),
          inserted_items AS (
            INSERT INTO bill_items (
              id, account_id, bill_id, item_name_snapshot, unit_price, quantity,
              line_subtotal, taxable_amount, line_total, created_at
            )
            SELECT
              ${"bli_load_" + crypto.randomBytes(6).toString("hex")}, ${accountId}, b.id,
              'Load Test Item', 175.00, 2, 350.00, 350.00, 350.00, NOW()
            FROM inserted_bill b
            RETURNING id
          ),
          inserted_link AS (
            INSERT INTO shared_bill_links (id, bill_id, token_hash, created_at)
            SELECT ${linkId}, b.id, ${tokenHash}, NOW()
            FROM inserted_bill b
            RETURNING id
          )
          SELECT id, bill_number FROM inserted_bill;
        `;
        invoiceWriteLatencies.push(Date.now() - tWrite);
        createdBillIds.push(created[0].id);

        // 5. Invoice listing page query with window count
        const t4 = Date.now();
        await sql`
          SELECT id, bill_number, grand_total, count(*) OVER()::int as total_count
          FROM bills
          WHERE account_id = ${accountId} AND status = 'COMPLETED'
          ORDER BY completed_at DESC
          LIMIT 15;
        `;
        readLatencies.push(Date.now() - t4);

      } catch (err) {
        errorCount++;
        console.error(`[Worker ${workerId} Error]`, err.message);
      }
    }
  });

  await Promise.all(workers);

  const stageDuration = (Date.now() - stageStartTime) / 1000;
  const totalOperations = readLatencies.length + invoiceWriteLatencies.length;
  const opsPerSec = (totalOperations / stageDuration).toFixed(1);

  console.log(`\n📊 STAGE RESULTS (${concurrency} users):`);
  console.log(`  - Total Completed Operations: ${totalOperations}`);
  console.log(`  - Total Stage Duration: ${stageDuration.toFixed(2)}s (${opsPerSec} ops/sec)`);
  console.log(`  - Error Count: ${errorCount} (${((errorCount / (totalOperations || 1)) * 100).toFixed(2)}%)`);
  console.log(`  - READ Latency:`);
  console.log(`      p50: ${percentile(readLatencies, 50)}ms | p95: ${percentile(readLatencies, 95)}ms | p99: ${percentile(readLatencies, 99)}ms`);
  console.log(`  - INVOICE ATOMIC WRITE Latency:`);
  console.log(`      p50: ${percentile(invoiceWriteLatencies, 50)}ms | p95: ${percentile(invoiceWriteLatencies, 95)}ms | p99: ${percentile(invoiceWriteLatencies, 99)}ms`);

  // Cleanup created test bills
  if (createdBillIds.length > 0) {
    await sql`DELETE FROM shared_bill_links WHERE bill_id = ANY(${createdBillIds}::varchar[])`;
    await sql`DELETE FROM bill_items WHERE bill_id = ANY(${createdBillIds}::varchar[])`;
    await sql`DELETE FROM bills WHERE id = ANY(${createdBillIds}::varchar[])`;
  }

  return {
    concurrency,
    totalOperations,
    durationSec: stageDuration,
    opsPerSec,
    errorCount,
    readP50: percentile(readLatencies, 50),
    readP95: percentile(readLatencies, 95),
    readP99: percentile(readLatencies, 99),
    writeP50: percentile(invoiceWriteLatencies, 50),
    writeP95: percentile(invoiceWriteLatencies, 95),
    writeP99: percentile(invoiceWriteLatencies, 99),
  };
}

async function runFullLoadBenchmark() {
  console.log("================================================================");
  console.log("       BILLyOURS PRODUCTION STAGING LOAD & STRESS BENCHMARK    ");
  console.log("================================================================");

  const accounts = await sql`
    SELECT id, business_name, invoice_prefix
    FROM business_accounts
    WHERE status = 'ACTIVE' AND (id = 'acc_demo_sharma' OR id NOT LIKE 'acc_%_%')
    ORDER BY created_at ASC
    LIMIT 1;
  `;
  const accountId = accounts[0].id;
  const prefix = (accounts[0].invoice_prefix || "BY").trim().toUpperCase();
  const currentYear = new Date().getFullYear();

  const results = [];
  results.push(await runLoadStage(10, 20, accountId, prefix, currentYear));
  results.push(await runLoadStage(25, 50, accountId, prefix, currentYear));
  results.push(await runLoadStage(50, 50, accountId, prefix, currentYear));
  results.push(await runLoadStage(100, 100, accountId, prefix, currentYear));
  results.push(await runLoadStage(200, 200, accountId, prefix, currentYear));

  console.log("\n================================================================");
  console.log("                  FINAL BENCHMARK SUMMARY TABLE                 ");
  console.log("================================================================");
  console.log("Concurrency | Ops/sec | Errors | Read p50 | Read p95 | Write p50 | Write p95");
  console.log("----------------------------------------------------------------");
  for (const r of results) {
    console.log(
      `${String(r.concurrency).padEnd(11)} | ` +
      `${String(r.opsPerSec).padEnd(7)} | ` +
      `${String(r.errorCount).padEnd(6)} | ` +
      `${String(r.readP50 + 'ms').padEnd(8)} | ` +
      `${String(r.readP95 + 'ms').padEnd(8)} | ` +
      `${String(r.writeP50 + 'ms').padEnd(9)} | ` +
      `${String(r.writeP95 + 'ms').padEnd(9)}`
    );
  }
  console.log("================================================================\n");
}

runFullLoadBenchmark()
  .then(() => {
    console.log("Load testing completed successfully.");
  })
  .catch((err) => {
    console.error("Load test failed:", err);
    process.exitCode = 1;
  });
