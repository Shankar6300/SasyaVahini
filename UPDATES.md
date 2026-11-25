# 🌾 SasyaVahini (सस्यवाहिनी) — Project Progress & Completed Updates

> **Problem Statement ID:** 26033 (Ministry of Consumer Affairs, Food & Public Distribution - DoCA)  
> **Project Name:** SasyaVahini — Digital Agricultural Marketplace connecting Indian Farmers & FPOs directly with Consumers & Institutional Buyers  
> **Module Owner:** Member 3 (Ganga Satish — Buyer Portal & Agricultural Marketplace)  
> **Current Status:**  
> - Phase 1: Foundation, Architecture, Docker & Buyer Authentication — **COMPLETED**  
> - Phase 2: Buyer Profile, Address Management & Account Settings — **COMPLETED**  
> - Phase 3: Agricultural Marketplace, Product Discovery & FPO Integration — **COMPLETED**  
> - Phase 4: Supplier Comparison, Price Transparency & Total Landed Cost — **COMPLETED**  
> - Phase 5: Shopping Cart, Stock Invariants & Checkout Preparation — **COMPLETED**  
> - Phase 6: Secure Payment Gateway Integration & Automated Tax Invoices — **COMPLETED**  
> - Phase 7: Order Management, Multi-Supplier Fulfilment & Two-Tier Logistics Tracking — **COMPLETED**  

---

