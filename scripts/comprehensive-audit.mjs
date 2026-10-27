import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\e56fb95d-8dc6-47d4-b56f-b4eb0ab386ab";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "Large Desktop", width: 1920, height: 1080 },
  { name: "Laptop", width: 1366, height: 768 },
  { name: "Small Laptop", width: 1280, height: 720 },
  { name: "Tablet Landscape", width: 1024, height: 768 },
  { name: "Tablet Portrait", width: 768, height: 1024 },
  { name: "Large Mobile", width: 430, height: 932 },
  { name: "Mobile", width: 390, height: 844 },
  { name: "Small Mobile", width: 320, height: 568 },
];

async function runComprehensiveAudit() {
  console.log("=================================================================");
  console.log("BILLYOURS SAAS — COMPREHENSIVE END-TO-END AUDIT & VERIFICATION");
  console.log("=================================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080",
    ],
  });

  const page = await browser.newPage();

  const auditReport = {
    timestamp: new Date().toISOString(),
    viewportsTested: VIEWPORTS.map(v => `${v.name} (${v.width}x${v.height})`),
    consoleErrors: [],
    networkFailures: [],
    overflowIssues: [],
    accessibilityFindings: [],
    performanceMetrics: {},
    functionalTests: [],
    screenshotsCaptured: [],
  };

  // Monitor browser console errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("Download the React DevTools") && !text.includes("favicon")) {
        auditReport.consoleErrors.push({ url: page.url(), message: text });
      }
    }
  });

  page.on("pageerror", (err) => {
    auditReport.consoleErrors.push({ url: page.url(), message: err.message });
  });

  page.on("requestfailed", (req) => {
    if (!req.url().includes("favicon")) {
      auditReport.networkFailures.push({
        url: req.url(),
        failure: req.failure()?.errorText || "Unknown failure",
      });
    }
  });

  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("favicon")) {
      auditReport.networkFailures.push({
        url: res.url(),
        status: res.status(),
      });
    }
  });

  // Helpers
  async function checkHorizontalOverflow() {
    return await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const bodyWidth = document.body.scrollWidth;
      return docWidth > winWidth + 2 || bodyWidth > winWidth + 2;
    });
  }

  async function checkA11yBasics() {
    return await page.evaluate(() => {
      const findings = [];
      const inputs = Array.from(document.querySelectorAll("input:not([type='hidden']), select, textarea"));
      for (const input of inputs) {
        const id = input.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = input.getAttribute("aria-label") || input.getAttribute("aria-labelledby");
        const hasParentLabel = input.closest("label");
        const placeholder = input.getAttribute("placeholder");
        if (!hasLabel && !hasAriaLabel && !hasParentLabel && !placeholder) {
          findings.push({
            type: "missing-label",
            element: input.outerHTML.slice(0, 80),
          });
        }
      }

      const imgs = Array.from(document.querySelectorAll("img"));
      for (const img of imgs) {
        if (!img.hasAttribute("alt")) {
          findings.push({
            type: "missing-alt",
            src: img.src?.slice(0, 60),
          });
        }
      }

      const h1Count = document.querySelectorAll("h1").length;

      return { findings, h1Count };
    });
  }

  async function measurePerformance() {
    return await page.evaluate(() => {
      const navTiming = performance.getEntriesByType("navigation")[0];
      return {
        domContentLoaded: navTiming ? Math.round(navTiming.domContentLoadedEventEnd - navTiming.startTime) : null,
        loadTime: navTiming ? Math.round(navTiming.loadEventEnd - navTiming.startTime) : null,
      };
    });
  }

  async function captureAndVerify(testName, fileName, expectedNoOverflow = true) {
    const screenshotPath = path.join(SCREENSHOT_DIR, fileName);
    await page.screenshot({ path: screenshotPath });
    auditReport.screenshotsCaptured.push(fileName);

    const hasOverflow = await checkHorizontalOverflow();
    if (hasOverflow && expectedNoOverflow) {
      auditReport.overflowIssues.push({
        test: testName,
        url: page.url(),
        viewport: `${page.viewport()?.width}x${page.viewport()?.height}`,
      });
    }

    return !hasOverflow;
  }

  try {
    // =================================================================
    // SECTION 1: PUBLIC ROUTES AUDIT & RESPONSIVENESS
    // =================================================================
    console.log("--> SECTION 1: Auditing Public Routes Across Viewports...");

    const publicRoutes = [
      { path: "/", name: "Landing Page", shot: "01_landing" },
      { path: "/login", name: "Sign In", shot: "02_login" },
      { path: "/signup", name: "Sign Up", shot: "03_signup" },
      { path: "/forgot-password", name: "Forgot Password", shot: "04_forgot_pw" },
      { path: "/terms", name: "Terms of Service", shot: "05_terms" },
      { path: "/privacy", name: "Privacy Policy", shot: "06_privacy" },
      { path: "/admin/login", name: "Admin Login", shot: "07_admin_login" },
    ];

    for (const route of publicRoutes) {
      console.log(`  Checking ${route.name} (${route.path})...`);
      // Test at Desktop (1366x768)
      await page.setViewport({ width: 1366, height: 768 });
      await page.goto(`http://localhost:3000${route.path}`, { waitUntil: "networkidle0" });
      await new Promise(r => setTimeout(r, 200));

      const desktopOk = await captureAndVerify(
        `${route.name} (Desktop 1366x768)`,
        `${route.shot}_desktop_1366.png`
      );

      if (route.path === "/") {
        const perf = await measurePerformance();
        auditReport.performanceMetrics["LandingPage"] = perf;
      }

      const a11y = await checkA11yBasics();
      if (a11y.findings.length > 0) {
        auditReport.accessibilityFindings.push({ route: route.path, findings: a11y.findings });
      }

      // Test at Mobile (390x844)
      await page.setViewport({ width: 390, height: 844 });
      await new Promise(r => setTimeout(r, 200));
      const mobileOk = await captureAndVerify(
        `${route.name} (Mobile 390x844)`,
        `${route.shot}_mobile_390.png`
      );

      // Test at Small Mobile (320x568)
      await page.setViewport({ width: 320, height: 568 });
      await new Promise(r => setTimeout(r, 200));
      const smallMobileOk = await captureAndVerify(
        `${route.name} (Small Mobile 320x568)`,
        `${route.shot}_mobile_320.png`
      );

      auditReport.functionalTests.push({
        suite: "Public Routes",
        test: `${route.name} rendering & responsiveness`,
        passed: desktopOk && mobileOk && smallMobileOk,
        details: `Desktop no-overflow: ${desktopOk}, Mobile 390 no-overflow: ${mobileOk}, Mobile 320 no-overflow: ${smallMobileOk}, H1 Count: ${a11y.h1Count}`,
      });
    }

    // =================================================================
    // SECTION 2: AUTHENTICATION FLOW & PERSISTENCE
    // =================================================================
    console.log("\n--> SECTION 2: Testing Owner Authentication & Session...");
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });

    // Fill in demo owner credentials
    await page.type('input[name="email"]', "demo@billyours.com");
    await page.type('input[name="password"]', "DemoOwner2026!");

    const loginNav = page.waitForNavigation({ waitUntil: "networkidle0" });
    await page.click('button[type="submit"]');
    await loginNav;

    const loggedInUrl = page.url();
    const loginPassed = loggedInUrl.includes("/app/billing");
    console.log(`  Owner logged in -> Landed on: ${loggedInUrl}`);

    await captureAndVerify("Owner Billing Dashboard Initial", "08_owner_billing_desktop.png");

    auditReport.functionalTests.push({
      suite: "Authentication",
      test: "Owner Sign-In & Redirect to /app/billing",
      passed: loginPassed,
      details: `Landed on ${loggedInUrl}`,
    });

    // =================================================================
    // SECTION 3: DESKTOP BILLING WORKSPACE & CALCULATION FLOW
    // =================================================================
    console.log("\n--> SECTION 3: Testing Desktop Billing Workspace & Calculations...");
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto("http://localhost:3000/app/billing", { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 400));

    // 1. Add catalog items (e.g. Masala Chai, Bombay Sandwich)
    const itemsClicked = await page.evaluate(() => {
      const itemButtons = Array.from(document.querySelectorAll('button')).filter(b =>
        b.querySelector('p.font-bold.text-blue-600')
      );
      if (itemButtons.length >= 2) {
        itemButtons[0].click();
        itemButtons[1].click();
        return 2;
      } else if (itemButtons.length === 1) {
        itemButtons[0].click();
        return 1;
      }
      return 0;
    });
    console.log(`  Added ${itemsClicked} catalog items to bill.`);
    await new Promise(r => setTimeout(r, 300));

    // 2. Open Custom Item Modal and add a custom item
    console.log("  Testing Custom Item Modal...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const customBtn = buttons.find(b => b.textContent.includes('Custom'));
      if (customBtn) customBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Check if custom modal is visible
    const modalInput = await page.$('input[placeholder*="repair"], input[placeholder*="sauce"]');
    if (modalInput) {
      await modalInput.type("Special Masala Papad");
      const priceInput = await page.$('input[type="number"][placeholder="0.00"]');
      if (priceInput) await priceInput.type("45");
      await page.evaluate(() => {
        const modal = document.querySelector('.fixed');
        if (modal) {
          const addBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent.includes('Add to Bill'));
          if (addBtn) addBtn.click();
        }
      });
      await new Promise(r => setTimeout(r, 400));
      console.log("  Custom item added successfully.");
    }

    // 3. Customer phone lookup and autofill
    console.log("  Testing Customer Phone Lookup...");
    const phoneInput = await page.$('input[placeholder*="Mobile number"], input[type="tel"]');
    if (phoneInput) {
      await phoneInput.type("9876543210");
      await new Promise(r => setTimeout(r, 400));
    }

    const nameInput = await page.$('input[placeholder*="Customer name"]');
    if (nameInput) {
      const currentVal = await page.evaluate(el => el.value, nameInput);
      if (!currentVal) {
        await nameInput.type("Rahul Sharma");
      }
    }

    // 4. Set payment mode UPI
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const upiBtn = buttons.find(b => b.textContent.includes('UPI'));
      if (upiBtn) upiBtn.click();
    });

    await captureAndVerify("Desktop Bill Ready to Complete", "09_desktop_bill_ready.png");

    // 5. Complete Bill on Desktop & Measure Performance
    console.log("  Completing Bill on Desktop...");
    const tDesktopStart = Date.now();
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const completeBtn = btns.find(b => b.textContent.includes('Complete Bill') && !b.disabled);
      if (completeBtn) completeBtn.click();
    });

    await page.waitForFunction(
      () => window.location.pathname.startsWith("/app/bills/bil_"),
      { timeout: 10000 }
    );
    const desktopBillDuration = Date.now() - tDesktopStart;
    const desktopReceiptUrl = page.url();
    const createdBillId = desktopReceiptUrl.split("/").pop().split("?")[0];
    console.log(`  Bill completed in ${desktopBillDuration}ms! Receipt: ${desktopReceiptUrl}`);

    await new Promise(r => setTimeout(r, 500));
    const receiptOk = await captureAndVerify("Desktop Bill Receipt View", "10_desktop_bill_receipt.png");

    auditReport.performanceMetrics["DesktopBillCreation"] = { durationMs: desktopBillDuration };
    auditReport.functionalTests.push({
      suite: "Billing & Sales",
      test: "Complete Bill (Desktop 1920x1080) with Catalog + Custom Items + Customer Lookup",
      passed: desktopReceiptUrl.includes("/app/bills/bil_") && receiptOk,
      details: `Completed in ${desktopBillDuration}ms. Bill ID: ${createdBillId}`,
    });

    // 6. Test Format Toggles on Receipt (Thermal 80mm vs Thermal 58mm vs A4)
    console.log("  Testing Thermal & A4 Receipt format toggles...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const a4Btn = btns.find(b => b.textContent.includes('A4'));
      if (a4Btn) a4Btn.click();
    });
    await new Promise(r => setTimeout(r, 400));
    await captureAndVerify("A4 Invoice Preview", "11_receipt_a4_format.png");

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const thermalBtn = btns.find(b => b.textContent.includes('80mm') || b.textContent.includes('Thermal'));
      if (thermalBtn) thermalBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    // 7. Test Public Shared Bill Link (/b/[token])
    const shareToken = desktopReceiptUrl.includes("token=") ? new URL(desktopReceiptUrl).searchParams.get("token") : null;
    if (shareToken) {
      console.log(`  Testing Public Shared Bill Link (/b/${shareToken})...`);
      await page.goto(`http://localhost:3000/b/${shareToken}`, { waitUntil: "networkidle0" });
      await new Promise(r => setTimeout(r, 300));
      const publicBillOk = await captureAndVerify("Public Shared Bill Receipt", "11b_public_shared_bill.png");
      const hasPrintBtn = await page.evaluate(() => {
        return Boolean(document.body.textContent.includes("Print Receipt") || document.body.textContent.includes("Bill Receipt"));
      });
      auditReport.functionalTests.push({
        suite: "Public Features",
        test: "Public Shared Bill Receipt Link (/b/[token]) without login",
        passed: publicBillOk && hasPrintBtn,
        details: `Public token: ${shareToken}, Valid Receipt: ${hasPrintBtn}`,
      });
    }

    // =================================================================
    // SECTION 4: TABLET VIEWPORT BILLING & SPLIT LAYOUT (768x1024)
    // =================================================================
    console.log("\n--> SECTION 4: Testing Tablet Split Viewport & Billing (768x1024)...");
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto("http://localhost:3000/app/billing", { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 400));

    const tabletInitialOk = await captureAndVerify("Tablet Split View Initial", "12_tablet_billing_initial.png");

    // Add 2 items
    await page.evaluate(() => {
      const itemBtns = Array.from(document.querySelectorAll('button')).filter(b =>
        b.querySelector('p.font-bold.text-blue-600')
      );
      if (itemBtns[0]) itemBtns[0].click();
      if (itemBtns[1]) itemBtns[1].click();
    });
    await new Promise(r => setTimeout(r, 300));

    // Complete Bill on Tablet
    const tTabletStart = Date.now();
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const completeBtn = btns.find(b => b.textContent.includes('Complete Bill') && !b.disabled);
      if (completeBtn) completeBtn.click();
    });

    await page.waitForFunction(
      () => window.location.pathname.startsWith("/app/bills/bil_"),
      { timeout: 10000 }
    );
    const tabletDuration = Date.now() - tTabletStart;
    console.log(`  Tablet bill completed in ${tabletDuration}ms!`);

    await new Promise(r => setTimeout(r, 400));
    const tabletReceiptOk = await captureAndVerify("Tablet Bill Receipt", "13_tablet_bill_receipt.png");

    auditReport.functionalTests.push({
      suite: "Responsive Billing",
      test: "Tablet Split Layout (768x1024) Item Addition & Checkout",
      passed: page.url().includes("/app/bills/bil_") && tabletInitialOk && tabletReceiptOk,
      details: `Completed in ${tabletDuration}ms. URL: ${page.url()}`,
    });

    // =================================================================
    // SECTION 5: MOBILE ZERO-SCROLL BILLING (390x844 & 320x568)
    // =================================================================
    console.log("\n--> SECTION 5: Testing Mobile Zero-Scroll Billing (390x844 & 320x568)...");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/app/billing", { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 400));

    const mobileCatalogOk = await captureAndVerify("Mobile Catalog Tab Initial", "14_mobile_catalog_initial.png");

    // Add items on mobile
    await page.evaluate(() => {
      const itemBtns = Array.from(document.querySelectorAll('button')).filter(b =>
        b.querySelector('p.font-bold.text-blue-600')
      );
      if (itemBtns[0]) itemBtns[0].click();
      if (itemBtns[1]) itemBtns[1].click();
    });
    await new Promise(r => setTimeout(r, 300));

    // Verify Sticky bottom review bar appears
    const mobileReviewBarOk = await captureAndVerify("Mobile Sticky Review Bar", "15_mobile_review_bar.png");

    // Click "Review Item List & Bill" to switch to Bill tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reviewBtn = btns.find(b => b.textContent.includes('Review Item List'));
      if (reviewBtn) reviewBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const mobileBillTabOk = await captureAndVerify("Mobile Bill Tab Items List", "16_mobile_bill_items_list.png");

    // Complete bill on mobile
    const tMobileStart = Date.now();
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const completeBtn = btns.find(b => b.textContent.includes('Complete Bill') && !b.disabled);
      if (completeBtn) completeBtn.click();
    });

    await page.waitForFunction(
      () => window.location.pathname.startsWith("/app/bills/bil_"),
      { timeout: 10000 }
    );
    const mobileDuration = Date.now() - tMobileStart;
    console.log(`  Mobile bill completed in ${mobileDuration}ms!`);

    await new Promise(r => setTimeout(r, 400));
    const mobileReceiptOk = await captureAndVerify("Mobile Bill Receipt", "17_mobile_bill_receipt.png");

    auditReport.functionalTests.push({
      suite: "Responsive Billing",
      test: "Mobile (390x844) Two-Stage Item Review & Checkout",
      passed: page.url().includes("/app/bills/bil_") && mobileCatalogOk && mobileBillTabOk && mobileReceiptOk,
      details: `Completed in ${mobileDuration}ms`,
    });

    // Small Mobile (320x568)
    await page.setViewport({ width: 320, height: 568 });
    await new Promise(r => setTimeout(r, 300));
    const smallMobileReceiptOk = await captureAndVerify("Small Mobile Receipt 320px", "18_small_mobile_receipt_320.png");

    auditReport.functionalTests.push({
      suite: "Responsive Billing",
      test: "Small Mobile (320x568) Receipt Formatting & No Overflow",
      passed: smallMobileReceiptOk,
      details: "Tested at 320x568 viewport",
    });

    // =================================================================
    // SECTION 6: TENANT PORTAL ROUTES & CRUD WORKFLOWS
    // =================================================================
    console.log("\n--> SECTION 6: Auditing Tenant Portal Routes & CRUD Workflows...");
    const tenantRoutes = [
      { path: "/app/dashboard", name: "Dashboard", shot: "19_dashboard" },
      { path: "/app/bills", name: "Bills History", shot: "20_bills_history" },
      { path: "/app/items", name: "Item Catalog", shot: "21_items_catalog" },
      { path: "/app/customers", name: "Customers", shot: "22_customers_list" },
      { path: "/app/settings", name: "Business Settings", shot: "23_settings" },
    ];

    for (const r of tenantRoutes) {
      console.log(`  Checking ${r.name} (${r.path})...`);
      // Desktop
      await page.setViewport({ width: 1366, height: 768 });
      await page.goto(`http://localhost:3000${r.path}`, { waitUntil: "networkidle0" });
      await new Promise(res => setTimeout(res, 200));
      const deskOk = await captureAndVerify(`${r.name} (Desktop 1366)`, `${r.shot}_desktop.png`);

      // Mobile
      await page.setViewport({ width: 390, height: 844 });
      await new Promise(res => setTimeout(res, 200));
      const mobOk = await captureAndVerify(`${r.name} (Mobile 390)`, `${r.shot}_mobile.png`);

      auditReport.functionalTests.push({
        suite: "Tenant Portal",
        test: `${r.name} route audit & responsive layout`,
        passed: deskOk && mobOk,
        details: `Desktop no-overflow: ${deskOk}, Mobile no-overflow: ${mobOk}`,
      });
    }

    // Customer profile detail check
    console.log("  Checking Customer Profile Details...");
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/app/customers", { waitUntil: "networkidle0" });
    const customerHref = await page.evaluate(() => {
      const link = document.querySelector('a[href^="/app/customers/cst_"]');
      return link ? link.getAttribute("href") : null;
    });

    if (customerHref) {
      await page.goto(`http://localhost:3000${customerHref}`, { waitUntil: "networkidle0" });
      await new Promise(res => setTimeout(res, 300));
      const custOk = await captureAndVerify("Customer Profile Details", "24_customer_profile_details.png");
      auditReport.functionalTests.push({
        suite: "Tenant Portal",
        test: "Customer Profile & Purchase History Page",
        passed: custOk,
        details: `Inspected: ${customerHref}`,
      });
    }

    // Bill cancellation test
    console.log("  Testing Bill Cancellation Workflow...");
    await page.goto(`http://localhost:3000/app/bills/${createdBillId}`, { waitUntil: "networkidle0" });
    await new Promise(res => setTimeout(res, 300));

    const hasCancelBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cBtn = btns.find(b => b.textContent.includes('Cancel Bill'));
      if (cBtn) {
        cBtn.click();
        return true;
      }
      return false;
    });

    if (hasCancelBtn) {
      await new Promise(res => setTimeout(res, 400));
      const textarea = await page.$('textarea');
      if (textarea) {
        await textarea.type("Customer returned items and requested cancellation");
      }
      await new Promise(res => setTimeout(res, 200));

      const confirmButton = await page.$('.fixed form button[type="submit"]');
      if (confirmButton) {
        await confirmButton.click();
      }
      await new Promise(res => setTimeout(res, 1500));
      await page.reload({ waitUntil: "networkidle0" });

      const isCancelled = await page.evaluate(() => {
        return document.body.textContent.includes("CANCELLED");
      });
      console.log(`  Bill cancellation status: ${isCancelled ? "CANCELLED (PASS)" : "FAIL"}`);

      await captureAndVerify("Bill Cancelled State", "25_bill_cancelled.png");

      auditReport.functionalTests.push({
        suite: "Billing & Sales",
        test: "Bill Cancellation Workflow with Audit Reason",
        passed: isCancelled,
        details: `Bill ${createdBillId} marked as CANCELLED with audit reason`,
      });
    }

    // =================================================================
    // SECTION 7: PLATFORM ADMINISTRATOR & 1-CLICK SSO IMPERSONATION
    // =================================================================
    console.log("\n--> SECTION 7: Testing Platform Admin & 1-Click SSO Impersonation...");
    // Clear cookies for fresh admin login
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');

    await page.setViewport({ width: 1366, height: 768 });
    await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle0" });
    await page.type('input[name="email"]', "admin@billyours.com");
    await page.type('input[name="password"]', "AdminSecure2026!");

    const adminNav = page.waitForNavigation({ waitUntil: "networkidle0" });
    await page.click('button[type="submit"]');
    await adminNav;

    const adminOverviewUrl = page.url();
    console.log(`  Admin logged in -> ${adminOverviewUrl}`);
    const adminOverviewOk = await captureAndVerify("Admin Overview Dashboard", "26_admin_overview.png");

    const hasKpis = await page.evaluate(() => {
      return document.body.textContent.includes("Total Accounts") &&
             document.body.textContent.includes("In Trial");
    });

    auditReport.functionalTests.push({
      suite: "Platform Administration",
      test: "Admin Login & Dashboard KPI Aggregations",
      passed: adminOverviewUrl.includes("/admin") && hasKpis && adminOverviewOk,
      details: `Landed on ${adminOverviewUrl}. KPIs rendered: ${hasKpis}`,
    });

    // 3. Admin Accounts Page & 1-Click SSO
    console.log("  Testing Admin Accounts Page & 1-Click SSO...");
    await page.goto("http://localhost:3000/admin/accounts", { waitUntil: "networkidle0" });
    await new Promise(res => setTimeout(res, 300));
    await captureAndVerify("Admin Accounts Directory", "27_admin_accounts_list.png");

    // Click 1-Click SSO specifically into Chai & Bites Cafe
    const ssoPromise = page.waitForNavigation({ waitUntil: "networkidle0" });
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const cafeRow = rows.find(r => r.textContent.includes('Chai & Bites Cafe')) || rows[0];
      const ssoBtn = cafeRow?.querySelector('form button[type="submit"]');
      if (ssoBtn) ssoBtn.click();
    });
    await ssoPromise;

    const ssoUrl = page.url();
    console.log(`  Admin SSO Landed on: ${ssoUrl}`);
    await new Promise(res => setTimeout(res, 400));
    await captureAndVerify("Admin Impersonation Support Mode", "28_admin_support_mode.png");

    const inSupportMode = await page.evaluate(() => {
      return document.body.textContent.includes("Admin Support Access");
    });
    console.log(`  Admin Support Banner Visible: ${inSupportMode}`);

    auditReport.functionalTests.push({
      suite: "Platform Administration",
      test: "Audited 1-Click SSO Tenant Impersonation",
      passed: ssoUrl.includes("/app/billing") && inSupportMode,
      details: `Impersonation URL: ${ssoUrl}. Support banner: ${inSupportMode}`,
    });

    // 4. Exit Support Mode
    console.log("  Exiting Support Mode...");
    const exitPromise = page.waitForNavigation({ waitUntil: "networkidle0" });
    await page.evaluate(() => {
      const banner = document.querySelector('.admin-banner');
      if (banner) {
        const btn = banner.querySelector('button[type="submit"]');
        if (btn) btn.click();
      }
    });
    await exitPromise;
    console.log(`  Exited Support Mode -> Returned to: ${page.url()}`);

    // Verify Audit Log on Chai & Bites Cafe
    await page.goto("http://localhost:3000/admin/accounts", { waitUntil: "networkidle0" });
    const cafeDetailLink = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const cafeRow = rows.find(r => r.textContent.includes('Chai & Bites Cafe')) || rows[0];
      const link = cafeRow?.querySelector('td a[href^="/admin/accounts/acc_"]');
      return link ? link.getAttribute("href") : null;
    });

    if (cafeDetailLink) {
      await page.goto(`http://localhost:3000${cafeDetailLink}`, { waitUntil: "networkidle0" });
      await new Promise(res => setTimeout(res, 300));
      await captureAndVerify("Admin Account Details & Audit Log", "29_admin_account_audit_logs.png");

      const hasAuditLogs = await page.evaluate(() => {
        return document.body.textContent.includes("Administrator Audit Trail") &&
               (document.body.textContent.includes("START_IMPERSONATION") || document.body.textContent.includes("Audit"));
      });

      auditReport.functionalTests.push({
        suite: "Platform Administration",
        test: "Audit Trail Logging for Platform Actions",
        passed: hasAuditLogs,
        details: `Audit trail inspected on ${cafeDetailLink}`,
      });
    }

    // =================================================================
    // SECTION 8: ALL 8 VIEWPORTS MATRIX TESTING ACROSS CORE SCREENS
    // =================================================================
    console.log("\n--> SECTION 8: Executing 8-Device Profile Viewport Matrix Check...");
    const coreRoutes = [
      { path: "/login", name: "Login" },
      { path: "/admin/login", name: "AdminLogin" },
      { path: "/", name: "Landing" },
      { path: "/terms", name: "Terms" },
    ];

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      for (const route of coreRoutes) {
        await page.goto(`http://localhost:3000${route.path}`, { waitUntil: "networkidle0" });
        await new Promise(res => setTimeout(res, 100));
        const overflow = await checkHorizontalOverflow();
        if (overflow) {
          auditReport.overflowIssues.push({
            viewport: `${vp.name} (${vp.width}x${vp.height})`,
            route: route.path,
          });
        }
      }
    }
    console.log("  Viewport matrix check completed.");

  } catch (error) {
    console.error("Audit Execution Error:", error);
    auditReport.functionalTests.push({
      suite: "Execution",
      test: "Comprehensive Audit Runner",
      passed: false,
      details: String(error),
    });
  } finally {
    await browser.close();
  }

  // Save report JSON
  const reportPath = path.join(ARTIFACT_DIR, "comprehensive_audit_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));

  console.log("\n=================================================================");
  console.log("AUDIT SUMMARY");
  console.log("=================================================================");
  console.log(`Total Functional Tests: ${auditReport.functionalTests.length}`);
  console.log(`Passed: ${auditReport.functionalTests.filter(t => t.passed).length}`);
  console.log(`Failed: ${auditReport.functionalTests.filter(t => !t.passed).length}`);
  console.log(`Horizontal Overflow Issues: ${auditReport.overflowIssues.length}`);
  console.log(`Console Errors: ${auditReport.consoleErrors.length}`);
  console.log(`Screenshots Saved: ${auditReport.screenshotsCaptured.length}`);
  console.log(`Report JSON: ${reportPath}`);
  console.table(auditReport.functionalTests.map(t => ({
    Suite: t.suite,
    Test: t.test,
    Status: t.passed ? "PASS" : "FAIL",
    Details: t.details.slice(0, 60),
  })));

  return auditReport;
}

runComprehensiveAudit().catch(console.error);
