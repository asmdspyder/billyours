# BillYours — Full-Stack Multi-Tenant Billing SaaS

> **Simple billing for every business.**  
> Add items. Create a bill. Print or share it. Track your sales.

BillYours is a fast, lightweight, production-ready billing and invoicing SaaS application built specifically for small businesses in India (local grocery & retail shops, salons & spas, cafes & restaurants, and service businesses).

---

## 🔑 Demo & Admin Credentials

The database has been seeded with live demo data and administrative access:

### 1. Platform Administrator
- **Login URL**: `/admin/login` or `/login`
- **Email**: `admin@billyours.com`
- **Password**: `AdminSecure2026!`
- **Role**: `ADMIN`
- **Capabilities**: View platform metrics, inspect all tenant accounts, create accounts manually, extend/modify trial & subscription dates, suspend/archive accounts, and **Open Account (Audited Impersonation)**.

### 2. Demo Business Owner (Sharma General Store)
- **Login URL**: `/login` *(use the one-click "Fill Demo" button)*
- **Email**: `demo@billyours.com`
- **Password**: `DemoOwner2026!`
- **Business**: `Sharma General Store` (Active 7-Day Free Trial)
- **Pre-seeded data**: 10 active catalog items, 3 registered customers, and 3 sequential bills with historical line-item snapshots and UPI/Cash payment records.

---

## 🛠️ Technology Stack & Architecture

- **Framework**: Next.js 15 (App Router, React 19, Server Components & Client Components).
- **Language**: TypeScript with strict type checking.
- **Styling**: Tailwind CSS with custom brand palette & accessible UI primitives.
- **Database**: Neon Serverless PostgreSQL with pooler connection.
- **ORM & Migrations**: Drizzle ORM (`drizzle-orm` + `drizzle-kit`).
- **Icons**: Lucide Icons.
- **Authentication & Sessions**: Database-backed sessions stored in PostgreSQL with SHA-256 token hashing, HTTP-only secure cookies, and platform admin role guards.
- **Printing**: Native browser print styling (`@media print`) supporting **58mm and 80mm thermal POS receipt printers** and **A4 invoices**.
- **Sharing**: WhatsApp Click to Chat integration (`wa.me`) and secure bearer token shared links (`/b/[token]`).

---

## 🏛️ Key Architectural Principles

1. **Simplicity First**: Not an ERP or complicated accounting package. The primary billing screen (`/app/billing`) is optimized for speed (10-second bill creation).
2. **Server-Authoritative Calculations**: Totals, discounts, and optional tax amounts are recalculated on the server using strict decimal arithmetic (`src/lib/billing-calculations.ts`). Client totals are never trusted.
3. **Strict Multi-Tenant Isolation**:
   - Every business record is scoped to its `accountId`.
   - All server actions and queries enforce tenant authorization.
   - Foreign key and composite uniqueness constraints prevent cross-tenant referencing.
   - Comprehensive test suite proves cross-tenant access rejection (`tests/tenant-isolation.test.mjs`).
4. **Historical Price & Item Snapshots**:
   - Catalog item edits or price changes never alter historical bills.
   - Line items preserve frozen snapshot names, unit prices, quantities, and line subtotals.
5. **Atomic Sequential Bill Numbering**:
   - Bill numbers (e.g. `BY-2026-000001`) are allocated atomically in PostgreSQL via `bill_sequences` with upsert locks to eliminate race conditions under concurrent requests.
6. **Audited Platform Impersonation**:
   - Platform admins can open any tenant account in support mode.
   - Displays a persistent amber banner (`Admin Support Access`).
   - Every action and impersonation session is logged in `admin_audit_logs`.
7. **Optional Manual Percentage GST / Tax**:
   - Intentionally simple MVP toggle (5%, 12%, 18% presets or custom rate).
   - Documented limitation: Does not claim full GST compliance, e-invoicing, or HSN classification.

---

## 📁 Project Structure

