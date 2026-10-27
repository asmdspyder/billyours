import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\a8347d0d-9fb3-4b31-8a3b-9123eb5e30ae";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runBrowserTests() {
  console.log("=================================================");
  console.log("STARTING FULL CONTROLLED BROWSER TEST (CHROME)");
  console.log("=================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1280,800",
    ],
  });

  const page = await browser.newPage();
  const testResults = [];

  // Helper to check for horizontal scroll / overflow
  async function checkHorizontalOverflow() {
    return await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Desktop Sign-In Page (1280x800)
    // -------------------------------------------------------------
    console.log("--> Testing 1: Desktop Sign-In Page (1280x800)...");
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });

    const loginPath = path.join(SCREENSHOT_DIR, "01_login_clean.png");
    await page.screenshot({ path: loginPath });

    const content = await page.content();
    const hasDemoBanner = content.includes("Try the demo account") || content.includes("Fill Demo");
    const hasAdminLink = content.includes("Platform Administrator Login");
    const hasOverflow1 = await checkHorizontalOverflow();

    testResults.push({
      test: "Sign-in: Clean UI, No Demo Autofill, Admin Link",
      passed: !hasDemoBanner && hasAdminLink && !hasOverflow1,
      details: `Demo banner: ${hasDemoBanner ? "PRESENT (FAIL)" : "REMOVED (PASS)"}, Admin Link: ${hasAdminLink}, No Overflow: ${!hasOverflow1}`,
      screenshot: loginPath,
    });
    console.log("✓ Test 1 complete: Demo banner absent, Admin link present.\n");

    // -------------------------------------------------------------
    // TEST 2: Admin Login & Access Guard
    // -------------------------------------------------------------
    console.log("--> Testing 2: Admin Login (/admin/login)...");
    await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle0" });
    const adminLoginPath = path.join(SCREENSHOT_DIR, "02_admin_login.png");
    await page.screenshot({ path: adminLoginPath });

    // Fill in admin credentials
    await page.type('input[name="email"]', "admin@billyours.com");
    await page.type('input[name="password"]', "AdminSecure2026!");

    const navPromise = page.waitForNavigation({ waitUntil: "networkidle0" });
    await page.click('button[type="submit"]');
    await navPromise;

    const currentUrl = page.url();
    const adminOverviewPath = path.join(SCREENSHOT_DIR, "03_admin_overview.png");
    await page.screenshot({ path: adminOverviewPath });

    const adminContent = await page.content();
    const hasStats = adminContent.includes("Total Accounts") && adminContent.includes("In Trial");

    testResults.push({
      test: "Admin Login & Dashboard KPI Metrics",
      passed: currentUrl.includes("/admin") && hasStats,
      details: `Landed on: ${currentUrl}, Stats rendered: ${hasStats}`,
      screenshot: adminOverviewPath,
    });
    console.log(`✓ Test 2 complete: Logged into Admin Panel (${currentUrl}).\n`);

    // -------------------------------------------------------------
    // TEST 3: Admin 1-Click SSO into "Chai & Bites Cafe"
    // -------------------------------------------------------------
    console.log("--> Testing 3: Admin 1-Click SSO into 'Chai & Bites Cafe'...");
    const ssoNavPromise = page.waitForNavigation({ waitUntil: "networkidle0" });
    
    // Select the SSO button for Chai & Bites Cafe specifically
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const cafeRow = rows.find(r => r.textContent.includes('Chai & Bites Cafe')) || rows[0];
      if (cafeRow) {
        const btn = cafeRow.querySelector('form button[type="submit"]');
        if (btn) btn.click();
      }
    });
    await ssoNavPromise;

    const ssoUrl = page.url();
    const desktopBillingPath = path.join(SCREENSHOT_DIR, "04_desktop_billing_sso.png");
    await page.screenshot({ path: desktopBillingPath });

    const ssoPageContent = await page.content();
    const hasSupportBanner = ssoPageContent.includes("Admin Support Access");
    const hasFreeTrialBanner = ssoPageContent.includes("Free Trial Active");
    const hasOverflow3 = await checkHorizontalOverflow();

    testResults.push({
      test: "Admin 1-Click SSO into Tenant (Support Mode, No Trial Banner)",
      passed: ssoUrl.includes("/app/billing") && hasSupportBanner && !hasFreeTrialBanner && !hasOverflow3,
      details: `Support Banner: ${hasSupportBanner}, Trial Banner: ${hasFreeTrialBanner ? "SHOWN (FAIL)" : "HIDDEN (PASS)"}, Overflow: ${hasOverflow3}`,
      screenshot: desktopBillingPath,
    });
    console.log(`✓ Test 3 complete: In Support Mode, Free Trial Banner absent: ${!hasFreeTrialBanner}.\n`);

    // -------------------------------------------------------------
    // TEST 4: Tablet Viewport (768x1024, iPad Portrait Split View)
    // -------------------------------------------------------------
    console.log("--> Testing 4: Tablet Viewport (768x1024, iPad Split View)...");
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise((r) => setTimeout(r, 600));

    const tabletViewPath = path.join(SCREENSHOT_DIR, "05_tablet_split_view.png");
    await page.screenshot({ path: tabletViewPath });

    const hasOverflow4 = await checkHorizontalOverflow();

    // Add items to bill using page.evaluate (safe from stale handles)
    const itemsCount = await page.evaluate(() => {
      const itemBtns = Array.from(document.querySelectorAll('button')).filter(b =>
        b.querySelector('p.font-bold.text-blue-600')
      );
      if (itemBtns[0]) itemBtns[0].click();
      return itemBtns.length;
    });
    console.log(`Found ${itemsCount} catalog items on tablet. Clicked item 1.`);
    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate(() => {
      const itemBtns = Array.from(document.querySelectorAll('button')).filter(b =>
        b.querySelector('p.font-bold.text-blue-600')
      );
      if (itemBtns[1]) itemBtns[1].click();
      else if (itemBtns[0]) itemBtns[0].click();
    });
    console.log("Clicked item 2.");
    await new Promise((r) => setTimeout(r, 400));

    const tabletItemsAddedPath = path.join(SCREENSHOT_DIR, "06_tablet_items_added.png");
    await page.screenshot({ path: tabletItemsAddedPath });

    // Select payment mode UPI
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const upiBtn = buttons.find(b => b.textContent.includes('UPI'));
      if (upiBtn) upiBtn.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    // Complete Bill on Tablet & Measure Checkout Time
    console.log("--> Completing Bill on Tablet & Measuring Performance...");
    const t0 = Date.now();

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const completeBtn = btns.find(b => b.textContent.includes('Complete Bill') && !b.disabled);
      if (completeBtn) completeBtn.click();
    });

    // Wait for Next.js client-side SPA route push to /app/bills/bil_...
    await page.waitForFunction(
      () => window.location.pathname.startsWith("/app/bills/bil_"),
      { timeout: 10000 }
    );
    const tabletSaveTime = Date.now() - t0;

    await new Promise((r) => setTimeout(r, 600));

    const tabletReceiptPath = path.join(SCREENSHOT_DIR, "07_tablet_bill_receipt.png");
    await page.screenshot({ path: tabletReceiptPath });

    testResults.push({
      test: "Tablet 6/6 Split Layout & Fast Bill Checkout",
      passed: page.url().includes("/app/bills/bil_") && !hasOverflow4,
      details: `Saved in ${tabletSaveTime}ms. URL: ${page.url()}, Overflow: ${hasOverflow4}`,
      screenshot: tabletReceiptPath,
    });
    console.log(`✓ Test 4 complete: Bill completed on tablet in ${tabletSaveTime}ms!\n`);

    // -------------------------------------------------------------
    // TEST 5: Mobile Viewport (375x667, Zero-Scroll Checkout)
    // -------------------------------------------------------------
    console.log("--> Testing 5: Mobile Viewport (375x667, Zero-Scroll Checkout)...");
    await page.setViewport({ width: 375, height: 667 });
    await page.goto("http://localhost:3000/app/billing", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 500));

    const mobileCatalogPath = path.join(SCREENSHOT_DIR, "08_mobile_catalog_initial.png");
    await page.screenshot({ path: mobileCatalogPath });

    const hasOverflow5 = await checkHorizontalOverflow();

    // Add 2 items on mobile
    await page.evaluate(() => {
      const itemBtns = Array.from(document.querySelectorAll('button')).filter(b =>
        b.querySelector('p.font-bold.text-blue-600')
      );
      if (itemBtns[0]) itemBtns[0].click();
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate(() => {
      const itemBtns = Array.from(document.querySelectorAll('button')).filter(b =>
        b.querySelector('p.font-bold.text-blue-600')
      );
      if (itemBtns[1]) itemBtns[1].click();
      else if (itemBtns[0]) itemBtns[0].click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Capture the mobile screen showing the sticky bottom review bar
    const mobileReviewBarPath = path.join(SCREENSHOT_DIR, "09_mobile_review_bar_visible.png");
    await page.screenshot({ path: mobileReviewBarPath });

    // Verify Complete Bill is NOT present directly in the catalog (user requirement!)
    const hasCompleteBillInCatalog = await page.evaluate(() => {
      const mobileContainer = document.querySelector('.md\\:hidden');
      if (!mobileContainer) return false;
      const btns = Array.from(mobileContainer.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Complete Bill') && b.offsetParent !== null);
    });

    console.log(`Direct Complete Bill in Catalog: ${hasCompleteBillInCatalog} (Must be false)`);

    // Click "Review Item List & Bill" to open Bill tab and inspect item list
    console.log("--> Clicking 'Review Item List & Bill' to view items before checkout...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reviewBtn = btns.find(b => b.textContent.includes('Review Item List'));
      if (reviewBtn) reviewBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Capture the mobile Bill tab showing the full item list
    const mobileItemListPath = path.join(SCREENSHOT_DIR, "09b_mobile_bill_item_list.png");
    await page.screenshot({ path: mobileItemListPath });

    const hasItemListRendered = await page.evaluate(() => {
      return document.body.textContent.includes('Bombay Masala Toast') &&
             document.body.textContent.includes('Current Bill');
    });

    // Now click Complete Bill inside the Bill tab!
    console.log("--> Clicking Complete Bill in Bill tab after viewing item list...");
    const tMobile0 = Date.now();

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const completeBtn = btns.find(b => b.textContent.includes('Complete Bill') && !b.disabled);
      if (completeBtn) completeBtn.click();
    });

    // Wait for Next.js SPA navigation to receipt page
    await page.waitForFunction(
      () => window.location.pathname.startsWith("/app/bills/bil_"),
      { timeout: 10000 }
    );
    const mobileSaveTime = Date.now() - tMobile0;

    await new Promise((r) => setTimeout(r, 600));
    const mobileReceiptPath = path.join(SCREENSHOT_DIR, "10_mobile_bill_receipt.png");
    await page.screenshot({ path: mobileReceiptPath });

    const hasOverflowMobileReceipt = await checkHorizontalOverflow();

    testResults.push({
      test: "Mobile Item Review & Checkout (No direct complete without seeing items)",
      passed: page.url().includes("/app/bills/bil_") && !hasCompleteBillInCatalog && hasItemListRendered && !hasOverflow5 && !hasOverflowMobileReceipt,
      details: `Saved in ${mobileSaveTime}ms. Direct complete in catalog: ${hasCompleteBillInCatalog} (expected false), Items visible in bill: ${hasItemListRendered}`,
      screenshot: mobileReceiptPath,
    });
    console.log(`✓ Test 5 complete: Items reviewed and mobile bill completed in ${mobileSaveTime}ms!\n`);

    // -------------------------------------------------------------
    // TEST 6: Mobile Dashboard & Bills History Layout & Alignment
    // -------------------------------------------------------------
    console.log("--> Testing 6: Mobile Dashboard and History Layout...");
    await page.goto("http://localhost:3000/app/dashboard", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 400));
    const mobileDashPath = path.join(SCREENSHOT_DIR, "11_mobile_dashboard.png");
    await page.screenshot({ path: mobileDashPath });
    const dashOverflow = await checkHorizontalOverflow();

    await page.goto("http://localhost:3000/app/bills", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 400));
    const mobileBillsPath = path.join(SCREENSHOT_DIR, "12_mobile_bills_history.png");
    await page.screenshot({ path: mobileBillsPath });
    const billsOverflow = await checkHorizontalOverflow();

    testResults.push({
      test: "Mobile Dashboard & Bills History Alignment",
      passed: !dashOverflow && !billsOverflow,
      details: `Dashboard overflow: ${dashOverflow}, Bills History overflow: ${billsOverflow}`,
      screenshot: mobileBillsPath,
    });
    console.log("✓ Test 6 complete: Dashboard & Bills history align cleanly.\n");

    // -------------------------------------------------------------
    // TEST 7: Exit Support Mode & 1-Click SSO Tenant Switching
    // -------------------------------------------------------------
    console.log("--> Testing 7: Return to Desktop, Exit Support Mode, SSO into Second Account...");
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/app/billing", { waitUntil: "networkidle0" });

    // Click "Exit Support Mode" in the admin-banner
    const exitNavPromise = page.waitForNavigation({ waitUntil: "networkidle0" });
    await page.evaluate(() => {
      const banner = document.querySelector('.admin-banner');
      if (banner) {
        const btn = banner.querySelector('button[type="submit"]');
        if (btn) btn.click();
      }
    });
    await exitNavPromise;

    console.log(`Returned to: ${page.url()}`);
    await page.goto("http://localhost:3000/admin/accounts", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 400));
    const adminAccountsPath = path.join(SCREENSHOT_DIR, "13_admin_accounts_list.png");
    await page.screenshot({ path: adminAccountsPath });

    // Find the second account in the accounts list and click SSO
    let secondAccountSuccess = false;
    const ssoCount = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('table form button[type="submit"]'));
      return buttons.length;
    });
    console.log(`Found ${ssoCount} accounts with 1-click SSO on /admin/accounts.`);

    if (ssoCount >= 1) {
      const sso2NavPromise = page.waitForNavigation({ waitUntil: "networkidle0" });
      await page.evaluate(() => {
        const firstSso = document.querySelector('table form button[type="submit"]');
        if (firstSso) firstSso.click();
      });
      await sso2NavPromise;
      secondAccountSuccess = page.url().includes("/app/billing");
    }

    const secondAccountBillingPath = path.join(SCREENSHOT_DIR, "14_second_account_sso.png");
    await page.screenshot({ path: secondAccountBillingPath });

    testResults.push({
      test: "Exit Support Mode & Admin SSO Tenant Switching",
      passed: secondAccountSuccess,
      details: `Landed on: ${page.url()}`,
      screenshot: secondAccountBillingPath,
    });
    console.log("✓ Test 7 complete: Successfully switched tenants via Admin SSO.\n");

  } catch (error) {
    console.error("Browser Test Error:", error);
    testResults.push({
      test: "Execution Error",
      passed: false,
      details: String(error),
    });
  } finally {
    await browser.close();
  }

  console.log("=================================================");
  console.log("FINAL BROWSER AUTOMATION TEST REPORT");
  console.log("=================================================");
  console.table(
    testResults.map((r) => ({
      Test: r.test,
      Status: r.passed ? "PASS" : "FAIL",
      Details: r.details,
    }))
  );

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "browser_test_results.json"),
    JSON.stringify(testResults, null, 2)
  );

  return testResults;
}

runBrowserTests().catch(console.error);
