# SasyaVahini — Reference Feature Migration & Implementation Specification

**Document Version:** 1.0.0
**Project:** Smart India Hackathon (SIH 2026) — Problem Statement 26033
**Module:** Member 2 (Farmer & FPO Portals)
**Branch:** feature/farmer-fpo
**Reference Application:** C:\Users\hp\OneDrive\Desktop\SasyaVahini\SasyaVahini
**Target Application:** C:\Users\hp\OneDrive\Desktop\SasyaVahini\SasyaVahiniFarmersFPO
**Remote Repository:** https://github.com/Shankar6300/SasyaVahini.git

---

## 1. Environment & License Verification

### 1.1 Branch and Repository Scoping
- **Active Git Branch:** `feature/farmer-fpo` (verified via `git branch --show-current`).
- **Repository Scope:** Confirmed isolated to `SasyaVahiniFarmersFPO`.
- **Target Tracking:** Branches `main` and `integration` remain intact and uncommitted.

### 1.2 Reference Codebase License
- The reference repository `package.json` designates:
  ```json
  "license": "MIT"
  ```
- **Reuse Assessment:** The MIT license permits adaptation, modification, and re-implementation. All migrated logic adheres to SasyaVahini's unified conventions (Zod schemas, standardized `sendSuccess`/`sendError` envelopes, Prisma client instance, and accessible design system tokens).

---

## 2. Architectural Comparison