## 📋 Table of Contents
1. [Executive Summary & Completed Phases at a Glance](#1-executive-summary--completed-phases-at-a-glance)
2. [Phase 1 Recap: Foundation & Authentication](#2-phase-1-recap-foundation--authentication)
3. [Phase 2: Buyer Profile, Addresses & Account Settings (In-Depth & Simple)](#3-phase-2-buyer-profile-addresses--account-settings-in-depth--simple)
4. [Phase 3: Agricultural Marketplace & Discovery (In-Depth & Simple)](#4-phase-3-agricultural-marketplace--discovery-in-depth--simple)
5. [Phase 4: Supplier Comparison, Price Transparency & Total Landed Cost (In-Depth & Simple)](#5-phase-4-supplier-comparison-price-transparency--total-landed-cost-in-depth--simple)
6. [Phase 5: Shopping Cart, Stock Invariants & Checkout Preparation (In-Depth & Simple)](#6-phase-5-shopping-cart-stock-invariants--checkout-preparation-in-depth--simple)
7. [Phase 6: Secure Payment Gateway Integration & Automated Tax Invoices (In-Depth & Simple)](#7-phase-6-secure-payment-gateway-integration--automated-tax-invoices-in-depth--simple)
8. [Phase 7: Order Management, Multi-Supplier Fulfilment & Two-Tier Logistics Tracking (In-Depth & Simple)](#8-phase-7-order-management-multi-supplier-fulfilment--two-tier-logistics-tracking-in-depth--simple)
9. [Strict Scope Boundary & Enterprise Security Rules across All Phases](#9-strict-scope-boundary--enterprise-security-rules-across-all-phases)
10. [Complete Verification & Automated Test Results](#10-complete-verification--automated-test-results)
11. [Comprehensive Master Files & Components Summary](#11-comprehensive-master-files--components-summary)
12. [Viva / Presentation Speaking Script & Model Q&A (Phases 4, 5, 6, 7)](#12-viva--presentation-speaking-script--model-qa-phases-4-5-6-7)

---

## 1. Executive Summary & Completed Phases at a Glance

SasyaVahini is built to bridge the gap between rural Indian agriculture (smallholder farmers aggregated through Farmer Producer Organizations) and urban procurement (individual households as well as restaurants, food processors, and wholesale retailers).

| Phase | Module / Capability | Status | Key Highlights |
| :--- | :--- | :---: | :--- |
| **Phase 1** | **Foundation & Buyer Onboarding** | ✅ **COMPLETED** | Docker compose, PostgreSQL 15 via Prisma, JWT security, Dual-mode registration (Consumer vs Business), Forgot/Reset password. |
| **Phase 2** | **Buyer Profile & Account Workspace** | ✅ **COMPLETED** | Sourcing preferences, GSTIN validation, Multi-address management with default selector, Notification settings, Password security engine. |
| **Phase 3** | **Marketplace Discovery & FPO Integration** | ✅ **COMPLETED** | Dynamic categories, multi-param search & filtering, live APMC Mandi savings badges, stock inventory tracking, detailed crop specifications, verified supplier profiles. |
| **Phase 4** | **Supplier Comparison & Total Landed Cost** | ✅ **COMPLETED** | Multi-supplier comparison (2–4 lots), unit price normalization (kg/qtl/tonne), interactive Total Landed Cost calculator, Two-Tier Logistics integration, Agmarknet history. |
| **Phase 5** | **Shopping Cart & Checkout Preparation** | ✅ **COMPLETED** | Supplier-wise item grouping, dynamic MOQ & stock invariant validation, delivery address linkage, auditable cost breakdown, checkout summary ledger review. |
| **Phase 6** | **Payment Gateway & Tax Invoices** | ✅ **COMPLETED** | Multi-payment selector (UPI, Cards, Net Banking, Escrow), cryptographic HMAC-SHA256 signature verification, authoritative server-side recalculation, pure Node.js vector PDF tax invoices (0% GST compliant). |
| **Phase 7** | **Order Lifecycle & Two-Tier Logistics** | ✅ **COMPLETED** | Payment-to-order pipeline, multi-supplier fulfillment decomposition (`SupplierOrder`), immutable item snapshots (`OrderItem`), atomic stock deduction/rollback, 6-digit OTP delivery verification, real-time milestone tracking. |

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

## 6. Phase 5: Shopping Cart, Stock Invariants & Checkout Preparation (In-Depth & Simple)

### 6.1 Agricultural Context & The Procurement Aggregation Challenge
In agricultural e-commerce, shopping carts cannot behave like standard retail carts. Agricultural procurement involves distinct operational challenges:
1. **Multi-Supplier Mixed Consignments:** A buyer often procures produce from multiple distinct farmers or FPO hubs in a single transaction (e.g., $500\text{ kg}$ Grade A Tomatoes from Nashik Krishi FPO and $200\text{ kg}$ Grade B Onions from Pune Organic FPO). These lots originate from different geographic coordinates and cannot be arbitrarily merged.
2. **Dynamic Minimum Order Quantities (MOQs):** Different buyers and produce categories have different minimum volume thresholds. Commercial business buyers purchase in commercial batches ($\ge 50\text{--}100\text{ kg}$), while individual consumers purchase in household lots ($5\text{--}10\text{ kg}$).
3. **Perishable Inventory Volatility:** Farm produce is perishable and harvested in limited batch sizes. Real-time available stock ($\text{availableQtyKg}$) must be strictly enforced before payment preparation.

Phase 5 built the complete **Shopping Cart, Stock Invariant Validation, and Checkout Preparation Engine** for SasyaVahini.

---

### 6.2 Component 1: Multi-Entry Add to Cart System (`AddToCartButton.jsx`)

#### 💡 In Simple Words:
> *"Whether you are looking at produce cards in the marketplace, browsing a supplier's profile, or reading a detailed crop inspection report, one clean button lets you add the crop to your cart. It automatically checks whether the farm actually has enough stock and sets the right minimum order quantity for your buyer type."*

#### 🔍 Detailed Technical Breakdown:
* **Component:** `frontend/src/components/buyer/cart/AddToCartButton.jsx`.
* **Placement:** Embedded in `ProductCard.jsx`, `ProductDetailPage.jsx`, and supplier inventory lists.
* **Intelligent MOQ Computation:**
  - Individual Consumers: Defaults to $5\text{ kg}$ (or $10\text{ kg}$ for grains/pulses).
  - Business Buyers: Defaults to $50\text{ kg}$ (or $100\text{ kg}$ for bulk lots $\ge 1,000\text{ kg}$).
* **Modes:** Compact variant (`+ Cart`) for dense grids; Full variant with quantity stepper and live order subtotal calculation for specification pages.
* **Safety Invariant:** Disables automatically with an *"Out of Stock"* badge when $\text{availableQtyKg} \le 0$, preventing impossible order attempts.

---

### 6.3 Component 2: Procurement Shopping Cart Page (`/buyer/cart` & `CartPage.jsx`)

#### 💡 In Simple Words:
> *"Your central order workbench. You can review all selected crops, increase or decrease quantities in farm-standard increments, see itemized subtotals, and clear your cart or proceed directly to checkout."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/cart` (accessible via sidebar, header badge, and `/buyer/cart`).
* **Component:** `frontend/src/pages/buyer/cart/CartPage.jsx`.
* **Features:**
  - Reactive cart state synchronized via `CartContext` and cached to `sessionStorage`.
  - Itemized quantity adjustment with optimistic UI updates and server-side debouncing.
  - Visual summary card indicating total procurement volume ($\text{kg}$), commodity subtotal, estimated logistics freight, and platform fee.
  - Zero-state handling: Clear empty cart illustration with a direct CTA to *"Browse Marketplace"*.

---

### 6.4 Component 3: Supplier-Wise Item Partitioning (`SupplierGroupedCart.jsx` & `CartItem.jsx`)

#### 💡 In Simple Words:
> *"Because crops come from different farms across Maharashtra and India, the cart groups your items by supplier. You see exactly which FPO or farmer is fulfilling which crop, their registered district, and their specific subtotal."*

#### 🔍 Detailed Technical Breakdown:
* **Components:** `frontend/src/components/buyer/cart/SupplierGroupedCart.jsx` and `CartItem.jsx`.
* **Partitioning Logic:** Automatically groups cart line items by `supplierId` (FPO legal entity or registered individual farmer).
* **Supplier Header Metadata:** Displays Supplier Legal Name, District/State, Registration Type (`FPO Collective` vs `Individual Farmer`), and Supplier Subtotal.
* **Line Item Metrics:** High-resolution crop image, Crop Name, Variety, Quality Grade badge (`GRADE A`, `GRADE B`, `ORGANIC`), Unit Rate (₹/kg), and total item cost.

---

### 6.5 Component 4: Dynamic Minimum Order Quantity (MOQ) & Real-Time Stock Validation

#### 💡 In Simple Words:
> *"The system guarantees you never accidentally order less than a farm's minimum packing size, and you can never order more than what is currently sitting in the farmer's cold storage or aggregation center."*

#### 🔍 Validation Invariants:
1. **MOQ Invariant:**
   $$\text{orderQtyKg} \ge \text{MOQ}$$
   Attempts to decrement below MOQ trigger a helpful alert and prompt for line item removal instead.
2. **Stock Ceiling Invariant:**
   $$\text{orderQtyKg} \le \text{availableQtyKg}$$
   If another buyer purchases stock while an item sits in the cart, the system flags the shortfall with an amber warning banner and auto-adjusts to the maximum available balance.

---

### 6.6 Component 5: Delivery Address Selection & Logistics Linking (`AddressSelector.jsx`)

#### 💡 In Simple Words:
> *"Pick which warehouse, grocery store, or home address the produce should be delivered to. The system pulls your saved addresses from Phase 2 and uses the destination coordinates to calculate true road freight."*

#### 🔍 Detailed Technical Breakdown:
* **Component:** `frontend/src/components/buyer/checkout/AddressSelector.jsx`.
* **Integration:** Reuses Phase 2 `BuyerAddress` records directly.
* **Address Cards:** Displays Recipient Name, Full Postal Address, Contact Number, and Tag (`WAREHOUSE`, `BUSINESS`, `HOME`, `BILLING`).
* **In-Line Creation:** Allows adding a new delivery destination on-the-fly without losing cart state.

---

### 6.7 Component 6: Transparent Landed Cost Breakdown & Checkout Review (`CheckoutPage.jsx` & `CheckoutSummary.jsx`)

#### 💡 In Simple Words:
> *"Before you pay a single rupee, you get a 100% transparent cost sheet: crop cost + road freight + handling fee + 2% platform fee, with a clear 0% GST statutory tax line. No hidden surcharges."*

#### 🔍 Financial Breakdown Components:
$$\text{Checkout Total} = \text{Produce Subtotal} + \text{Two-Tier Freight} + \text{Handling Fee} + \text{Platform Fee} - \text{Bulk Incentive}$$
* **Produce Subtotal:** Authoritative sum of $\text{unitPrice} \times \text{quantity}$ across all active cart items.
* **Two-Tier Road Freight:** Calculated via road distance to selected destination address using Member 4's fleet rules.
* **Handling & Sorting Fee:** ₹$0.50/\text{kg}$ for physical unloading and crate consolidation.
* **Platform Facilitation Fee:** $2\%$ platform maintenance charge.
* **Statutory Taxes:** ₹$0.00$ explicitly declared with statutory citation (*GST Notification No. 2/2017-Central Tax for unprocessed agricultural produce*).

---

### 6.8 Backend Architecture & API Contracts (Phase 5)

#### 1. `GET /api/buyer/cart`
* **Headers:** `Authorization: Bearer <jwt>`
* **Response Payload:** Returns active cart object, itemized listings, computed supplier groups, and aggregate subtotal.

#### 2. `POST /api/buyer/cart/add`
* **Request Body:** `{ listingId: string, quantityKg: number }`
* **Validation:** Checks listing existence, status (`ACTIVE`), available stock, and MOQ threshold.
* **Response Payload:** Returns updated cart with newly added or incremented line item.

#### 3. `PATCH /api/buyer/cart/items/:id`
* **Request Body:** `{ quantityKg: number }`
* **Validation:** Enforces $\text{quantityKg} \ge \text{MOQ}$ and $\le \text{availableQtyKg}$.

#### 4. `DELETE /api/buyer/cart/items/:id` & `DELETE /api/buyer/cart`
* **Behavior:** Removes single line item or purges entire cart atomically.

#### 5. `POST /api/buyer/cart/checkout-summary`
* **Request Body:** `{ addressId: string }`
* **Validation:** Verifies address belongs to authenticated buyer, recalculates server-side freight and totals.

---

## 7. Phase 6: Secure Payment Gateway Integration & Automated Tax Invoices (In-Depth & Simple)

### 7.1 Agricultural Payment Challenges & Escrow Mechanics in Indian Agri-Trade
Agricultural trade in India has historically suffered from payment defaults, post-harvest price renegotiations, and delayed settlement cycles (often 30–90 days in traditional mandis).
Phase 6 resolves this by integrating a **Secure Payment Processing and Automated Tax Invoicing System**:
- **Multi-Method Gateway:** Supports retail payments (UPI, Cards, Net Banking) as well as commercial B2B bank settlements (Escrow / NEFT / RTGS).
- **Zero-Trust Financial Architecture:** The backend never trusts client-submitted monetary values. All prices, weights, and delivery charges are recalculated authoritatively from the PostgreSQL database.
- **Cryptographic Signature Verification:** Enforces HMAC-SHA256 signature verification on every transaction.
- **Automated Tax Invoices:** Generates verifiable, pure Node.js vector PDF invoices compliant with Indian GST laws immediately upon successful payment verification.

---

### 7.2 Component 1: Multi-Channel Payment Method Selector (`PaymentMethodSelector.jsx`)

#### 💡 In Simple Words:
> *"Choose how you want to pay: scan an instant UPI QR code with Google Pay or PhonePe, enter your debit/credit card, use Net Banking across all Indian banks, or select Institutional Escrow for large commercial bulk consignments."*

#### 🔍 Detailed Technical Breakdown:
* **Component:** `frontend/src/components/buyer/payment/PaymentMethodSelector.jsx`.
* **Channels Supported:**
  1. `UPI`: Instant settlement via VPA / QR (Google Pay, PhonePe, Paytm, BHIM).
  2. `CARD`: Debit and Credit cards (Visa, MasterCard, RuPay) with 3D Secure OTP verification.
  3. `NETBANKING`: Instant account debit across 50+ Indian commercial banks.
  4. `ESCROW_NEFT`: Institutional B2B escrow hold — funds are safely locked in escrow and released only upon buyer delivery OTP handshake.
* **Security Badges:** 256-bit SSL encryption, RBI Payment Aggregator Guidelines compliant, zero card details stored on SasyaVahini servers.

---

### 7.3 Component 2: Secure Payment Gateway Modal & Checkout Orchestration (`PaymentModal.jsx`)

#### 💡 In Simple Words:
> *"A sleek, distraction-free checkout window that opens right when you click Pay. It securely connects to the payment gateway, shows you the exact order reference, and handles success or retry gracefully without crashing."*

#### 🔍 Detailed Technical Breakdown:
* **Component:** `frontend/src/components/buyer/payment/PaymentModal.jsx`.
* **Orchestration Workflow:**
  1. Calls `POST /api/buyer/payments/create-order` to register intent and receive a gateway order ID (`ORD-YYYY-XXXXXX` / `order_rcptid_...`).
  2. Mounts the payment gateway client interface (Razorpay SDK in live mode, Cryptographic Sandbox in development/test mode).
  3. Captures payment credentials and submits them for server-side verification.
  4. On verification failure, displays descriptive error reasons (insufficient funds, bank timeout, cancelled by user) with a one-click retry.

---

### 7.4 Cryptographic Verification Engine: HMAC-SHA256 Signature Verification (`paymentGateway.service.js`)

#### 💡 In Simple Words:
> *"To make sure no hacker can fake a successful payment by sending false data from their browser, our server generates a secret mathematical stamp using HMAC-SHA256 cryptography. If the gateway's stamp doesn't match our secret key, the transaction is rejected instantly."*

#### 🔍 Cryptographic Implementation:
```javascript
const generatedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'sandbox_secret_key')
  .update(`${orderId}|${paymentId}`)
  .digest('hex');

if (generatedSignature !== signature) {
  throw new AppError('Invalid cryptographic payment signature', 400, 'SIGNATURE_VERIFICATION_FAILED');
}
```
* **Security Invariant:** Even if an attacker intercepts the client network payload, they cannot forge the signature without knowledge of the server's private secret.

---

### 7.5 Server-Side Authoritative Price Recalculation (Zero Trust Financial Architecture)
* **The Vulnerability in Weak Systems:** Malicious clients altering the price payload (e.g., changing ₹10,000 to ₹10).
* **The SasyaVahini Defense:** The client only sends the `addressId` and target listing IDs. The backend re-queries the authoritative `ProduceListing` table, re-verifies active stock, recalculates delivery freight from road coordinates, computes handling fees, and charges the exact mathematically verified amount.

---

### 7.6 Webhook Processing & Replay Attack Defense (`WebhookEvent` Table)
* **Asynchronous Webhook Ingestion:** Payment gateways notify backends asynchronously via webhooks (`payment.captured`, `payment.failed`).
* **Replay Attack Defense:** Every incoming webhook event ID (`event.id`) is recorded in the PostgreSQL `WebhookEvent` table within an atomic database transaction. If an identical event ID is received again, it is acknowledged and discarded, guaranteeing zero duplicate ledger entries.

---

### 7.7 Pure Node.js Vector PDF Tax Invoice Generation (`invoice.service.js`)

#### 💡 In Simple Words:
> *"The moment your payment succeeds, the system automatically draws a professional legal tax invoice in pure vector PDF format. It lists your company name, GST number, the exact farm where the crops came from, the 0% GST government tax exemption notice, and an official verification stamp."*

#### 🔍 Key Engineering Highlights:
* **Zero External Binary Dependencies:** Engineered using a pure Node.js vector PDF generation engine. Does NOT require heavy headless Chrome, Puppeteer, or C++ binaries (`wkhtmltopdf`), ensuring fast, reliable execution inside lightweight Alpine Linux Docker containers.
* **Statutory Compliance (GST Rule 46):**
  - **Invoice Identifier:** Standardized serial format: `INV-YYYY-XXXXXX` (e.g. `INV-2026-B81D04`).
  - **HSN Codes:** Unprocessed agricultural produce classified under Chapter 07/08/10.
  - **0% GST Exemption Notice:** Explicitly cites *Government of India GST Notification No. 2/2017-Central Tax*.
  - **Audit Metadata:** Includes Transaction ID, Payment Method, Delivery Destination, and FPO Hub Details.

---

### 7.8 Page 1: Tax Invoices Archive (`/buyer/invoices` & `InvoicesPage.jsx`)

#### 💡 In Simple Words:
> *"Your digital filing cabinet for agricultural invoices. You can view past purchase bills, search by invoice number or date, and download or print them anytime for accounting and tax audits."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/invoices`.
* **Component:** `frontend/src/pages/buyer/invoices/InvoicesPage.jsx`.
* **Features:** Search by invoice ID, filter by financial date range, view summary modals, and one-click direct PDF stream download via `/api/buyer/payments/invoices/:id/download`.

---

### 7.9 Page 2: Payment Transaction History Ledger (`/buyer/transactions` & `TransactionHistoryPage.jsx`)

#### 💡 In Simple Words:
> *"A complete bank-style passbook of every payment made on the platform. It shows successful transactions, pending escrow holds, and failed attempts with full cryptographic transaction hashes."*

#### 🔍 Detailed Technical Breakdown:
* **Route:** `/buyer/transactions`.
* **Component:** `frontend/src/pages/buyer/transactions/TransactionHistoryPage.jsx`.
* **Features:** Tabbed status filters (`ALL`, `SUCCESS`, `PENDING`, `FAILED`), transaction detail modal with gateway reference numbers, payment channel badges (`UPI`, `CARD`, `NETBANKING`, `ESCROW`), and link to corresponding tax invoice.

---

### 7.10 Backend Architecture & API Contracts (Phase 6)

#### 1. `POST /api/buyer/payments/create-order`
* **Request Body:** `{ addressId: string, paymentMethod: string, notes?: string }`
* **Response Payload:** Returns `orderId`, `amount` (in paise and rupees), `currency: "INR"`, `keyId`, and authoritative item breakdown.

#### 2. `POST /api/buyer/payments/verify`
* **Request Body:** `{ paymentId: string, orderId: string, signature: string, addressId: string }`
* **Response Payload:** Cryptographically verifies HMAC signature, creates `PaymentTransaction` record, generates vector PDF `Invoice`, and returns verification confirmation.

#### 3. `GET /api/buyer/payments/invoices` & `GET /api/buyer/payments/invoices/:id/download`
* **Response Payload:** Lists buyer invoices or streams vector PDF binary directly with `Content-Type: application/pdf`.

#### 4. `GET /api/buyer/payments/transactions`
* **Response Payload:** Returns paginated payment ledger entries with gateway reference IDs and verification status.

---

## 8. Phase 7: Order Management, Multi-Supplier Fulfilment & Two-Tier Logistics Tracking (In-Depth & Simple)

### 8.1 Agricultural Logistics Challenge: From Verified Payment to Farm Gate Dispatch
Once a payment is cryptographically verified in Phase 6, agricultural procurement enters its most critical phase: **physical fulfillment and cold-chain transport**.
Unlike manufactured goods sitting in a single fulfillment center:
- Farm lots originate across dispersed rural villages and FPO aggregation sheds.
- Produce must be harvested, graded, packed in food-grade crates, and loaded onto multi-stop transport vehicles.
- Buyers need real-time operational visibility into dispatch progress without relying on fake GPS simulations.
- Delivery must be verified physically using secure digital handshakes before releasing funds.

Phase 7 implements the end-to-end **Order Management, Multi-Supplier Fulfillment Partitioning, Lifecycle State Machine, and Two-Tier Logistics Tracking System**.

---

### 8.2 Database Architecture & Schema Innovations (`Order`, `OrderItem`, `SupplierOrder`, `Shipment`, `CancellationRequest`)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PaymentTransaction                            │
│                       (Verified HMAC-SHA256)                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 1 : 1
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                                 Order                                  │
│   id, orderNumber (SV-ORD-YYYY-XXXXXX), status, totalAmount, subtotal, │
│   deliveryFee, platformFee, deliveryAddressJson, priceBreakdownJson    │
└───────────┬───────────────────────┬────────────────────────┬───────────┘
            │ 1 : N                 │ 1 : N                  │ 1 : 1
            ▼                       ▼                        ▼
┌───────────────────────┐ ┌──────────────────────┐ ┌────────────────────┐
│       OrderItem       │ │    SupplierOrder     │ │      Shipment      │
│ Immutable Snapshot of │ │ Multi-Supplier Group │ │ Vehicle, Driver,   │
│ Crop, Grade, Price,   │ │ (FPO or Farmer Hub   │ │ 6-Digit OTP,       │
│ Quantity, & Image     │ │  Fulfillment Batch)  │ │ Milestone Events   │
└───────────────────────┘ └──────────────────────┘ └────────────────────┘
```

#### 🛡️ Database Invariants:
1. **Immutable Item Snapshots (`OrderItem`):** Freezes crop name, variety, quality grade, asking price, and image URL at the moment of order placement. If a farmer edits their listing price tomorrow, past order records remain 100% historically unchanged.
2. **Multi-Supplier Partitioning (`SupplierOrder`):** Automatically splits multi-farm checkouts into autonomous fulfillment groups. Each supplier only manages their assigned batch.
3. **Logistics Container (`Shipment`):** Encapsulates carrier details, vehicle type (`Tempo`, `Mini-Truck`, `Truck`), driver contact, delivery destination coordinates, and a secure 6-digit verification OTP.

---

### 8.3 Multi-Supplier Order Decomposition (Partitioning Single Checkout into Autonomous Batches)

#### 💡 In Simple Words:
> *"If you buy tomatoes from Nashik FPO and onions from Pune FPO in one single cart, the system creates one parent order for your billing, but cleanly splits it into two independent supplier packages behind the scenes. Nashik FPO packs their tomatoes, Pune FPO packs their onions, and both merge into the logistics delivery stream."*

#### 🔍 Technical Execution:
When `createOrderFromPayment()` executes, the backend analyzes all line items:
- Groups items by `farmerId` or `fpoId`.
- Creates a `SupplierOrder` for each supplier collective with status `PENDING` $\to$ `ACCEPTED` $\to$ `PACKED` $\to$ `READY_FOR_PICKUP`.
- The parent `Order` status transitions to `CONFIRMED`, and automatically reflects `PARTIALLY_FULFILLED` or `READY_FOR_DISPATCH` as individual supplier batches progress.

---

### 8.4 Immutable Historical Snapshotting
* **The Problem:** In standard database designs, orders reference the `ProduceListing` table via foreign keys. If a farmer deletes or updates the listing, order history displays corrupted or missing information.
* **The SasyaVahini Solution:** `OrderItem` copies all listing attributes into immutable snapshot columns (`productName`, `cropCategory`, `qualityGrade`, `unitPrice`, `quantityKg`, `totalPrice`, `imageUrl`, `pickupLocation`). Additionally, the full shipping destination is serialized as an immutable JSON snapshot in `deliveryAddressJson`.

---

### 8.5 Atomic Inventory Commitments & Idempotent Order Creation
* **Atomic Deduction:**
  ```javascript
  await tx.produceListing.update({
    where: { id: item.listingId },
    data: {
      soldQty: { increment: item.quantityKg },
      availableQtyKg: { decrement: item.quantityKg },
    },
  });
  ```
* **Idempotency Guarantee:** The `Order` table enforces a `UNIQUE` constraint on `paymentTransactionId`. If a buyer refreshes their confirmation page or if a payment webhook fires multiple times, the service returns the existing confirmed order without re-deducting inventory or duplicating orders.

---

### 8.6 Order Status Lifecycle State Machine

```
[ PAYMENT VERIFIED ]
         │
         ▼
    CONFIRMED ──(Buyer Cancels Before Dispatch)──► CANCELLED (Inventory Restored)
         │
         ▼
    PROCESSING (FPOs/Farmers Sorting & Crating)
         │
         ▼
 READY_FOR_DISPATCH (Consolidated at Hubs)
         │
         ▼
     PICKED_UP (Fleet Vehicle Loaded)
         │
         ▼
    IN_TRANSIT (Corridor Highway Movement)
         │
         ▼
 OUT_FOR_DELIVERY (Local Sector Dispatch)
         │
         ▼
[ 6-Digit OTP Handshake ]
         │
         ▼
     DELIVERED (Payout Released to Farmers)
```

---

### 8.7 Verifiable Digital OTP Delivery Handover (6-Digit Cryptographic Handshake Code)

#### 💡 In Simple Words:
> *"When the delivery truck arrives at your warehouse or store, you inspect the vegetables. If the quality is approved, you give the driver a 6-digit secret code from your dashboard. The driver enters the code to confirm delivery. This guarantees drivers cannot claim they delivered goods when they didn't!"*

#### 🔍 Handshake Architecture:
1. Upon shipment creation, the backend generates a secure 6-digit verification code (`deliveryOtp`) stored in `Shipment`.
2. The OTP is visible **only** to the authenticated buyer on their order tracking interface.
3. Upon arrival, the logistics driver inspects the produce alongside the buyer and requests the OTP.
4. Entering the correct OTP triggers `POST /api/admin/shipments/:id/confirm-delivery`, transitioning the order to `DELIVERED` and releasing funds from escrow to the farmer collectives.

---

### 8.8 Order Cancellation & Inventory Restoration Workflow
* **Cancellation Window:** Buyers can self-cancel orders that are in `CONFIRMED` or `PROCESSING` status. Once an order is `PICKED_UP` or `IN_TRANSIT`, cancellation is disabled to protect farmers from transport spoilage.
* **Atomic Inventory Rollback:** When an order is cancelled, a PostgreSQL transaction atomically restores the committed volume:
  $$\text{soldQty} \leftarrow \text{soldQty} - \text{quantityKg}$$
  $$\text{availableQtyKg} \leftarrow \text{availableQtyKg} + \text{quantityKg}$$
  The listing immediately becomes available again for other buyers on the marketplace.

---

### 8.9 Frontend Pages & Interfaces

#### Page 1: Buyer Orders Workspace (`/buyer/orders` & `OrdersPage.jsx`)
* **Route:** `/buyer/orders` (and embedded in `BuyerDashboard.jsx`).
* **Features:**
  - Status tabs: `All Orders`, `Confirmed`, `Processing`, `Ready for Dispatch`, `In Transit`, `Delivered`, `Cancelled`.
  - Search by Order Number (`SV-ORD-...`), crop name, or supplier.
  - Multi-supplier preview cards showing item thumbnails, volume, total price, and quick action buttons.

#### Page 2: Itemized Order Detail Modal (`OrderDetailPage.jsx`)
* **Features:**
  - Complete order timeline and status badge.
  - Itemized produce table with quality grades, quantities, and unit rates.
  - Supplier fulfillment status breakdown for each independent farm batch.
  - Delivery address card with contact details.
  - Quick action to view and download the official tax invoice.
  - One-click order cancellation with reason submission (for eligible un-dispatched orders).

#### Page 3: Live Milestone Tracking View (`/buyer/tracking` & `OrderTrackingPage.jsx`)
* **Features:**
  - Multi-hop transit blueprint: Farm Collection $\to$ FPO Hub Aggregation $\to$ Road Corridor Transit $\to$ Terminal Buyer Delivery.
  - Active vehicle telemetry: Assigned fleet vehicle (e.g. *MH-12-QX-4012 Refrigerated 2.5T*), driver name, and carrier partner.
  - Delivery OTP display card with security instructions.

---

### 8.10 Backend Architecture & API Contracts (Phase 7)

#### 1. `GET /api/buyer/orders`
* **Query Parameters:** `page=1`, `limit=10`, `status=ALL|CONFIRMED|...`, `search=Tomato`
* **Response Payload:** Returns paginated list of buyer orders with nested items, supplier summaries, and shipment status.

#### 2. `GET /api/buyer/orders/:id`
* **Response Payload:** Returns full order object, immutable item snapshots, supplier fulfillment groups, linked invoice ID, and shipment details.

#### 3. `POST /api/buyer/orders/:id/cancel`
* **Request Body:** `{ reason: string }`
* **Validation:** Rejects cancellation if shipment is already dispatched.
* **Behavior:** Cancels order, records `CancellationRequest`, and atomically restores produce listing stock.

#### 4. `GET /api/buyer/orders/:id/tracking`
* **Response Payload:** Returns vehicle details, driver name, active milestone progression, and buyer's 6-digit delivery OTP.

---

## 9. Strict Scope Boundary & Enterprise Security Rules across All Phases

To maintain a clean modular architecture and prevent cross-boundary regression:

| Phase | Strict Scope Boundary Enforced | Security & Invariant Rules |
| :--- | :--- | :--- |
| **Phase 1** | Authentication, Onboarding & User Roles | Passwords hashed with bcrypt (salt rounds 10); JWT access tokens (15m expiry) + HTTP-only refresh tokens; Dual-mode buyer schema. |
| **Phase 2** | Profile, Address Management & Settings | Strict user isolation (`where: { buyerId }`); Indian GSTIN 15-character regex validation; Zod input sanitation. |
| **Phase 3** | Marketplace Discovery & Product Details | Server-side pagination & filtering; Read-only produce browsing; APMC Mandi benchmark calculations; No direct cart mutations. |
| **Phase 4** | Supplier Comparison & Total Landed Cost | Fixed 2–4 comparison ceiling; Standard unit price normalization; Zero fake data injection; Stateless Landed Cost calculation. |
| **Phase 5** | Shopping Cart & Checkout Preparation | Server-side MOQ and stock invariant enforcement; Supplier-wise item grouping; Strictly NO payment gateway integration in Phase 5. |
| **Phase 6** | Payments, Signatures & Tax Invoices | HMAC-SHA256 signature verification; Server-side authoritative price recalculation; Zero storage of card/CVV data; Webhook idempotency defense; Pure Node.js vector PDF generation. |
| **Phase 7** | Orders, Fulfillment & Logistics Tracking | Authoritative payment-to-order trigger (only verified payments create orders); Immutable item snapshotting; Multi-supplier partition decomposition; Atomic stock deduction/rollback; 6-digit OTP delivery handshake; Milestone-based tracking without simulated GPS telemetry. |

---

## 10. Complete Verification & Automated Test Results

### 🧪 Frontend Vitest Test Suite (`npm test -- --run`)
```
 RUN  v1.6.1 /app/frontend

 ✓ src/test/listingHelpers.test.js           (4 tests)
 ✓ src/test/voiceFormParser.test.js          (7 tests)
 ✓ src/test/components.test.jsx              (4 tests)
 ✓ src/test/buyerAuth.test.jsx               (3 tests)
 ✓ src/test/buyerPhase2.test.jsx             (7 tests)
 ✓ src/test/MarketplacePhase3.test.jsx       (4 tests)
 ✓ src/test/BuyerComparisonPhase4.test.jsx   (4 tests)
 ✓ src/test/BuyerCartCheckoutPhase5.test.jsx (8 tests)
 ✓ src/test/BuyerPaymentPhase6.test.jsx      (6 tests)

 Test Files  9 passed (9)
      Tests  47 passed (47) (100% SUCCESS RATE)
   Duration  7.48s
```

### ⚙️ Backend Jest Test Suites (`npm test`)

#### Phase 5, Phase 6 & Phase 7 Integration Suites:
```
PASS tests/buyerOrderLogisticsPhase7.test.js (11 tests passed)
PASS tests/buyerPaymentInvoicePhase6.test.js (13 tests passed)
PASS tests/buyerCartCheckoutPhase5.test.js   (12 tests passed)

Test Suites: 3 passed, 3 total
Tests:       36 passed, 36 total (100% SUCCESS RATE)
```

#### Complete Full-Stack Backend Baseline Suites:
```
PASS tests/logistics.unit.test.js
PASS tests/auth.test.js
PASS tests/buyerPhase2.test.js
PASS tests/farmerFpoPortal.test.js
PASS tests/two-tier-logistics.test.js
PASS tests/buyerMarketplacePhase3.test.js
PASS tests/marketplace.test.js
PASS tests/farmerFpoBusinessRules.test.js
PASS tests/buyerCartCheckoutPhase5.test.js
PASS tests/buyerPaymentInvoicePhase6.test.js
PASS tests/buyerOrderLogisticsPhase7.test.js

Total Backend Test Suites: 11 passed, 11 total
Total Backend Tests:       139 passed, 139 total (100% SUCCESS RATE)
```

---

## 11. Comprehensive Master Files & Components Summary

### Phase 4: Supplier Comparison & Total Landed Cost
| File Path | Description |
| :--- | :--- |
| `frontend/src/context/CompareContext.jsx` | Global React context for managing comparison selection (2–4 limit, sessionStorage, duplicate prevention). |
| `frontend/src/components/buyer/comparison/ComparisonSelectionBar.jsx` | Floating bottom comparison bar with crop chips, counter, "Compare Now", and "Clear" actions. |
| `frontend/src/components/buyer/comparison/ProductCompareButton.jsx` | Reusable compare toggle button with compact and standard variants. |
| `frontend/src/pages/buyer/comparison/ComparisonPage.jsx` | Complete comparison dashboard with side-by-side specs, Total Landed Cost calculator, and audit disclosures. |
| `frontend/src/test/BuyerComparisonPhase4.test.jsx` | Vitest suite testing comparison selection, button toggles, floating tray, and comparison page. |

### Phase 5: Shopping Cart & Checkout Preparation
| File Path | Description |
| :--- | :--- |
| `backend/src/controllers/cart.controller.js` | REST controller for cart operations, line item quantities, and checkout summary calculation. |
| `backend/src/routes/cart.routes.js` | Express route definitions for `/api/buyer/cart` endpoints. |
| `frontend/src/context/CartContext.jsx` | Global React cart state manager with optimistic UI updates and session persistence. |
| `frontend/src/components/buyer/cart/AddToCartButton.jsx` | Context-aware Add-to-Cart button with MOQ detection and stock validation. |
| `frontend/src/components/buyer/cart/CartItem.jsx` | Individual produce line item card with quantity stepper and subtotal re-computation. |
| `frontend/src/components/buyer/cart/SupplierGroupedCart.jsx` | Supplier-wise item grouping container displaying FPO/farmer details. |
| `frontend/src/components/buyer/checkout/AddressSelector.jsx` | Delivery destination selector pulling Phase 2 saved addresses. |
| `frontend/src/components/buyer/checkout/CheckoutSummary.jsx` | Auditable cost ledger and checkout preparation review component. |
| `frontend/src/pages/buyer/cart/CartPage.jsx` | Full procurement shopping cart page with empty state handling. |
| `frontend/src/pages/buyer/checkout/CheckoutPage.jsx` | Multi-step checkout preparation workflow page. |
| `frontend/src/test/BuyerCartCheckoutPhase5.test.jsx` | Vitest suite (8 tests) covering cart, MOQ, supplier groups, address selection, and checkout ledger. |
| `backend/tests/buyerCartCheckoutPhase5.test.js` | Jest suite (12 tests) verifying backend cart APIs, MOQ bounds, and stock invariants. |

### Phase 6: Secure Payment Gateway & Tax Invoices
| File Path | Description |
| :--- | :--- |
| `backend/src/services/paymentGateway.service.js` | Cryptographic HMAC-SHA256 signature verification service and gateway adapter. |
| `backend/src/services/invoice.service.js` | Pure Node.js vector PDF tax invoice generation service (0% GST compliant). |
| `backend/src/controllers/payment.controller.js` | Payment order creation, verification, invoice streaming, and webhook handler. |
| `backend/src/routes/payment.routes.js` | Express route definitions for `/api/buyer/payments` endpoints. |
| `frontend/src/components/buyer/payment/PaymentMethodSelector.jsx` | Multi-method payment selector (UPI, Cards, Net Banking, Escrow). |
| `frontend/src/components/buyer/payment/PaymentModal.jsx` | Interactive payment gateway modal overlay with error recovery. |
| `frontend/src/components/buyer/payment/PaymentResultView.jsx` | Verified payment confirmation view with transaction details. |
| `frontend/src/pages/buyer/invoices/InvoicesPage.jsx` | Tax invoices archive page with search, preview, and PDF download. |
| `frontend/src/pages/buyer/transactions/TransactionHistoryPage.jsx` | Payment transaction history ledger with HMAC audit traces. |
| `frontend/src/test/BuyerPaymentPhase6.test.jsx` | Vitest suite (6 tests) covering method selector, payment modal, invoice archive, and transaction ledger. |
| `backend/tests/buyerPaymentInvoicePhase6.test.js` | Jest suite (13 tests) verifying cryptographic verification, invoice generation, and PDF streaming. |

### Phase 7: Order Management & Two-Tier Logistics Tracking
| File Path | Description |
| :--- | :--- |
| `backend/src/services/order.service.js` | Core order fulfillment engine: multi-supplier decomposition, atomic stock deduction, OTP generation, and cancellation rollback. |
| `backend/src/controllers/order.controller.js` | REST controller for buyer order listings, item snapshots, live tracking, and cancellation. |
| `backend/src/routes/order.routes.js` | Express route definitions for `/api/buyer/orders` endpoints. |
| `frontend/src/services/orderApi.js` | Frontend API client for order queries, cancellation, and tracking. |
| `frontend/src/pages/buyer/orders/OrdersPage.jsx` | Full buyer order workspace with status filter tabs and search. |
| `frontend/src/pages/buyer/orders/OrderDetailPage.jsx` | Comprehensive order detail modal with itemized snapshots and supplier fulfillment cards. |
| `frontend/src/pages/buyer/orders/OrderTrackingPage.jsx` | Real-time multi-hop milestone tracking interface with 6-digit delivery OTP display. |
| `backend/tests/buyerOrderLogisticsPhase7.test.js` | Jest integration suite (11 tests) verifying payment-to-order pipeline, multi-supplier partition, idempotency, atomic stock deduction, and OTP delivery handshake. |

---

## 12. Viva / Presentation Speaking Script & Model Q&A (Phases 4, 5, 6, 7)

### 🎤 Master Presentation Script (3-Minute Walkthrough for Evaluators)
> *"Respected evaluators, in **SasyaVahini**, we have successfully designed, implemented, and verified **Phases 4 through 7** of the Buyer Dashboard & Agricultural Procurement System under Problem Statement ID 26033.*  
>  
> *In traditional agricultural markets, buyers face severe friction: non-transparent freight charges, fragmented suppliers, payment insecurity, and zero visibility into transit. Here is how our architecture solves this end-to-end:*  
>  
> *1. **Phase 4 (Supplier & Price Comparison):** Buyers select 2 to 4 farm lots and compare them side-by-side. We normalized prices into standard Indian agricultural units (₹/kg, ₹/Quintal, ₹/Tonne) and engineered an interactive **Total Landed Cost Calculator** that combines farm gate price + Two-Tier Road Freight (calculated via road distance and fleet payload) + ₹0.50/kg handling fee + 2% platform fee, with a statutory 0% GST exemption line.*  
>  
> *2. **Phase 5 (Shopping Cart & Checkout):** Our cart intelligently partitions items by supplier (FPO collective or farmer), dynamically calculates Minimum Order Quantities based on buyer type (household vs commercial), enforces real-time stock invariants, links saved delivery destinations, and presents an auditable checkout summary.*  
>  
> *3. **Phase 6 (Secure Payments & Tax Invoices):** We integrated a zero-trust financial pipeline. The backend recalculates all charges authoritatively to prevent client price tampering. Every transaction is verified using cryptographic **HMAC-SHA256 signatures**. Upon verified payment, the system generates a legal, pure Node.js vector PDF Tax Invoice adhering to GST Rule 46 with zero external binary dependencies.*  
>  
> *4. **Phase 7 (Order Management & Logistics Tracking):** Verified payments trigger atomic order creation. Multi-farm checkouts are decomposed into independent **SupplierOrder** batches so each FPO fulfills their respective produce. We freeze prices and crop details using immutable **OrderItem snapshots**, enforce atomic stock deductions with cancellation rollback, and secure the physical delivery handover using a **6-digit cryptographic OTP**.*  
>  
> *All 47 frontend tests and 139 backend tests are passing with a 100% success rate, running in a production-ready Docker containerized environment."*

---

### ❓ Model Q&A for Evaluators (Phases 4, 5, 6, 7)

#### Q1: Why is Total Landed Cost calculation superior to standard marketplace price comparison? (Phase 4)
**Answer:**  
*"Agricultural commodities are bulky and perishable. A farm selling onions at ₹18/kg that is 200 km away will incur significantly higher road freight charges than an FPO selling at ₹20/kg located 15 km away. Our Total Landed Cost calculator integrates with Member 4's Two-Tier Logistics engine to compute the true delivered cost per kilogram, ensuring buyers make economically sound decisions."*

#### Q2: How does your cart handle items originating from different farmers or FPOs? (Phase 5)
**Answer:**  
*"Unlike standard e-commerce carts that treat items homogenously, our cart partitions produce into distinct `SupplierGroupedCart` sections based on the supplier's legal entity ID. This preserves supplier identity, displays individual farm origin districts, enforces supplier-specific MOQs, and prepares the consignment for multi-supplier fulfillment in Phase 7."*

#### Q3: How do you prevent financial tampering during online payment processing? (Phase 6)
**Answer:**  
*"We implement a Zero-Trust Financial Architecture. The client never submits monetary amounts to the payment gateway. Instead, the backend re-queries the authoritative database, verifies available stock, calculates exact logistics freight from destination coordinates, computes handling fees, and creates the gateway order server-side. Additionally, every transaction is cryptographically verified using HMAC-SHA256 signatures before confirming payment."*

#### Q4: Why did you build the PDF invoice generator in pure Node.js vector format without external libraries? (Phase 6)
**Answer:**  
*"Traditional solutions like Puppeteer or wkhtmltopdf require heavy headless browsers or C++ OS binaries that inflate Docker image sizes by over 500 MB and frequently fail in Alpine Linux environments. Our pure Node.js vector PDF service compiles cleanly in milliseconds, has zero external binary dependencies, and produces 100% compliant tax invoices under Indian GST Rule 46."*

#### Q5: How does the system handle an order containing produce from multiple suppliers? (Phase 7)
**Answer:**  
*"The backend uses a Multi-Supplier Decomposition pattern. It generates one parent `Order` for the buyer's payment and invoice, but creates separate `SupplierOrder` records for each farmer or FPO. Each supplier accesses only their assigned fulfillment batch, packing and staging their produce independently while the buyer tracks the unified delivery."*

#### Q6: How does the OTP delivery handshake prevent false delivery claims? (Phase 7)
**Answer:**  
*"Upon shipment creation, the backend generates a cryptographically secure 6-digit OTP stored in the database and visible only to the buyer. When the transport vehicle arrives, the buyer inspects the agricultural produce for quality and freshness. Only if satisfied does the buyer provide the OTP to the driver. The driver enters the OTP to atomically transition the order to `DELIVERED`, which releases escrow funds to the farmers."*

#### Q7: What happens to inventory if an order is placed and then cancelled? (Phase 7)
**Answer:**  
*"Inventory commitment is fully atomic and transactional. When an order is confirmed, PostgreSQL transactions increment `soldQty` and decrement `availableQtyKg`. If an order is cancelled prior to vehicle dispatch, a database transaction automatically rolls back the committed quantity, restoring the produce immediately to the marketplace catalog."*

---
*Maintained by Member 3 (Buyer & Marketplace Module) — SasyaVahini Team.*
