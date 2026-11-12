# 🌾 SasyaVahini (सस्यवाहिनी) — Project Progress & Completed Updates

> **Problem Statement ID:** 26033 (Ministry of Consumer Affairs, Food & Public Distribution - DoCA)  
> **Project Name:** SasyaVahini — Digital Agricultural Marketplace connecting Indian Farmers & FPOs directly with Consumers & Institutional Buyers  
> **Module Owner:** Member 3 (Ganga Satish — Buyer Portal & Agricultural Marketplace)  
> **Current Status:**  
> - Phase 1: Foundation, Architecture, Docker & Buyer Authentication — **COMPLETED**  
> - Phase 2: Buyer Profile, Address Management & Account Settings — **COMPLETED**  
> - Phase 3: Agricultural Marketplace, Product Discovery & FPO Integration — **COMPLETED**  
> - Phase 4: Supplier Comparison, Price Transparency & Total Landed Cost — **COMPLETED**  

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
5. [Phase 4: Supplier Comparison, Price Transparency & Total Landed Cost (In-Depth & Simple)](#5-phase-4-supplier-comparison-price-transparency--total-landed-cost-in-depth--simple)
   - [5.1 Agricultural Context & Why Total Landed Cost Matters](#51-agricultural-context--why-total-landed-cost-matters)
   - [5.2 Comparison Selection Tray & Management (`ComparisonSelectionBar` & `ProductCompareButton`)](#52-comparison-selection-tray--management-comparisonselectionbar--productcomparebutton)
   - [5.3 Dedicated Comparison Page (`/buyer/compare`)](#53-dedicated-comparison-page-buyercompare)
   - [5.4 Standard Unit Price Normalization (kg, Quintal, Metric Tonne)](#54-standard-unit-price-normalization-kg-quintal-metric-tonne)
   - [5.5 Quality Grade, Inspection & Freshness Comparison Matrix](#55-quality-grade-inspection--freshness-comparison-matrix)
   - [5.6 Interactive Total Landed Cost Calculator Widget & Mathematical Formula](#56-interactive-total-landed-cost-calculator-widget--mathematical-formula)
   - [5.7 Cross-Module Teammate Integrations in Phase 4](#57-cross-module-teammate-integrations-in-phase-4)
   - [5.8 Price Transparency, Audit Disclosures & Agmarknet 7-Day History](#58-price-transparency-audit-disclosures--agmarknet-7-day-history)
   - [5.9 Backend Architecture & API Contracts (Phase 4)](#59-backend-architecture--api-contracts-phase-4)
6. [Strict Scope Boundary & Security Rules](#6-strict-scope-boundary--security-rules)
7. [Complete Verification & Automated Test Results](#7-complete-verification--automated-test-results)
8. [Comprehensive Files & Components Summary](#8-comprehensive-files--components-summary)
9. [Viva / Presentation Speaking Script & Model Q&A](#9-viva--presentation-speaking-script--model-qa)

---

## 1. Executive Summary & Completed Phases at a Glance

SasyaVahini is built to bridge the gap between rural Indian agriculture (smallholder farmers aggregated through Farmer Producer Organizations) and urban procurement (individual households as well as restaurants, food processors, and wholesale retailers).

| Phase | Module / Capability | Status | Key Highlights |
| :--- | :--- | :---: | :--- |
| **Phase 1** | **Foundation & Buyer Onboarding** | ✅ **COMPLETED** | Docker compose, PostgreSQL 15 via Prisma, JWT security, Dual-mode registration (Consumer vs Business), Forgot/Reset password. |
| **Phase 2** | **Buyer Profile & Account Workspace** | ✅ **COMPLETED** | Sourcing preferences, GSTIN validation, Multi-address management with default selector, Notification settings, Password security engine. |
| **Phase 3** | **Marketplace Discovery & FPO Integration** | ✅ **COMPLETED** | Dynamic categories, multi-param search & filtering, live APMC Mandi savings badges, stock inventory tracking, detailed crop specifications, verified supplier profiles. |
| **Phase 4** | **Supplier Comparison & Total Landed Cost** | ✅ **COMPLETED** | Multi-supplier comparison (2–4 lots), unit price normalization (kg/qtl/tonne), interactive Total Landed Cost calculator, Two-Tier Logistics integration, Agmarknet history. |
| **Phase 5** | **Procurement Cart, Orders & Escrow** | ⏳ *Next Phase* | Batch checkout, digital order contracting, two-tier logistics dispatch trigger, escrow payout release. |

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
> *"This page is your address book. You can save multiple delivery locations (like your home, central warehouse, or branch store), label them, and choose which one is the default destination for logistics trucks."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/addresses`.
* **Component:** `frontend/src/pages/buyer/BuyerAddressesPage.jsx`.
* **Features:**
  1. **Multi-Address Cards:**
     - Displays Recipient Name, Address Lines 1 & 2, City, District, State, Pincode, and Contact Phone.
     - **Tag Types:** `HOME`, `BUSINESS`, `WAREHOUSE`, `BILLING`.
     - **Default Address Pill:** Visual indicator marking the default delivery destination.
  2. **Add / Edit Modal Dialog:**
     - Interactive modal with Indian PIN code auto-formatting, district selection, and unloading delivery instructions (e.g. *"Enter Gate 3, ramp unloading dock #2"*).
  3. **Actions:** Set as Default, Edit, and Delete address with confirmation protection.
* **API Endpoints:**
  - `GET /api/buyer/addresses`: Lists all addresses for the logged-in buyer.
  - `POST /api/buyer/addresses`: Creates and validates a new address record.
  - `PATCH /api/buyer/addresses/:id`: Updates an existing address.
  - `DELETE /api/buyer/addresses/:id`: Removes an address record.
  - `PATCH /api/buyer/addresses/:id/default`: Atomically updates default flag across addresses in a database transaction.

---

### 2.4 Page 3: Account Security & Preferences (`/buyer/settings`)

#### 💡 In Simple Words:
> *"This page controls your privacy, notifications, and security. You can change your password, choose your preferred language (English, Hindi, Marathi), and toggle WhatsApp or SMS order alerts."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/settings`.
* **Component:** `frontend/src/pages/buyer/BuyerSettingsPage.jsx`.
* **Features:**
  1. **Notification Preferences:** Toggles for WhatsApp Procurement Alerts, SMS Out-for-Delivery Pings, Email Invoices, and Mandi Price Surge Alerts.
  2. **Regional Interface Localization:** Select preferred interface language (`English`, `हिंदी`, `मराठी`).
  3. **Security & Password Change:** Verifies old password using `bcrypt.compare`, validates new password strength, and issues new security audit logs.
* **API Endpoints:**
  - `GET /api/buyer/settings`: Fetches current preference flags.
  - `PATCH /api/buyer/settings`: Updates notification flags and localization preferences.
  - `POST /api/buyer/change-password`: Verifies current password hash and persists updated bcrypt hash.

---

### 2.5 Backend Architecture & API Contracts (Phase 2)
All Phase 2 endpoints are protected by `authenticate` (validating JWT signature and expiry) and `requireRole('BUYER')`:
- Data access strictly scoped: Buyers can **only** read and modify their own records (`where: { buyerId: req.user.buyerProfile.id }`).
- Input validation: All payloads pass through Zod schemas (`updateBuyerProfileSchema`, `addressSchema`, `changePasswordSchema`) producing standardized `422 VALIDATION_ERROR` responses on malformed input.

---

## 4. Phase 3: Agricultural Marketplace & Discovery (In-Depth & Simple)

### 3.1 Agricultural Context & The Core Problem Solved
Smallholder farmers in India typically sell to village aggregators or middleman brokers at 30% to 50% below terminal mandi rates. Meanwhile, commercial buyers pay inflated prices due to multiple layers of transportation, brokerage fees, and wastage.

Phase 3 built the **Live Agricultural Produce Marketplace** where buyers can discover fresh harvest lots aggregated directly by verified **Farmer Producer Organizations (FPOs)** and registered farmers.

---

### 3.2 Page 1: Marketplace Catalog (`/buyer/marketplace`)

#### 💡 In Simple Words:
> *"The main shopping catalog for farm produce. You can see tomatoes, onions, wheat, and turmeric listed directly by farming cooperatives, search by crop name or district, filter by organic certification, and see how much money you save compared to the government mandi price."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/marketplace`.
* **Component:** `frontend/src/pages/buyer/marketplace/MarketplacePage.jsx`.
* **Features:**
  1. **Interactive Hero Section:** Summarizes platform metrics (12 verified listings, average 14.5% below APMC Mandi benchmark rates, integrated cold chain logistics).
  2. **Search with Typeahead Autocomplete:** Debounced search querying crop names, districts, villages, and FPO names.
  3. **Dynamic Category Navigation:** Filter pills with live lot counts across `Vegetables`, `Fruits`, `Grains`, `Pulses`, and `Spices`.
  4. **Multi-Parameter Filter Sidebar:**
     - Quality Grade (`Grade A`, `Grade B`, `Grade C`, `Organic Premium`).
     - Dual-slider Price Range (₹0 to ₹500/kg).
     - Organic Certified toggle checkbox.
     - Stock Availability filter (`All Lots`, `In Stock >100kg`, `Low Stock <100kg`).
  5. **Sorting Selector:** Sort by `Recently Listed`, `Price: Low to High`, `Price: High to Low`, `Available Quantity: High to Low`, and `Freshness / Harvest Date`.
  6. **Responsive Product Grid:** Renders responsive produce cards with image fallback placeholders and skeleton loading pulses.

---

### 3.3 Page 2: Produce Detail Page (`/buyer/marketplace/products/:productId`)

#### 💡 In Simple Words:
> *"The complete specification sheet for a specific farm lot. It tells you the exact farm where it was grown, harvest date, how many days fresh it is, APMC mandi rate comparison, storage instructions, and the verified credentials of the farmer or FPO."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/marketplace/products/:productId`.
* **Component:** `frontend/src/pages/buyer/marketplace/ProductDetailPage.jsx`.
* **Features:**
  1. **Produce Gallery & Badges:** Crop visual with fallback placeholder, quality grade pill, and freshness index badge (`6d Fresh`).
  2. **APMC Mandi Rate Benchmark:** Shows direct farm gate price side-by-side with official APMC mandi benchmark (e.g. ₹18/kg vs Mandi ₹26/kg $\rightarrow$ Save 30.8%).
  3. **Batch Inventory Availability:** Shows currently available kg vs total lot harvest size with visual progress meter.
  4. **Agricultural Lot Specifications Table:** Scientific crop variety, quality grade, organic certification status, harvest date, expected shelf life, and storage conditions.
  5. **Supplier Provenance Card:** Farmer name, Aadhaar verification badge, FPO collective name, and district origin with a direct link to the supplier profile.
  6. **Related Produce Lots:** Horizontal carousel of other lots within the same category.

---

### 3.4 Page 3: Supplier & FPO Public Profile (`/buyer/marketplace/suppliers/:supplierId`)

#### 💡 In Simple Words:
> *"The public resume of a farming cooperative or individual farmer. It proves their legal authenticity (government registration number, member farmer count, verified certificates) and shows all the crops they currently have available."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/marketplace/suppliers/:supplierId`.
* **Component:** `frontend/src/pages/buyer/marketplace/SupplierProfilePage.jsx`.
* **Features:**
  1. **Supplier Hero Card:** FPO cooperative legal name (e.g. *Pune Sahakari Krishi Producer Company*), registration number (`MH-FPC-2023-001`), official district and state.
  2. **Trust & Governance Metrics:**
     - Cooperative member count (35 farmer members pooled).
     - Verified Registration Certificate badge.
     - Sourcing hub location pin.
  3. **Active Produce Inventory Catalog:** Grid of all active agricultural lots aggregated under this FPO collective.
  4. **Farmer Privacy Protection:** Strict anti-disintermediation compliance ensuring private phone numbers and personal Aadhaar records are protected while verifying trust credentials.

---

### 3.5 Key Agricultural Innovations & Components
1. **ProductCard (`ProductCard.jsx`):** Compact agricultural card displaying crop name, village/district origin, FPO attribution, APMC benchmark savings badge, stock ratio indicator bar, and direct CTA.
2. **Freshness Index Calculator:** Automatically calculates days elapsed since harvest (`Date.now() - harvestDate`) to provide buyers with accurate perishable shelf-life information.
3. **Mandi Benchmark Savings Engine:** Compares farm-gate asking prices against Agmarknet regional mandi benchmarks, highlighting true cost advantages.

---

### 3.6 Inventory Invariant & Seeding Engine
* **Mathematical Invariant:**
  $$\text{availableQtyKg} = \max(0, \text{totalQuantityKg} - \text{reservedQty} - \text{soldQty})$$
  Ensures that inventory is never oversold or double-booked.
* **Authoritative Seed Database (`seed.js`):**
  Seeds 12 authentic agricultural lots into PostgreSQL across Maharashtra corridors:
  - *Grade A Tomatoes* (Manchar village, Pune)
  - *Nashik Red Onions (Lots A, B, and C)*
  - *Salem Turmeric Fingers* (Walwa, Sangli)
  - *Tur Dal / Pigeon Pea* (Ausa, Latur)
  - *Sharbati Golden Wheat* (Ashta, Sehore), etc.

---

### 3.7 Backend Architecture & API Contracts (Phase 3)
* `GET /api/marketplace/categories`: Groups active listings by category and computes live item counts and starting prices.
* `GET /api/marketplace/products`: Comprehensive multi-parameter search, filtering, and sorting endpoint supporting pagination.
* `GET /api/marketplace/products/:id`: Retrieves lot details, mandi savings benchmarks, and related produce lots.
* `GET /api/marketplace/suppliers/:supplierId`: Fetches public FPO/farmer trust credentials.
* `GET /api/marketplace/suppliers/:supplierId/products`: Lists all active lots belonging to a specific supplier.
* `GET /api/marketplace/search/suggestions`: Fast typeahead autocomplete for crops and districts.

---

## 5. Phase 4: Supplier Comparison, Price Transparency & Total Landed Cost (In-Depth & Simple)

### 5.1 Agricultural Context & Why Total Landed Cost Matters

#### 💡 In Simple Words:
> *"When buying 500 kg of onions, the cheapest farm price isn't always the best deal! If Farm A sells at ₹18/kg but is 150 km away with high truck freight, while Farm B sells at ₹20/kg just 15 km away, Farm B might actually be cheaper overall. Phase 4 gives buyers an interactive calculator and side-by-side comparison matrix showing the real **Total Landed Cost** (Produce Price + Two-Tier Delivery Truck Freight + Handling + Platform Fee) so buyers make smart, transparent procurement decisions."*

#### 🔍 Detailed Technical Context:
In agricultural B2B and institutional procurement, listed farm-gate prices represent only a fraction of total procurement expenditures. A procurement manager must evaluate:
1. **Landed Logistics Freight:** Heavy perishable commodities require specialized transport (e.g. 2.5T refrigerated trucks, tempos). Freight costs scale directly with distance and vehicle type.
2. **Handling & Consolidation Fees:** Labor costs for loading, sorting, and aggregation at rural FPO centers.
3. **Quality & Grade Discrepancies:** Grade A export quality vs Grade B standard commercial grade.
4. **Minimum Order Quantities (MOQs):** Distinguishing retail consumer quantities ($5\text{ kg}$) from commercial freight thresholds ($50\text{--}100\text{ kg}$).
5. **Statutory Tax Exemption:** Clear verification that raw unprocessed agricultural produce is 0% GST exempt under Indian Tax Codes.

Phase 4 built the complete **Multi-Supplier Comparison & Total Landed Cost Engine** to solve these challenges.

---

### 5.2 Comparison Selection Tray & Management (`ComparisonSelectionBar` & `ProductCompareButton`)

#### 💡 In Simple Words:
> *"Whenever you browse produce cards or open a crop detail page, you will see a 'Compare' button. Clicking it adds that crop to a floating comparison bar at the bottom of your screen. You can select 2 to 4 crops to compare side-by-side, remove them, or clear them anytime."*

#### 🔍 Detailed Technical Breakdown:
* **Components:**
  - [`ProductCompareButton.jsx`](file:///C:/Users/ganga/OneDrive/Desktop/capstone-fpo/SasyaVahini/frontend/src/components/buyer/comparison/ProductCompareButton.jsx): Compact toggle for product cards and prominent button for detail pages.
  - [`ComparisonSelectionBar.jsx`](file:///C:/Users/ganga/OneDrive/Desktop/capstone-fpo/SasyaVahini/frontend/src/components/buyer/comparison/ComparisonSelectionBar.jsx): Sticky floating tray at the bottom of the buyer viewport.
  - [`CompareContext.jsx`](file:///C:/Users/ganga/OneDrive/Desktop/capstone-fpo/SasyaVahini/frontend/src/context/CompareContext.jsx): Global React state provider wrapped in `main.jsx`.
* **Rules & Invariants:**
  1. **Strict 2–4 Limit:** Requires at least 2 listings to compare; caps maximum selection at 4 listings to prevent unusable UI overflow.
  2. **Duplicate Prevention:** Toggling an already-selected lot removes it cleanly without duplicate keys.
  3. **Cross-Navigation Persistence:** Selection state synchronizes with `sessionStorage` (`sasyavahini_buyer_compare_v1`), preserving selections when navigating between tabs.
  4. **Commodity Warning:** Automatically detects if a buyer selects different produce commodities (e.g. *Tomato* vs *Onion*) and issues an advisory toast notification.

---

### 5.3 Dedicated Comparison Page (`/buyer/compare`)

#### 💡 In Simple Words:
> *"The dedicated side-by-side comparison screen. It puts 2 to 4 chosen farm lots next to each other in a clean grid, compares their unit prices, quality grades, stock availability, and road distance, and lets you enter a quantity to see the exact total cost breakdown."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/compare` (also reachable via URL params: `/buyer/compare?items=id1,id2`).
* **Component:** [`frontend/src/pages/buyer/comparison/ComparisonPage.jsx`](file:///C:/Users/ganga/OneDrive/Desktop/capstone-fpo/SasyaVahini/frontend/src/pages/buyer/comparison/ComparisonPage.jsx).
* **Navigation Integration:** Directly integrated into `BuyerDashboard.jsx` top navigation tabs with an active item count badge (`Compare Produce (N)`).
* **Persona Switching:** Top toggle switches between **Consumer (B2C) Mode** and **Wholesale (B2B) Mode**, updating display emphasis between retail packaging vs bulk MOQs.
* **Commodity Comparability Banner:**
  - **Identical Commodity:** Green badge: *"Direct side-by-side comparison across verified [Crop] suppliers."*
  - **Different Commodities/Varieties:** Amber warning banner explaining that price differences reflect differing crop characteristics.

---

### 5.4 Standard Unit Price Normalization (kg, Quintal, Metric Tonne)

#### 💡 In Simple Words:
> *"Wholesale buyers buy in quintals or tonnes, while household consumers buy in kilograms. This feature automatically converts every listed price into standard Indian agricultural units so you can compare rates accurately."*

#### 🔍 Detailed Technical Breakdown:
To eliminate confusion across different packaging formats, the backend normalizes all listing prices into standard metrics:
- **Price per Kilogram ($1\text{ kg}$):** Original base listing rate (e.g. ₹$20/\text{kg}$).
- **Price per Quintal ($100\text{ kg}$):** $\text{askingPricePerKg} \times 100$ (e.g. ₹$2,000/\text{qtl}$).
- **Price per Metric Tonne ($1,000\text{ kg}$):** $\text{askingPricePerKg} \times 1,000$ (e.g. ₹$20,000/\text{t}$).
- **APMC Mandi Benchmark:** Compares each supplier's rate against the current official Agmarknet terminal rate, showing direct farm savings percentages.

---

### 5.5 Quality Grade, Inspection & Freshness Comparison Matrix

#### 💡 In Simple Words:
> *"Not all produce is equal. Here you can see Grade A vs Grade B, whether it is organic certified, how many days ago it was harvested, what crates it is packed in, and whether the platform verified the farm inspection."*

#### 🔍 Detailed Technical Breakdown:
* **Quality Grade:** `Grade A` (Premium export/retail), `Grade B` (Standard commercial), `Grade C` (Processing), `Organic Premium`.
* **Platform Inspection Status:** Differentiates *"Platform Verified Inspection"* (FPO certificate or Aadhaar KYC verified) from *"Farmer Declared"*.
* **Harvest Freshness Index:** Dynamic counter showing days since harvest.
* **Packaging & Storage Specifications:**
  - Vegetables / Fruits: Ventilated food-grade crates with cold-chain recommendation ($10\text{--}14^\circ\text{C}$).
  - Grains / Pulses: Moisture-resistant aerated jute gunny bags with ambient dry storage.

---

### 5.6 Interactive Total Landed Cost Calculator Widget & Mathematical Formula

#### 💡 In Simple Words:
> *"Type in how many kilograms you want to buy (e.g., 100 kg or 500 kg), and the calculator instantly computes the exact bill for each supplier: product cost + delivery truck freight + ₹0.50/kg handling fee + 2% platform fee. It also checks if the supplier actually has enough stock to fulfill your order!"*

#### 🔍 Mathematical Formula & Auditable Components:
$$\text{Total Landed Cost} = \text{Product Cost} + \text{Two-Tier Delivery Cost} + \text{Handling Fee} + \text{Platform Fee} - \text{Bulk Incentive}$$

Where:
1. **$\text{Product Cost} = \text{askingPricePerKg} \times \text{quantityKg}$**
2. **$\text{Two-Tier Delivery Cost}$:** Calculated using Shanmukhananda's vehicle fleet specifications and road distance:
   $$\text{Delivery Cost} = \text{Base Fare} + (\text{Road Km} \times \text{Vehicle Per-Km Rate})$$
   - Payload $\le 1,500\text{ kg} \rightarrow$ **Tempo** ($\text{Base Fare: } ₹500, \text{Rate: } ₹18/\text{km}$)
   - Payload $1,501\text{ to } 3,000\text{ kg} \rightarrow$ **Mini-Truck** ($\text{Base Fare: } ₹800, \text{Rate: } ₹24/\text{km}$)
   - Payload $> 3,000\text{ kg} \rightarrow$ **Truck** ($\text{Base Fare: } ₹1,500, \text{Rate: } ₹32/\text{km}$)
   - Local district deliveries ($\le 10\text{ km}$): Flat 50% base fare discount.
3. **$\text{Handling & Aggregation Fee} = ₹0.50/\text{kg} \times \text{quantityKg}$** (from `logistics.config.js`).
4. **$\text{Platform Facilitation Fee} = \text{Product Cost} \times 2\%$** (from `logistics.config.js`).
5. **$\text{Taxes} = ₹0.00$** (Raw agricultural produce is 0% GST exempt under GST Notification No. 2/2017-Central Tax).
6. **$\text{Bulk Volume Incentive} = \text{Product Cost} \times 3\%$** for bulk orders $\ge 1,000\text{ kg}$.

#### 📊 Live Fulfillment Invariants:
- **`CAN_FULFILL` (Green Badge):** Supplier inventory has sufficient available stock ($\text{availableQtyKg} \ge \text{quantityKg}$) and meets MOQ.
- **`INSUFFICIENT_STOCK` (Red Badge):** Displays exact shortfall: $-\text{shortfallKg} = \text{quantityKg} - \text{availableQtyKg}$.
- **`BELOW_MINIMUM_ORDER` (Amber Badge):** Requested quantity is below supplier MOQ threshold.

---

### 5.7 Cross-Module Teammate Integrations in Phase 4

| Teammate / Module | How it Integrates into Phase 4 Buyer Comparison |
| :--- | :--- |
| **Member 2: Shankar Narayana Reddy** (`feature/farmer-fpo`) | Supplies authoritative crop lots from the PostgreSQL `ProduceListing` table, FPO legal entity names, smallholder member counts, and verified farmer credentials. |
| **Member 4: Shanmukhananda Reddy** (`feature/logistic`) | Supplies Two-Tier Logistics fleet tiers (Tempo, Mini-Truck, Truck), per-km vehicle rates from [`logistics.config.js`](file:///C:/Users/ganga/OneDrive/Desktop/capstone-fpo/SasyaVahini/backend/src/config/logistics.config.js), and road distance estimation using `estimatedRoadKm()` from [`utils/geo.js`](file:///C:/Users/ganga/OneDrive/Desktop/capstone-fpo/SasyaVahini/backend/src/utils/geo.js). |
| **Member 5: Gowtham Reddy** (`feature/demand-forecasting`) | Supplies regional Agmarknet terminal Mandi modal benchmark rates and savings percentages against terminal markets. |

---

### 5.8 Price Transparency, Audit Disclosures & Agmarknet 7-Day History

#### 💡 In Simple Words:
> *"We don't show fake discounts or invented prices. Everything is backed by government APMC mandi data, official GST rules, and true distance-based transport costs. If historical data exists for a crop, we show the real 7-day price trend."*

#### 🔍 Detailed Technical Breakdown:
- **Audit Disclosures Card:** Transparently explains the four pillars of SasyaVahini pricing (Direct Farm Gate Price, Two-Tier Logistics formula, Handling Fee, and 0% GST tax exemption).
- **Objective Highlights:** Labels individual objective metrics (*Lowest Product Price*, *Lowest Landed Cost*, *Highest Available Stock*, *Lowest Delivery Distance*) rather than an arbitrary "Best Supplier" label.
- **7-Day Agmarknet Price Trajectory:** For crops with historical data (e.g. *Tomato*, *Onion*), calls `GET /api/marketplace/compare/price-history` to render a 7-day terminal mandi modal rate trend table. Strictly omits fake data if no records exist.

---

### 5.9 Backend Architecture & API Contracts (Phase 4)

#### 1. `GET /api/marketplace/compare` (and `/api/buyer/compare`)
* **Query Parameters:** `ids=id1,id2,id3`, `sampleQuantityKg=100`, `buyerType=INDIVIDUAL|BUSINESS`, `destLat`, `destLng`.
* **Validation:** Rejects requests with fewer than 2 IDs or more than 4 IDs with structured `422 VALIDATION_ERROR`.
* **Response Payload:** Returns commodity comparability status, normalized unit prices (kg, qtl, tonne), quality grades, freshness, supplier provenance, and estimated logistics delivery charges.

#### 2. `POST /api/marketplace/compare/calculate` (and `/api/buyer/compare/calculate`)
* **Request Body:** `{ listingIds: string[], quantityKg: number, destLat?: number, destLng?: number, buyerType?: string }`.
* **Validation:** Validates array length ($2\text{--}4$) and quantity ($1\text{ to }50,000\text{ kg}$).
* **Response Payload:** Returns detailed cost breakdown (product cost, delivery cost, handling fee, platform fee, taxes, bulk discount, total landed cost, and effective rate per kg) and fulfillment capability flags for every supplier.

#### 3. `GET /api/marketplace/compare/price-history` (and `/api/buyer/compare/price-history`)
* **Query Parameters:** `crop=Tomato`.
* **Response Payload:** Returns 7-day Agmarknet corridor modal price points or transparent notice if historical records are pending.

---

## 6. Strict Scope Boundary & Security Rules

To ensure clean architecture and avoid premature implementation of future phases:
- ❌ **No Shopping Cart / Checkout:** Preserved existing navigation placeholders without premature order contracting.
- ❌ **No Payments / Escrow Gateway:** Payment gateway and escrow release triggers strictly belong to Phase 5.
- ❌ **No Changes to Teammate Portals:** Zero modifications to `/farmer`, `/fpo`, `/logistics`, or `/admin`. All cross-module communication operates through shared database entities and service interfaces.
- 🔒 **Security & Validation:** All comparison requests are validated server-side. The backend never trusts client-supplied financial totals or logistics rates.

---

## 7. Complete Verification & Automated Test Results

### 🧪 Frontend Vitest Test Suite (`npm test`)
```
 RUN  v1.6.1 /app/frontend

 ✓ src/test/listingHelpers.test.js  (4 tests)
 ✓ src/test/voiceFormParser.test.js  (7 tests)
 ✓ src/test/components.test.jsx  (4 tests)
 ✓ src/test/buyerAuth.test.jsx  (3 tests)
 ✓ src/test/buyerPhase2.test.jsx  (7 tests)
 ✓ src/test/MarketplacePhase3.test.jsx  (4 tests)
 ✓ src/test/BuyerComparisonPhase4.test.jsx  (4 tests)

 Test Files  7 passed (7)
      Tests  33 passed (33) (100% SUCCESS RATE)
   Duration  5.43s
```

### 📦 Frontend Production Build (`vite build`)
```
vite v5.4.21 building for production...
✓ 1670 modules transformed.
dist/index.html                     0.74 kB │ gzip:   0.43 kB
dist/assets/index-6pzUAH-a.css    140.89 kB │ gzip:  28.74 kB
dist/assets/index-CrFk8RRe.js   1,112.83 kB │ gzip: 308.65 kB
✓ built in 27.71s with 0 errors.
```

### ⚙️ Backend Jest Test Suite (`npx jest --runInBand --forceExit`)
```
PASS tests/logistics.unit.test.js
PASS tests/auth.test.js
PASS tests/buyerPhase2.test.js
PASS tests/farmerFpoPortal.test.js
PASS tests/two-tier-logistics.test.js
PASS tests/buyerMarketplacePhase3.test.js
PASS tests/marketplace.test.js
PASS tests/farmerFpoBusinessRules.test.js

Test Suites: 8 passed, 8 total
Tests:       103 passed, 103 total (100% SUCCESS RATE)
Snapshots:   0 total
Time:        13.035 s
```

---

## 8. Comprehensive Files & Components Summary

### Phase 4 Files Created:
| File Path | Description |
| :--- | :--- |
| `frontend/src/context/CompareContext.jsx` | Global React context for managing comparison selection (2–4 limit, sessionStorage, duplicate prevention). |
| `frontend/src/components/buyer/comparison/ComparisonSelectionBar.jsx` | Sticky floating comparison bar with crop chips, counter, "Compare Now", and "Clear" actions. |
| `frontend/src/components/buyer/comparison/ProductCompareButton.jsx` | Reusable compare toggle button with compact and standard variants. |
| `frontend/src/pages/buyer/comparison/ComparisonPage.jsx` | Complete comparison dashboard with side-by-side specs, Total Landed Cost calculator, and audit disclosures. |
| `frontend/src/test/BuyerComparisonPhase4.test.jsx` | Vitest suite testing comparison selection, button toggles, floating tray, and comparison page. |

### Phase 4 Files Modified (Buyer Module Only):
| File Path | Description |
| :--- | :--- |
| `backend/src/controllers/marketplace.controller.js` | Implemented `getComparisonData`, `calculateLandedCost`, and `getPriceHistory` with logistics and APMC integrations. |
| `backend/src/routes/marketplace.routes.js` | Registered comparison endpoints (`/compare`, `/compare/calculate`, `/compare/price-history`). |
| `backend/src/routes/buyer.routes.js` | Registered comparison endpoints under `/api/buyer/compare`. |
| `frontend/src/services/marketplaceApi.js` | Added client methods for `getComparisonData`, `calculateLandedCost`, and `getPriceHistory`. |
| `frontend/src/components/buyer/marketplace/ProductCard.jsx` | Embedded `ProductCompareButton` into produce card header badges. |
| `frontend/src/pages/buyer/marketplace/ProductDetailPage.jsx` | Embedded standard `ProductCompareButton` alongside produce specifications. |
| `frontend/src/pages/buyer/BuyerDashboard.jsx` | Integrated tab routing for `/buyer/compare`, top navigation pill, and floating `<ComparisonSelectionBar />`. |
| `frontend/src/main.jsx` | Mounted `<CompareProvider>` into global application root. |
| `frontend/src/styles/marketplace.css` | Added styling for comparison matrix, floating bar, and calculator cards. |

---

## 9. Viva / Presentation Speaking Script & Model Q&A

### 🎤 Presentation Speaking Script (2-Minute Summary)
> *"Respected evaluators, in **Phase 4**, we implemented the **Supplier Comparison, Price Transparency & Total Landed Cost Engine** based on Problem Statement ID 26033.*  
>  
> *A major flaw in agricultural procurement is that buyers focus solely on the listed farm-gate price without considering transportation freight and handling. In SasyaVahini, buyers can select 2 to 4 produce lots directly from the marketplace and compare them side-by-side.*  
>  
> *We introduced four key technical innovations:*  
> *1. **Standard Unit Price Normalization:** Converting farm rates automatically into Price per Kilogram, Price per Quintal ($100\text{ kg}$), and Price per Tonne ($1,000\text{ kg}$).*  
> *2. **Interactive Total Landed Cost Calculator:** An auditable calculator that accepts a procurement quantity (e.g., $100\text{ kg}$ or $500\text{ kg}$) and computes: Produce Cost + Two-Tier Road Freight (calculated via Shanmukhananda's vehicle fleet rates and road distance) + Handling Fee (₹0.50/kg) + Platform Fee (2%) with verified 0% GST exemption.*  
> *3. **Live Fulfillment Invariant Validation:** Checking real-time inventory to verify whether a supplier can fulfill the requested quantity, flagging stock shortfalls or MOQ violations.*  
> *4. **Objective Sourcing Highlights:** Objectively highlighting lowest product price, lowest landed cost, and highest stock without biased or fabricated 'Best Supplier' labels.*  
>  
> *All 103 backend tests and 33 frontend tests are passing with a 100% success rate, and Vite compiles cleanly with zero errors."*

---

### ❓ Model Q&A for Evaluators

#### Q1: Why is Total Landed Cost calculation superior to standard marketplace price comparison?
**Answer:**  
*"Agricultural commodities are bulky and perishable. A farm selling onions at ₹18/kg that is 200 km away will incur significantly higher road freight charges than an FPO selling at ₹20/kg located 15 km away. Our Total Landed Cost calculator integrates with Member 4's Two-Tier Logistics engine to compute the true delivered cost per kilogram, ensuring buyers make economically sound decisions."*

#### Q2: How does your comparison engine normalize prices across different units?
**Answer:**  
*"The database stores produce rates in standard ₹/kg. The backend normalizes this into commercial agricultural metrics: Price/kg $\times 100$ for Price per Quintal, and $\times 1,000$ for Price per Metric Tonne. This allows both household consumers buying in kilograms and institutional wholesalers buying in quintals or tonnes to evaluate pricing in their preferred trading unit."*

#### Q3: How do you handle commodity differences when a buyer selects different produce types?
**Answer:**  
*"The comparison engine parses crop names and categories server-side. If the buyer selects identical crops (e.g. all tomatoes), it displays a green 'Identical Commodity' badge. If varieties differ or if different categories are selected (e.g. tomatoes vs onions), the system presents an amber transparency banner warning the buyer that price and quality metrics reflect distinct commodity characteristics."*

#### Q4: Why are taxes calculated as ₹0 in the landed cost breakdown?
**Answer:**  
*"Under Indian tax regulations (GST Notification No. 2/2017-Central Tax), fresh, unprocessed agricultural produce is exempt from GST (0% tax rate). Rather than omitting tax information or inventing percentages, our calculator explicitly discloses the ₹0 tax line and cites the legal statutory exemption for complete financial transparency."*

---
*Maintained by Member 3 (Buyer & Marketplace Module) — SasyaVahini Team.*