```
├── drizzle/                    # Generated database migrations
├── scripts/
│   ├── seed.mjs                # Database seeder (Admin, Demo Shop, Items, Bills)
│   └── test-db.mjs             # Database connectivity tester
├── src/
│   ├── actions/                # Server Actions (Mutations)
│   │   ├── admin-actions.ts    # Account management & audited impersonation
│   │   ├── auth-actions.ts     # Login, signup, logout
│   │   ├── billing-actions.ts  # Complete bill, cancel bill, customer phone lookup
│   │   ├── catalog-actions.ts  # Add, edit, archive catalog items
│   │   ├── customer-actions.ts # Add, edit, archive customers
│   │   └── settings-actions.ts # Update business details & bill preferences
│   ├── app/                    # Next.js App Router
│   │   ├── (public)
│   │   │   ├── page.tsx        # High-conversion marketing landing page
│   │   │   ├── login/          # Business owner sign in
│   │   │   ├── signup/         # Free trial registration
│   │   │   ├── forgot-password/# Password reset request
│   │   │   ├── reset-password/ # Complete password reset
│   │   │   ├── privacy/        # Privacy policy
│   │   │   ├── terms/          # Terms of service
│   │   │   └── b/[token]/      # Public secure bill receipt view (noindex)
│   │   ├── app/                # Authenticated Tenant Portal
│   │   │   ├── layout.tsx      # Tenant shell, sidebar, mobile nav, trial banner
│   │   │   ├── billing/        # Primary Billing Workspace
│   │   │   ├── items/          # Catalog management
│   │   │   ├── bills/          # Bill history & filters
│   │   │   ├── bills/[id]/     # Bill details, thermal/A4 print & cancel
│   │   │   ├── customers/      # Customer list & metrics
│   │   │   ├── customers/[id]/ # Customer purchase history
│   │   │   ├── dashboard/      # Sales dashboard & daily trend chart
│   │   │   └── settings/       # Business & billing preferences
│   │   └── admin/              # Platform Administrator Panel
│   │       ├── layout.tsx      # Admin shell & navigation
│   │       ├── page.tsx        # Platform overview & metrics
│   │       ├── login/          # Administrator login
│   │       ├── accounts/       # Tenant accounts directory
│   │       ├── accounts/new    # Manual tenant onboarding
│   │       └── accounts/[id]   # Tenant details, subscription & impersonation
│   ├── components/             # Reusable Client & UI Components
│   ├── db/
│   │   ├── index.ts            # Neon serverless client & Drizzle DB instance
│   │   └── schema.ts           # Complete relational schema (12 tables)
│   └── lib/
│       ├── auth.ts             # Multi-tenant security guards & authorization
│       ├── billing-calculations.ts # Authoritative financial calculations
│       ├── bill-sequence.ts    # Atomic consecutive bill numbering
│       ├── phone-utils.ts      # Indian mobile number normalization
│       ├── session.ts          # Database session management
│       ├── share-link.ts       # Cryptographic bearer token generator & hasher
│       └── whatsapp.ts         # WhatsApp click-to-chat URL builder
└── tests/
    ├── billing-calculations.test.mjs # Domain financial calculation tests
    ├── tenant-isolation.test.mjs    # Multi-tenant isolation verification
    └── e2e-workflow.test.mjs        # End-to-end integration workflows
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- PostgreSQL database (Neon serverless connection URL)

### 2. Environment Setup
Create a `.env` file in the root directory:

```dotenv
DATABASE_URL=postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
APP_URL=http://localhost:3000
AUTH_SECRET=billyours_super_secure_production_secret_key_987654321_in_2026
DEFAULT_TRIAL_DAYS=7
SUPER_ADMIN_EMAIL=admin@billyours.com
SUPER_ADMIN_PASSWORD=AdminSecure2026!
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Push Schema & Seed Database
```bash
npm run db:push
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Tests

The application includes unit tests, tenant isolation integration tests, and core workflow tests:

```bash
npm run test
```

Test coverage includes:
- **Financial Calculations**: Zero-value bills, fractional quantities, fixed & percentage discounts, tax-exclusive & tax-inclusive calculations, discount caps.
- **Tenant Isolation**: Verifies Tenant A cannot read Tenant B's bills, view customers, edit catalog items, or cancel records.
- **Business Workflows**: Atomic bill sequence increments (`BY-2026-000001`), customer phone auto-lookup, secure share link hashing & revocation, trial expiration rules, and administrator audit logging.

---

## 🚢 Production Deployment (Vercel)

1. Push code to your GitHub / GitLab repository.
2. Import project into Vercel.
3. Configure the Environment Variables in Vercel Project Settings:
   - `DATABASE_URL` (Your Neon connection pooler URL)
   - `APP_URL` (Your production domain, e.g. `https://billyours.com`)
   - `AUTH_SECRET` (A strong random 32+ character string)
   - `SUPER_ADMIN_EMAIL`
   - `SUPER_ADMIN_PASSWORD`
   - `DEFAULT_TRIAL_DAYS` (Default: `7`)
4. Deploy! The application uses standard Node.js serverless runtimes.
