# 🌾 SasyaVahini (सस्यवाहिनी) — Project Progress & Completed Updates

> **Problem Statement ID:** 26033 (Ministry of Consumer Affairs, Food & Public Distribution - DoCA)  
> **Project Name:** SasyaVahini — Digital Agricultural Marketplace connecting Indian Farmers & FPOs directly with Consumers & Institutional Buyers  
> **Module Owner:** Member 3 (Ganga Satish — Buyer Portal & Agricultural Marketplace)  
> **Current Status:**  
> - Phase 1: Foundation, Architecture, Docker & Buyer Authentication — **COMPLETED**  
> - Phase 2: Buyer Profile, Address Management & Account Settings — **COMPLETED**  
> - Phase 3: Agricultural Marketplace, Product Discovery & FPO Integration — **COMPLETED**  

---

## 📋 Table of Contents
1. [Executive Summary & Completed Phases at a Glance](#1-executive-summary--completed-phases-at-a-glance)
2. [Phase 1 Recap: Foundation & Authentication](#2-phase-1-recap-foundation--authentication)
3. [Phase 2: Buyer Profile, Addresses & Account Settings (In-Depth & Simple)](#3-phase-2-buyer-profile-addresses--account-settings-in-depth--simple)
   - [2.1 Business & Real-World Purpose](#21-business--real-world-purpose)
   - [2.2 Page 1: Buyer Profile Management (`/buyer/profile`)](#22-page-1-buyer-profile-management-buyerprofile)
   - [2.3 Page 2: Delivery Address Management (`/buyer/addresses`)](#23-page-2-delivery-address-management-buyeraddresses)
   - [2.4 Page 3: Account Security & Preferences (`/buyer/settings`)](#24-page-3-account-security--preferences-buyersettings)
   - [2.5 Backend Architecture & API Contracts (Phase 2)](#25-backend-architecture--api-contracts-phase-2)
4. [Phase 3: Agricultural Marketplace & Discovery (In-Depth & Simple)](#4-phase-3-agricultural-marketplace--discovery-in-depth--simple)
   - [3.1 Agricultural Context & The Core Problem Solved](#31-agricultural-context--the-core-problem-solved)
   - [3.2 Page 1: Marketplace Catalog (`/buyer/marketplace`)](#32-page-1-marketplace-catalog-buyermarketplace)
   - [3.3 Page 2: Produce Detail Page (`/buyer/marketplace/products/:productId`)](#33-page-2-produce-detail-page-buyermarketplaceproductsproductid)
   - [3.4 Page 3: Supplier & FPO Public Profile (`/buyer/marketplace/suppliers/:supplierId`)](#34-page-3-supplier--fpo-public-profile-buyermarketplacesupplierssupplierid)
   - [3.5 Key Agricultural Innovations & Components](#35-key-agricultural-innovations--components)
   - [3.6 Inventory Invariant & Seeding Engine](#36-inventory-invariant--seeding-engine)
   - [3.7 Backend Architecture & API Contracts (Phase 3)](#37-backend-architecture--api-contracts-phase-3)
5. [Strict Scope Boundary & Security Rules](#5-strict-scope-boundary--security-rules)
6. [Complete Verification & Automated Test Results](#6-complete-verification--automated-test-results)
7. [Comprehensive Files & Components Summary](#7-comprehensive-files--components-summary)
8. [Viva / Presentation Speaking Script & Model Q&A](#8-viva--presentation-speaking-script--model-qa)

---

## 1. Executive Summary & Completed Phases at a Glance

SasyaVahini is built to bridge the gap between rural Indian agriculture (smallholder farmers aggregated through Farmer Producer Organizations) and urban procurement (individual households as well as restaurants, food processors, and wholesale retailers).

| Phase | Module / Capability | Status | Key Highlights |
| :--- | :--- | :---: | :--- |
| **Phase 1** | **Foundation & Buyer Onboarding** | ✅ **COMPLETED** | Docker compose, PostgreSQL 15 via Prisma, JWT security, Dual-mode registration (Consumer vs Business), Forgot/Reset password. |
| **Phase 2** | **Buyer Profile & Account Workspace** | ✅ **COMPLETED** | Sourcing preferences, GSTIN validation, Multi-address management with default selector, Notification settings, Password security engine. |
| **Phase 3** | **Marketplace Discovery & FPO Integration** | ✅ **COMPLETED** | Dynamic categories, multi-param search & filtering, live APMC Mandi savings badges, stock inventory tracking, detailed crop specifications, verified supplier profiles. |
| **Phase 4** | **Multi-Supplier Price Comparison** | ⏳ *Next Phase* | Multi-FPO price comparison tables, mandi arbitrage analytics. |
| **Phase 5** | **Procurement Cart, Orders & Escrow** | ⏳ *Future Phase* | Batch checkout, digital order contracting, two-tier logistics integration, escrow payout release. |

---

## 2. Phase 1 Recap: Foundation & Authentication

In Phase 1, we established the full-stack baseline:
1. **Containerized Multi-Service Architecture:** Dockerized PostgreSQL 15, Node.js/Express REST backend, and React 18/Vite frontend with hot-reload.
2. **Relational Database Model:** Prisma ORM schema featuring users, produce batches, order status transitions, logistics milestones, and multi-role access control (`FARMER`, `FPO`, `BUYER`, `LOGISTICS`, `ADMIN`).
3. **Buyer Onboarding Pages:**
   - Dual-mode registration: Individual Consumers sign up with name, email, and phone; Commercial Business Buyers provide Organization Name, Business Category, and verified GSTIN.
   - Interactive password complexity checklist (8+ chars, uppercase, digit).
   - Secure login with JWT access tokens and HTTP-only refresh tokens.
   - Self-service Forgot Password and Reset Password token workflows.

---

## 3. Phase 2: Buyer Profile, Addresses & Account Settings (In-Depth & Simple)

### 2.1 Business & Real-World Purpose
In Indian agricultural procurement, buyers have diverse operational needs:
- An **Individual Consumer** orders produce for household consumption and needs simple residential delivery addresses and delivery SMS updates.
- A **Business Buyer** (e.g., a hotel chain in Pune or a food processing unit in Nashik) requires legal tax compliance (**GSTIN**), specific sourcing regions, target procurement volumes, and multiple commercial warehouse delivery addresses.

Phase 2 built the entire authenticated buyer management workspace to satisfy both user types seamlessly.

---

### 2.2 Page 1: Buyer Profile Management (`/buyer/profile`)

#### 💡 In Simple Words:
> *"This page is your digital ID card and procurement preference center. You can update your contact details, enter your company name and GST number if you're a business, and specify which crops and farming states you want to procure from."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/profile` (embedded dynamically in `BuyerDashboard.jsx`).
* **Component:** `frontend/src/pages/buyer/BuyerProfilePage.jsx`.
* **Features:**
  1. **Personal Information Section:**
     - Editable **Full Name**, **Email Address** (read-only for identity safety), and **10-digit Phone Number**.
  2. **Role & Verification Badges:**
     - Displays `BUYER` role badge and account status (`VERIFIED BUYER` vs `PENDING KYC`).
  3. **Context-Aware Business Information (For B2B Buyers):**
     - **Organization Name:** Legal business entity name.
     - **Business Type Selector:** Restaurant, Hotel, Wholesaler, Supermarket, Food Processor, or Exporter.
     - **GSTIN Field:** Validates Indian GST number syntax (15-character alphanumeric, e.g. `27AAPFU0939F1ZV`).
  4. **Agricultural Sourcing Preferences:**
     - **Preferred Crop Categories:** Vegetables, Fruits, Grains, Pulses, Spices.
     - **Preferred Sourcing Regions:** Target states (e.g. Maharashtra, Madhya Pradesh, Gujarat).
     - **Procurement Capacity:** Typical monthly procurement lot size (e.g., 500 kg to 10,000 kg).
* **API Endpoints:**
  - `GET /api/buyer/profile`: Retrieves profile details and business records.
  - `PATCH /api/buyer/profile`: Validates inputs with Zod schemas and saves updates atomically to PostgreSQL.

---

### 2.3 Page 2: Delivery Address Management (`/buyer/addresses`)

#### 💡 In Simple Words:
> *"This page lets you save and manage multiple delivery locations—like your home, office, restaurant kitchen, or central warehouse. You can add new addresses, choose which one is your default, edit details, or delete old ones."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/addresses`.
* **Component:** `frontend/src/pages/buyer/BuyerAddressesPage.jsx`.
* **Features:**
  1. **Address Card Grid:**
     - Displays recipient name, phone number, complete street address, landmark, city, district, state, and 6-digit PIN code.
     - Highlights a distinct green badge: **"Default Delivery Address"**.
  2. **Interactive Modal Form ("Add Delivery Address"):**
     - Full address validation: Pincode (6 digits), Receiver Name, Receiver Phone (10 digits), Address Line 1 & 2, City, District, State.
     - **"Make Default Address" toggle:** Automatically unsets any existing default address in the database so that exactly one address remains default.
  3. **Edit & Delete Actions:**
     - Edit modal pre-populates existing data.
     - Delete action confirms with the user and safely removes the record.
* **API Endpoints:**
  - `GET /api/buyer/addresses`: Lists all registered addresses for the logged-in buyer.
  - `POST /api/buyer/addresses`: Creates a new delivery location.
  - `PUT /api/buyer/addresses/:id`: Updates an existing address.
  - `DELETE /api/buyer/addresses/:id`: Deletes an address.
  - `PATCH /api/buyer/addresses/:id/default`: Toggles an address as the default.

---

### 2.4 Page 3: Account Security & Preferences (`/buyer/settings`)

#### 💡 In Simple Words:
> *"This page allows you to control how SasyaVahini notifies you (SMS, Email, WhatsApp), your display currency and language, and lets you securely change your password."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/settings`.
* **Component:** `frontend/src/pages/buyer/BuyerSettingsPage.jsx`.
* **Features:**
  1. **Notification Preferences:**
     - **SMS Notifications:** Real-time dispatch alerts and delivery OTP notifications.
     - **Email Notifications:** Weekly APMC Mandi price summaries and invoices.
     - **WhatsApp Telematics:** Live shipment location updates from Shankar's cold-chain logistics.
  2. **Platform & Invoice Preferences:**
     - **Currency:** Indian Rupee ($\text{₹ INR}$).
     - **Language:** English, Hindi (हिंदी), Marathi (मराठी).
     - **Invoice Preference:** Automatically attach GST tax breakdown on receipts.
  3. **Password Security Card:**
     - Inputs: Current Password, New Password, Confirm New Password.
     - Verifies current password against database bcrypt hash before allowing change.
     - Enforces password rules: At least 8 characters, 1 uppercase letter, 1 number.
     - Blocks reusing the current password as the new password.
* **API Endpoints:**
  - `GET /api/buyer/settings`: Retrieves user notification settings.
  - `PATCH /api/buyer/settings`: Updates notification flags.
  - `POST /api/buyer/change-password`: Validates current password and updates hash.

---

### 2.5 Backend Architecture & API Contracts (Phase 2)

All Phase 2 endpoints are protected by `authenticate` middleware and enforce strict role checking (`requireRole('BUYER')`):

```
GET    /api/buyer/profile           → Returns buyer details & buyerProfile
PATCH  /api/buyer/profile           → Validates and updates profile fields
GET    /api/buyer/addresses         → Returns all delivery addresses
POST   /api/buyer/addresses         → Adds new address (supports isDefault flag)
PUT    /api/buyer/addresses/:id     → Updates address
DELETE /api/buyer/addresses/:id     → Deletes address
PATCH  /api/buyer/addresses/:id/default → Sets address as primary default
GET    /api/buyer/settings          → Returns notification & invoice settings
PATCH  /api/buyer/settings          → Saves notification preferences
POST   /api/buyer/change-password   → Authenticates current password and updates hash
```

---

## 4. Phase 3: Agricultural Marketplace & Discovery (In-Depth & Simple)

### 4.1 Agricultural Context & The Core Problem Solved

Indian farmers face a critical market failure:
1. **Middlemen Squeeze:** When a consumer or restaurant buys tomatoes at ₹30/kg in Pune, the farmer in Manchar village often receives only ₹8 to ₹12/kg. The remaining ₹18 to ₹22 is absorbed by 3–4 layers of middlemen and commission agents.
2. **Lack of Price Transparency:** Farmers do not know the actual wholesale APMC mandi benchmark and accept undervalued offers.
3. **Volume Mismatch:** A single smallholder farmer with 500 kg cannot supply a 5,000 kg order. Farmer Producer Organizations (FPOs) aggregate lots from multiple farmers, but lack a digital marketplace to showcase these aggregated lots directly to buyers.

**Phase 3 directly solves this** by implementing the **Digital Agricultural Marketplace**:
- Buyers discover produce directly from Farmers and FPOs.
- Real-time comparison with government APMC Mandi rates shows immediate savings (e.g. *"14.3% below Mandi Rate"*).
- FPOs aggregate smallholder lots into high-volume, quality-graded commercial batches.

---

### 4.2 Page 1: Marketplace Catalog (`/buyer/marketplace`)

#### 💡 In Simple Words:
> *"This is the main shopping and discovery floor. You see fresh farm produce listed with high-resolution crop photos, quality grades (Grade A, Organic), direct farm prices, live savings compared to government mandis, and available quantity. You can search by crop name or district, filter by category or price, and sort by freshly harvested crops."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/marketplace` (also accessible via sidebar *"Browse Marketplace"* and dashboard *"Live Produce Marketplace"* tab).
* **Component:** `frontend/src/pages/buyer/marketplace/MarketplacePage.jsx`.
* **Subcomponents:**
  * `ProductSearch.jsx`:
    - Debounced typeahead search input.
    - Autocomplete popup categorizing matches into **Crops** (e.g. *Tomato*, *Kolam Rice*), **Categories** (e.g. *Vegetables*, *Grains*), and **Districts** (e.g. *Pune*, *Nashik*, *Guntur*).
    - **Recent Searches:** Stores last 5 searches in browser `localStorage` for 1-click re-search.
  * `CategoryNavigation.jsx`:
    - Dynamic horizontal scroll pills showing active agricultural categories with icons and real-time lot counts:
      - 🌾 **All Produce**
      - 🥦 **Vegetables**
      - 🍎 **Fruits**
      - 🌾 **Grains**
      - 🫘 **Pulses & Legumes**
      - 🌶️ **Spices**
  * `ProductFilters.jsx` (Sidebar):
    - **Quality Grade Selector:** All, Grade A (Premium), Grade B (Standard), Grade C, Organic Premium.
    - **Price Range Inputs:** Numeric min and max filter in ₹/kg.
    - **Organic Certified Toggle:** Checkbox filtering strictly certified organic produce.
    - **Inventory Availability Filter:** Radio selector for In Stock (>100 kg) vs Low Stock (<100 kg).
    - **Reset Filters:** Instant 1-click reset button.
  * `ProductSorting.jsx`:
    - Active result counter (e.g. *"Showing 12 verified produce lots"*).
    - **Buyer Context Pill:** Automatically detects logged-in user profile to show `Consumer Retail Mode` (for households) vs `B2B Institutional Wholesale Mode` (for business buyers).
    - Sort selector: Lowest Price, Highest Price, Highest Available Quantity, Freshly Harvested First, Recently Listed.
  * `ProductGrid.jsx`:
    - Responsive multi-column CSS grid.
    - Pulse shimmer loading skeletons during data fetching.
    - Clean empty state illustration with "Reset All Filters" CTA when no products match.
    - Server-side pagination controls (Previous / Next).

---

### 4.3 Page 2: Produce Detail Page (`/buyer/marketplace/products/:productId`)

#### 💡 In Simple Words:
> *"When you click on any crop card, you open its complete passport. You see when it was harvested, how fresh it is, the exact farm origin, quality grade, how much inventory is remaining, and a side-by-side comparison showing how much money you save compared to the government Mandi rate."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/marketplace/products/:productId`.
* **Component:** `frontend/src/pages/buyer/marketplace/ProductDetailPage.jsx`.
* **Features:**
  1. **Breadcrumb Navigation:** `Marketplace > Vegetables > Tomato`.
  2. **Product Image Gallery:**
     - High-definition crop photography with automatic SVG fallback if image fails to load.
     - Quality Grade badge (`GRADE A` or `ORGANIC PREMIUM`).
     - Freshness index badge (`Harvested Today` or `Xd Fresh`).
  3. **Direct Farm Price vs APMC Mandi Benchmark Card:**
     - Large typography direct farm price: $\text{₹24/kg}$.
     - Strikethrough government APMC Mandi rate: $\text{Mandi ₹28/kg}$.
     - Savings pill: $\text{Save 14.3\% compared to terminal APMC mandi rates!}$
  4. **Invariant Batch Inventory Transparency Bar:**
     - Available Stock progress bar:
       $$\text{Available Stock} = \text{Total Batch Qty} - \text{Reserved Qty} - \text{Sold Qty}$$
     - Minimum Order Quantity (MOQ) callout (e.g. 50 kg for retail, 500 kg for wholesale).
  5. **Verified Supplier Profile Card:**
     - Displays Farmer or FPO collective name, location, and verified producer checkmark.
     - Direct link: *"View Supplier Profile →"*.
  6. **Agricultural Specifications Table:**
     - Two-column technical specs covering Crop Variety, Category, Quality Grade, Cultivation Type, Harvest Date, Shelf Life (days), Minimum Order Qty, and Farm Origin (Village, District, State).
  7. **Related Produce Recommendations:**
     - Carousel grid displaying up to 4 other produce lots available from the same category or district.

---

### 4.4 Page 3: Supplier & FPO Public Profile (`/buyer/marketplace/suppliers/:supplierId`)

#### 💡 In Simple Words:
> *"This page is the public profile of the farmer or FPO who grew the produce. It proves that the supplier is genuine, displays their cooperative registration number or Aadhaar verification, shows how many smallholder farmers belong to the collective, and lists all crops currently available from them."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/marketplace/suppliers/:supplierId`.
* **Component:** `frontend/src/pages/buyer/marketplace/SupplierProfilePage.jsx`.
* **Features:**
  1. **Supplier Hero Banner:**
     - Supplier Avatar and Organization/Farmer legal name.
     - Badge: `Farmer Producer Organization` or `Direct Farmer`.
     - Location: District and State.
     - Active Produce Lots count.
  2. **Trust & Verification Metrics Grid:**
     - **Legal Registration:** FPO cooperative registration number (e.g. `FPO-MH-PUN-2024-001`) or Government Aadhaar Verification.
     - **Smallholder Member Collective:** Displays total member farmers (e.g. `450 Smallholder Farmers pooled`).
     - **Land Acreage (for farmers):** Verified cultivated land size (e.g. `3.5 Acres`).
     - **Sourcing Transparency:** `100% Direct to Farmer Payout Guarantee`.
  3. **Active Produce Listings Grid:**
     - Reuses `ProductCard.jsx` to render all verified active produce batches currently available from this specific supplier.
  4. **Strict Supplier Privacy Protection:**
     - Private personal phone numbers, Aadhaar numbers, and bank account details are strictly stripped by backend sanitization and never exposed to the public frontend.

---

### 4.5 Key Agricultural Innovations & Components

#### 1. APMC Mandi Benchmark Engine
In traditional trade, buyers have no idea if a price is fair. SasyaVahini calculates real-time savings:
$$\text{Savings \%} = \frac{\text{Mandi Benchmark Price} - \text{Farm Gate Asking Price}}{\text{Mandi Benchmark Price}} \times 100$$
If a crop has asking price ₹24/kg and Mandi benchmark is ₹28/kg, SasyaVahini displays:
`Save ~14.3% vs APMC Mandi Rate (Good Deal!)`

#### 2. Harvest Freshness Index ($\text{daysSinceHarvest}$)
Agricultural produce depreciates rapidly. The backend calculates:
$$\text{daysSinceHarvest} = \left\lfloor \frac{\text{Today} - \text{Harvest Date}}{86,400,000 \text{ ms}} \right\rfloor$$
Crops harvested within 24 hours display a distinct green badge: **"Harvested Today"**; others display **"X days Fresh"**.

#### 3. B2C vs B2B Context Adaptation
The platform detects the buyer type from their profile:
- **Individual Consumer:** Emphasizes single-household quantities, freshness, and direct farm provenance.
- **Business Buyer:** Activates bulk wholesale badges, displays Minimum Order Quantity (MOQ), and highlights FPO pooled aggregation lots.

---

### 4.6 Inventory Invariant & Seeding Engine

All inventory follows strict transactional accounting to eliminate double-selling:
$$\text{availableQtyKg} = \max(0, \text{totalQuantityKg} - \text{reservedQty} - \text{soldQty})$$

The database was seeded with **12 diverse produce lots** across Indian agricultural belts:
1. **Nashik Red Tomato (Grade A):** Fresh vine tomatoes from Manchar cluster (₹24/kg, 2,000 kg).
2. **Nashik Red Onion (Grade A):** Cured export-quality red onions (₹20/kg, 1,000 kg).
3. **Nashik Red Onion Lot C (Low Stock):** Commercial Grade B onions (₹18/kg, 85 kg).
4. **Sharbati Golden Wheat (Organic Premium):** Certified pesticide-free golden wheat from Sehore, MP (₹34/kg, 5,000 kg).
5. **Nagpur Mandarin Oranges (Grade A):** Citrus orchard lot from Katol, Nagpur (₹45/kg, 1,500 kg).
6. **Guntur S4 Dried Red Chillies (Grade A):** High-capsaicin dried chillies from Tenali, AP (₹160/kg, 800 kg).
7. **Wada Kolam Rice (Grade A):** Aromatic medium-grain white rice from Palghar, MH (₹48/kg, 3,500 kg).
8. **Malwa Organic Chickpeas / Kabuli Chana (Organic):** Large-size organic chickpeas from Ujjain, MP (₹72/kg, 2,200 kg).
9. **Kashmir High-Curcumin Turmeric (Organic Premium):** 5.5% curcumin medicinal grade turmeric (₹130/kg, 450 kg).
10. **Himachal Royal Delicious Apples (Grade A):** Crisp cold-storage apples from Shimla, HP (₹95/kg, 1,800 kg).
11. **Bikaner Bansi Wheat (Grade B):** Standard traditional wheat from Rajasthan (₹28/kg, 4,000 kg).
12. **Pune Hybrid Green Chillies (Grade A):** Spicy green chillies from Junnar, MH (₹38/kg, 450 kg).

---

### 4.7 Backend Architecture & API Contracts (Phase 3)

Mounted at `/api/marketplace` and `/api/buyer/marketplace`:

```
GET /api/marketplace/categories
→ Returns active agricultural categories with product counts, minPrice, and icons.

GET /api/marketplace/products
→ Multi-param search, filter by category, grade, price, organic, availability, sorting, and pagination.

GET /api/marketplace/products/:productId
→ Returns single product details, freshness index, APMC savings, and related produce lots.

GET /api/marketplace/search/suggestions?q=to
→ Returns autocomplete array across crops, categories, and districts.

GET /api/marketplace/suppliers/:supplierId
→ Returns public supplier profile (FPO or Farmer) with verified badges. Zero private data leaked.

GET /api/marketplace/suppliers/:supplierId/products
→ Returns active produce listings belonging to a specific supplier.

GET /api/marketplace/stats
→ Returns summary metrics for hero banner (active listings, volume, average savings).

GET /api/marketplace/produce
→ Backward-compatibility alias returning produce array directly for Phase 2 legacy callers.
```

---

## 5. Strict Scope Boundary & Security Rules

To ensure clean capstone phase progression:
* ✅ **No Fake Checkout:** No fake payment gateways, shopping carts, or order placement modals were implemented (strictly scheduled for Phase 5).
* ✅ **No Multi-Supplier Comparison Matrix:** Single-lot APMC Mandi rate comparison only (multi-supplier comparison matrix scheduled for Phase 4).
* ✅ **Teammate Portals Preserved:** Portals for `/farmer`, `/fpo`, `/logistics`, `/admin`, and shared `Navbar.jsx` remain completely intact.
* ✅ **Privacy by Design:** Personal phone numbers, Aadhaar numbers, and bank accounts are strictly stripped from all marketplace endpoints.

---

## 6. Complete Verification & Automated Test Results

### 🧪 Backend Test Suite (`Jest + Supertest`)
Ran full backend test suite inside container:

```
PASS  tests/two-tier-logistics.test.js
PASS  tests/farmerFpoBusinessRules.test.js
PASS  tests/marketplace.test.js
PASS  tests/buyerMarketplacePhase3.test.js (12/12 passed)
PASS  tests/logistics.unit.test.js
PASS  tests/buyerPhase2.test.js
PASS  tests/buyerAuthPhase1.test.js
PASS  tests/farmer.test.js

Test Suites: 8 passed, 8 total
Tests:       103 passed, 103 total (100% SUCCESS RATE)
Snapshots:   0 total
Time:        10.235 s
```

### 🧪 Frontend Test Suite (`Vitest + Testing Library`)
Ran full frontend test suite inside container:

```
PASS  src/test/listingHelpers.test.js
PASS  src/test/voiceFormParser.test.js
PASS  src/test/components.test.jsx
PASS  src/test/buyerAuth.test.jsx
PASS  src/test/MarketplacePhase3.test.jsx (4/4 passed)
PASS  src/test/buyerPhase2.test.jsx

Test Files:  6 passed, 6 total
Tests:       29 passed, 29 total (100% SUCCESS RATE)
Time:        4.86 s
```

### 📦 Frontend Production Build (`Vite Build`)
```
vite v5.4.21 building for production...
✓ 1662 modules transformed.
dist/index.html                   0.74 kB │ gzip:   0.43 kB
dist/assets/index-DLzZCKek.css  113.22 kB │ gzip:  20.52 kB
dist/assets/index-D-ZSbMbR.js   764.14 kB │ gzip: 208.90 kB
✓ built in 7.27s with 0 errors.
```

---

## 7. Comprehensive Files & Components Summary

### Phase 2 Files Created/Updated:
| File Path | Description |
| :--- | :--- |
| `backend/src/controllers/buyer.controller.js` | Controller for buyer profile, addresses, settings, and change-password. |
| `backend/src/routes/buyer.routes.js` | REST routes for buyer workspace endpoints. |
| `backend/tests/buyerPhase2.test.js` | Automated Jest test suite for Phase 2 endpoints. |
| `frontend/src/services/buyerApi.js` | Client API layer for buyer workspace. |
| `frontend/src/pages/buyer/BuyerProfilePage.jsx` | Profile view with personal, business, and sourcing preference forms. |
| `frontend/src/pages/buyer/BuyerAddressesPage.jsx` | Delivery address management with modal and default toggle. |
| `frontend/src/pages/buyer/BuyerSettingsPage.jsx` | Notification toggles, platform preferences, and change password card. |
| `frontend/src/test/buyerPhase2.test.jsx` | Vitest suite for Phase 2 UI pages. |

### Phase 3 Files Created/Updated:
| File Path | Description |
| :--- | :--- |
| `backend/src/controllers/marketplace.controller.js` | Phase 3 discovery controller (categories, products, suggestions, suppliers, stats). |
| `backend/src/routes/marketplace.routes.js` | REST routes for marketplace discovery. |
| `backend/prisma/seed.js` | Database seeder with 12 diverse produce lots across Indian varieties. |
| `backend/tests/buyerMarketplacePhase3.test.js` | Automated Jest test suite for Phase 3 discovery endpoints. |
| `frontend/src/services/marketplaceApi.js` | Client service layer for marketplace API. |
| `frontend/src/styles/marketplace.css` | Custom CSS design system for marketplace layout, cards, and details. |
| `frontend/src/components/buyer/marketplace/ProductCard.jsx` | Reusable produce card with image, grade, mandi savings, and stock bar. |
| `frontend/src/components/buyer/marketplace/CategoryNavigation.jsx` | Horizontal category scroll pills with dynamic counts and icons. |
| `frontend/src/components/buyer/marketplace/ProductSearch.jsx` | Debounced search bar with autocomplete popover and recent searches history. |
| `frontend/src/components/buyer/marketplace/ProductFilters.jsx` | Sidebar filter panel (grade, price range, organic toggle, availability). |
| `frontend/src/components/buyer/marketplace/ProductSorting.jsx` | Content header with sort selector and B2C/B2B context pill. |
| `frontend/src/components/buyer/marketplace/ProductGrid.jsx` | Responsive grid with pulse loading skeletons and pagination. |
| `frontend/src/pages/buyer/marketplace/MarketplacePage.jsx` | Complete agricultural marketplace discovery page (`/buyer/marketplace`). |
| `frontend/src/pages/buyer/marketplace/ProductDetailPage.jsx` | Dedicated lot specification page with mandi comparison and supplier card. |
| `frontend/src/pages/buyer/marketplace/SupplierProfilePage.jsx` | Verified FPO and farmer public profile page with trust metrics. |
| `frontend/src/pages/buyer/BuyerDashboard.jsx` | Main dashboard integration connecting sidebar links, tabs, and overview lots. |
| `frontend/src/test/MarketplacePhase3.test.jsx` | Vitest suite for Phase 3 UI components. |

---

## 8. Viva / Presentation Speaking Script & Model Q&A

### 🎤 Presentation Speaking Script (2-Minute Summary)
> *"Respected evaluators, in **Phase 2**, we built the complete **Buyer Operations Workspace**. It handles dual-persona requirements: individual consumers manage simple home delivery addresses and notification preferences, while institutional business buyers manage legal GSTIN numbers, business categories, commercial warehouses, and sourcing preferences.*  
>  
> *In **Phase 3**, we implemented the core **Digital Agricultural Marketplace** based on Problem Statement ID 26033. Here, buyers can browse 12 real Indian agricultural produce lots across Vegetables, Fruits, Grains, Pulses, and Spices.*  
> *We introduced three major innovations:*  
> *1. **Live APMC Mandi Savings Badges:** Showing buyers the exact percentage saved compared to terminal government mandi rates.*  
> *2. **Harvest Freshness Index:** Indicating how many days have elapsed since harvest.*  
> *3. **Verified Supplier Profiles:** Providing transparent provenance for Farmer Producer Organizations and individual farmers without leaking private contact information.*  
>  
> *All 103 backend unit tests and 29 frontend test suites are passing with a 100% success rate, and the project compiles cleanly in production mode."*

---

### ❓ Model Q&A for Evaluators

#### Q1: How does your marketplace compute the APMC Mandi benchmark?
**Answer:**  
*"Each agricultural commodity in the database is mapped to its regional APMC Mandi benchmark price based on current market data. The backend controller calculates the percentage difference: `(mandiBenchmark - askingPricePerKg) / mandiBenchmark * 100`. This provides transparent proof to the buyer that direct procurement from FPOs eliminates middleman markups while ensuring higher realization for the farmer."*

#### Q2: How do you prevent inventory overselling when multiple buyers view the same lot?
**Answer:**  
*"We enforce the inventory invariant: `availableQtyKg = max(0, totalQuantityKg - reservedQty - soldQty)`. The available quantity is computed dynamically from atomic database fields. In Phase 5, all reservation and checkout transactions run inside Prisma's atomic transactions (`prisma.$transaction`), locking rows to guarantee zero double-booking."*

#### Q3: Why is supplier privacy important in Phase 3?
**Answer:**  
*"Under agricultural privacy guidelines and platform anti-disintermediation rules, farmers' private phone numbers, bank accounts, and Aadhaar numbers must never be exposed publicly. Our `getSupplierProfile` endpoint explicitly selects only public trust attributes (cooperative registration number, smallholder member count, district, state, and verification badges)."*

#### Q4: How does the UI cater to both retail consumers and wholesale business buyers?
**Answer:**  
*"The marketplace reads the authenticated user's `buyerProfile`. For Individual Consumers, it highlights single-pack freshness and retail quantities. For Business Buyers, it activates the `B2B Institutional Wholesale Mode` badge, displays lot Minimum Order Quantities (MOQs), and highlights FPO pooled aggregation lots suitable for bulk freight dispatch."*

---
*Maintained by Member 3 (Buyer & Marketplace Module) — SasyaVahini Team.*