| Dimension | Reference Application (SasyaVahini / KisanDirect) | Target Application (SasyaVahiniFarmersFPO) | Migration Action |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Node.js / Express (CommonJS) | Node.js / Express (CommonJS) with Zod validation | Standardize route/controller separation with Zod schemas |
| **API Envelope** | Ad-hoc JSON (`res.json(data)`) | Standardized Envelope (`sendSuccess`, `sendError`) | Wrap all controller responses in `sendSuccess(res, data)` |
| **Database ORM** | Prisma with SQLite / PostgreSQL | Prisma with PostgreSQL (`schema.prisma` in `backend/prisma`) | Map models strictly to `ProduceListing`, `AllocationItem`, `FarmerProfile`, `FPOProfile` |
| **Authentication** | Custom JWT header | Bearer token with refresh token rotation (`auth.storage.js`) | Re-use existing `api.js` client with interceptors |
| **Frontend Framework** | React 18, Vite, Tailwind CSS | React 18, Vite, Vanilla CSS Design System (`index.css`) | Adapt UI to SasyaVahini design tokens (#07875B, #E8F5E9, #F8FAFC) |
| **State & Invariants** | Mixed client/server status | Authoritative backend locking: AVAILABLE -> RESERVED -> SOLD | Implement backend validation preventing double-reserving |

---

## 3. Discovered Feature Inventory & Target Mapping

### 3.1 Farmer Module Features

| Feature ID | Feature Description | Reference Source Path | Target Destination Path | Backend Endpoint Dependency | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FARM-01** | **Farmer Operations Dashboard**<br>Personalized greeting, operational KPI summary cards (Available, Reserved, Proposals, Total Listings), recent lot feed, and notification center. | `frontend/src/pages/FarmerDashboard.jsx` | `frontend/src/pages/farmer/FarmerDashboard.jsx` | `GET /api/farmers/produce`<br>`GET /api/farmers/proposals`<br>`GET /api/notifications` | Migrated |
| **FARM-02** | **Dual-Mode Listing Workflow**<br>Quick Listing (4-step guided visual workflow with crop cards, quintal conversion, price guidance, harvest availability) & Detailed Listing (quality grade, certification, GPS location). | `frontend/src/components/farmer/ProduceListingModal.jsx` | `frontend/src/components/farmer/ProduceListingModal.jsx` | `POST /api/farmers/batches`<br>`POST /api/farmers/produce` | Migrated |
| **FARM-03** | **Produce Lot Details & Actions**<br>Modal displaying harvest details, asking vs mandi price, lot status, and edit/delete actions with soft-lock validation (cannot delete/edit RESERVED or SOLD lots). | `frontend/src/components/farmer/ProduceDetailsModal.jsx` | `frontend/src/components/farmer/ProduceDetailsModal.jsx` | `GET /api/farmers/batches/:id`<br>`PUT /api/farmers/batches/:id`<br>`DELETE /api/farmers/batches/:id` | Migrated |
| **FARM-04** | **Authoritative Inventory View**<br>Tabular and card breakdown by crop, visual distinction of `AVAILABLE`, `PROPOSED`, `RESERVED`, and `SOLD` lots without artificial double-counting. | `frontend/src/pages/FarmerDashboard.jsx` | `frontend/src/pages/farmer/FarmerDashboard.jsx` | `GET /api/farmers/batches` | Migrated |
| **FARM-05** | **Allocation Consent Section**<br>"Requests for Your Produce" view displaying buyer proposals, quantity, offered price, match score, and explicit Accept/Reject actions. | `frontend/src/components/farmer/AllocationConsentSection.jsx` | `frontend/src/components/farmer/AllocationConsentSection.jsx` | `GET /api/farmers/proposals`<br>`POST /api/farmers/proposals/:id/accept`<br>`POST /api/farmers/proposals/:id/reject` | Migrated |
| **FARM-06** | **Farmer Earnings & Payout Ledger**<br>Completed sales, pending escrow transactions, platform fee transparency, and net proceeds breakdown. | `frontend/src/components/farmer/FarmerEarningsSection.jsx` | `frontend/src/components/farmer/FarmerEarningsSection.jsx` | `GET /api/farmers/earnings` | Migrated |
| **FARM-07** | **Farmer Profile Management**<br>Land size, village/district location, primary crops, and verification status modal. | `frontend/src/components/farmer/FarmerProfileModal.jsx` | `frontend/src/components/farmer/FarmerProfileModal.jsx` | `PUT /api/farmers/profile` | Migrated |
| **FARM-08** | **Farmer Notification Modal**<br>Operational notifications for newly proposed allocations, reservation confirmations, and status alerts. | `frontend/src/components/farmer/FarmerNotificationsModal.jsx` | `frontend/src/components/farmer/FarmerNotificationsModal.jsx` | `GET /api/notifications` | Migrated |

---

### 3.2 FPO Module Features

| Feature ID | Feature Description | Reference Source Path | Target Destination Path | Backend Endpoint Dependency | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FPO-01** | **FPO Collective Workspace**<br>Distinct organization header, verification badge, member statistics, aggregated supply summary, and active buyer procurement requests. | `frontend/src/pages/FpoDashboard.jsx` | `frontend/src/pages/fpo/FPODashboard.jsx` | `GET /api/fpo/dashboard` | Migrated |
| **FPO-02** | **Member Farmer Directory**<br>Searchable directory of affiliated farmers, KYC status, land holding, village, and drill-down into lots contributed. | `frontend/src/pages/FpoDashboard.jsx` | `frontend/src/pages/fpo/FPODashboard.jsx` | `GET /api/fpo/members` | Migrated |
| **FPO-03** | **Member Detail & Produce Traceability**<br>Modal detailing individual farmer records, listing history, and individual contributions to collective pools. | `frontend/src/components/fpo/FpoMemberDetailsModal.jsx` | `frontend/src/components/fpo/FpoMemberDetailsModal.jsx` | `GET /api/farmers/:id` | Migrated |
| **FPO-04** | **Produce Aggregation Engine**<br>Crop-wise aggregation across member lots; computes weighted average asking price, participating member count, and verifies requirement fulfillment without inventory duplication. | `frontend/src/pages/FpoDashboard.jsx` | `frontend/src/pages/fpo/FPODashboard.jsx` | `POST /api/fpo/aggregate`<br>`POST /api/fpo/pools` | Migrated |
| **FPO-05** | **FPO Procurement Proposals**<br>Institutional bulk proposals routed to the FPO entity, status verification, and collective batch allocation. | `frontend/src/pages/FpoDashboard.jsx` | `frontend/src/pages/fpo/FPODashboard.jsx` | `GET /api/fpo/proposals` | Migrated |
| **FPO-06** | **FPO Organization Profile**<br>Registration number, operational districts, member count, and collection point management. | `frontend/src/components/fpo/FpoProfileModal.jsx` | `frontend/src/components/fpo/FpoProfileModal.jsx` | `PUT /api/fpo/profile` | Migrated |

---

## 4. UI Design & Token Conformance

All migrated and newly created components strictly adhere to the unified SasyaVahini design tokens:
- **Primary Green:** `#07875B` (`--color-primary`)
- **Light Green Surface:** `#E8F5E9` (`--color-primary-bg`)
- **Neutral Background:** `#F8FAFC` (`--color-bg`)
- **Primary Text:** `#1F2937` (`--color-text-primary`)
- **Secondary Text:** `#64748B` (`--color-text-secondary`)
- **Borders:** `#E2E8F0` (`--color-border`)