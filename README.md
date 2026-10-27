# 4N Planet — Mobile Phone Shop Management System

**System Name:** 4N Planet  
**Shop Name:** 4N Planet  
**Developed by:** OpusByte  
**Target Market:** Sri Lanka (LKR, Asia/Colombo Timezone)  
**Architecture:** React 19 + Vite SPA Frontend, Node.js Vercel Serverless Functions API, Google Sheets API v4 as Real-time Database  

---

## 📱 Overview

**4N Planet** is a production-grade retail POS and inventory management system purpose-built for mobile phone and electronics shops in Sri Lanka. It combines hardware-level IMEI and serial number tracking with point-of-sale invoicing, purchase orders (GRN), customer credit accounts, repair workshop ticketing, and full financial reporting.

---

## ✨ Key Features

1. **Point of Sale (POS) & Checkout:**
   - Barcode scanning & live IMEI search for devices
   - Multi-tender split payment support (Cash, Card, Bank Transfer, Mobile Pay)
   - Real-time stock reservation and cashier discount policy controls
   - Thermal invoice printing and customer receipts
   - Idempotent sales transactions with automatic inventory deduction

2. **Hardware Serial & IMEI Tracking:**
   - 15-digit dual-IMEI and serial number registration
   - Device condition grading (Brand New, Refurbished, Used) and battery health %
   - Lifecycle tracking: In Stock -> Sold -> Warranty Claimed -> Returned

3. **Purchases & Goods Received Notes (GRN):**
   - Purchase order tracking with supplier invoice linking
   - Stock arrival registration with instant serial number batch entry
   - Landed cost, shipping adjustments, and supplier payable accounting

4. **Customers & Supplier Accounts:**
   - Customer loyalty directory with lifetime sales and credit limits
   - Supplier payables ledger with partial payment installments

5. **Repair Workshop Management:**
   - Job ticket intake (`JOB-000001`) with device defect descriptions
   - Status workflow: `Received` -> `Diagnosing` -> `Waiting for Parts` -> `In Progress` -> `Ready` -> `Collected`
   - Attachment of replacement parts directly deducted from store inventory
   - Labor fee addition and printable job claim slips

6. **Warranty & Claims Ledger:**
   - Expiry calculation based on product warranty duration (e.g. 12/24 months)
   - Warranty claim filing with repair or replacement logging

7. **Financials & Accounting:**
   - Operating overheads & expense categorization (Rent, Utilities, Salaries, Tea)
   - Cash inflow and outflow tracking
   - Automated Statement of Profit & Loss (Revenue - COGS - Expenses = Net Profit)
   - Date presets: Today, 7 Days, 30 Days, Year-to-date

8. **Role-Based Access Control (RBAC):**
   - Roles: `admin`, `manager`, `cashier`, `stock_manager`, `technician`
   - Session authentication with secure HTTP-only cookies and bcrypt password hashing

---

## 🗄️ Database Schema (Google Sheets API v4)

The database runs on 20+ specialized tabs in Google Sheets:

1. `Users` — Staff login, roles, phone, password hashes
2. `Products` — Device catalog, pricing floors, stock alerts, serialized flags
3. `Categories` & `Subcategories` — Catalog taxonomy
4. `Brands` — Device manufacturers (Apple, Samsung, Xiaomi, etc.)
5. `Suppliers` — Importers and wholesalers
6. `Customers` — Retail and wholesale client accounts
7. `Purchases` & `Purchase_Items` — GRN orders and received line items
8. `Sales` & `Sale_Items` — POS sales transactions and sold line items
9. `Payments` — Inbound customer receipts and outbound supplier payments
10. `Expenses` — Operational expenses and utility disbursements
11. `Stock_Movements` — Full audit trail of all quantity adjustments and movements
12. `Serials` — Individual device IMEIs, serial numbers, condition, and status
13. `Warranties` & `Warranty_Claims` — Warranty records and service claims
14. `Repair_Jobs` & `Repair_Parts` — Workshop tickets and spare parts used
15. `Settings` — Store branding, tax rates, receipt footers, and prefixes
16. `Activity_Logs` — Audit logs of critical admin and sales actions
17. `Returns` — Returned merchandise authorizations

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js 18+ installed
- Google Cloud Service Account with Google Sheets API and Google Drive API enabled

### 2. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```
Fill in your Google Cloud credentials in `.env`:
```ini
PORT=3001
JWT_SECRET=your_super_secret_jwt_key
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_google_spreadsheet_id
```

### 3. Initialize Spreadsheet Tabs
Run the initialization script to automatically format and label all 20+ sheets:
```bash
npm run init-sheets
```

### 4. Seed Default Admin User
Create your primary administrator account:
```bash
node scripts/createAdmin.js
```

### 5. Start Development Servers
In terminal 1, run the local API backend:
```bash
node server.js
```

In terminal 2, run the Vite frontend:
```bash
npm run dev
```

Visit `http://localhost:5173` to access 4N Planet.

---

## 🧪 Testing & Validation

Run unit tests with Vitest:
```bash
npm run test
```

Run Oxlint linter:
```bash
npm run lint
```

Build production client bundle:
```bash
npm run build
```

---

## 🌐 Deployment to Vercel

1. Push code to GitHub repository.
2. Import project into Vercel.
3. Set environment variables (`JWT_SECRET`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`) in Vercel Project Settings.
4. Deploy — Vercel will automatically build the Vite SPA and serve `/api/*` via serverless functions.
