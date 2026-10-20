# SasyaVahini — Team Module Ownership & Interfaces

This document assigns clear boundaries, code ownership, database responsibilities, and interface contracts for all six developers on the team to eliminate merge conflicts during the hackathon.

---

## Team Overview & Architecture Matrix

| Member | Domain / Module | Core Focus | Feature Branch |
| :---: | :--- | :--- | :--- |
| **Member 1** | **Core Baseline, Auth & Admin** | App skeleton, JWT, RBAC, Admin Console, Dispute Arbitration | `feat/m1-auth-admin` |
| **Member 2** | **Farmer & FPO Engine** | Harvest batches, FPO pooling, farmer payouts, crop catalog | `feat/m2-farmer-fpo` |
| **Member 3** | **Buyer & Order Marketplace** | Catalog browsing, multi-batch order checkout, escrow booking | `feat/m3-buyer-orders` |
| **Member 4** | **Logistics & Fleet Operations** | Multi-stop routing, driver dispatch, milestone updates, GPS tracking | `feat/m4-logistics-tracking` |
| **Member 5** | **ML Analytics & Mandi Advisor** | Mandi price forecasting, shelf-life spoilage risk, fair price engine | `feat/m5-ml-analytics` |
| **Member 6** | **QA, Integration & Deployment** | End-to-end tests, load tests, Docker setup, demo video scripts | `feat/m6-qa-integration` |

---

## Detailed Member Specifications

### Member 1: Core Architecture, Auth & Admin Platform
- **Ownership Scope**:
  - Root configuration (`package.json`, `.env.example`, `.gitignore`).
  - Express server harness, security middlewares (`helmet`, `cors`, `rateLimit`, `errorHandler`).
  - Authentication pipeline (`/api/auth/*`), JWT token rotation, password hashing with bcrypt.
  - Role-based authorization middleware (`authenticate`, `authorizeRoles`).
  - Frontend root (`App.jsx`, `main.jsx`), `AuthContext`, design system tokens (`index.css`), shared components (`Navbar`, `Button`, `FormField`, etc.).
  - Admin dashboard (`/admin`), user KYC verification, dispute resolution center.
- **Backend Files**:
  - `backend/src/app.js`, `backend/src/index.js`
  - `backend/src/controllers/auth.controller.js`, `backend/src/controllers/admin.controller.js`
  - `backend/src/middleware/auth.js`, `backend/src/middleware/errorHandler.js`
  - `backend/src/schemas/auth.schema.js`, `backend/src/schemas/admin.schema.js`
- **Frontend Files**:
  - `frontend/src/context/AuthContext.jsx`, `frontend/src/services/api.js`
  - `frontend/src/components/*`
  - `frontend/src/pages/LoginPage.jsx`, `frontend/src/pages/RegisterPage.jsx`
  - `frontend/src/pages/admin/AdminDashboard.jsx`

---

### Member 2: Farmer Listings & FPO Aggregation Module
- **Ownership Scope**:
  - Farmer produce batch creation, photo upload, harvest date, location coordinates, minimum reservation price.
  - FPO member management: viewing attached farmers, collective lot aggregation, bulk pricing.
  - Farmer earnings ledger and payout tracking.
- **Backend Files**:
  - `backend/src/controllers/farmer.controller.js`
  - `backend/src/controllers/fpo.controller.js`
  - `backend/src/routes/farmer.routes.js`, `backend/src/routes/fpo.routes.js`
  - `backend/src/schemas/produce.schema.js`, `backend/src/schemas/fpo.schema.js`
  - `backend/src/services/produce.service.js`, `backend/src/services/fpo.service.js`
- **Frontend Files**:
  - `frontend/src/pages/farmer/*` (`FarmerDashboard.jsx`, `BatchList.jsx`, `AddBatchModal.jsx`, `EarningsView.jsx`)
  - `frontend/src/pages/fpo/*` (`FPODashboard.jsx`, `ClusterAggregation.jsx`, `FarmerDirectory.jsx`)
- **Key Inter-Member Interfaces**:
  - Exposes `ProduceBatch` records with `availableQuantity` for Member 3's marketplace search.
  - Consumes payment release signals from Member 3 & Member 1 to credit farmer payout ledger.

---

### Member 3: Buyer Experience, Marketplace & Order Engine
- **Ownership Scope**:
  - Marketplace produce catalog with dynamic search, crop filter, grade filter, distance sorting.
  - Multi-batch cart and checkout engine.
  - Atomic inventory reservation transactions (preventing overselling).
  - Escrow payment recording and order status tracking.
  - Buyer delivery acceptance (OTP verification) and dispute initiation.
- **Backend Files**:
  - `backend/src/controllers/marketplace.controller.js`
  - `backend/src/controllers/order.controller.js`
  - `backend/src/routes/marketplace.routes.js`, `backend/src/routes/order.routes.js`
  - `backend/src/schemas/order.schema.js`
  - `backend/src/services/order.service.js`, `backend/src/services/allocation.service.js`
- **Frontend Files**:
  - `frontend/src/pages/buyer/*` (`BuyerDashboard.jsx`, `Marketplace.jsx`, `CartDrawer.jsx`, `OrderDetail.jsx`)
- **Key Inter-Member Interfaces**:
  - Invokes Member 4's logistics service when an order is confirmed to initiate shipment creation.
  - Queries Member 5's ML price advisory to render "Fair Price vs Mandi" badges on product cards.

---

### Member 4: Logistics Coordination & Real-Time Tracking
- **Ownership Scope**:
  - Shipment generation upon order confirmation.
  - Multi-stop pickup route planning (aggregating produce from multiple smallholders).
  - Transporter / driver assignment and dispatch workflow.
  - Milestone progression (`ASSIGNED` -> `PICKUP` -> `TRANSIT` -> `OUT_FOR_DELIVERY` -> `DELIVERED`).
  - Cold-chain temperature tracking and proof-of-delivery OTP verification.
- **Backend Files**:
  - `backend/src/controllers/logistics.controller.js`
  - `backend/src/routes/logistics.routes.js`
  - `backend/src/schemas/logistics.schema.js`
  - `backend/src/services/logistics.service.js`, `backend/src/services/routing.service.js`
- **Frontend Files**:
  - `frontend/src/pages/logistics/*` (`LogisticsDashboard.jsx`, `ShipmentList.jsx`, `RouteMap.jsx`, `MilestoneUpdater.jsx`)
- **Key Inter-Member Interfaces**:
  - Receives shipment booking triggers from Member 3's order engine.
  - Sends delivery completion event to Member 1 & 2 to trigger escrow fund disbursement.

---

### Member 5: AI/ML Price Forecasting & Mandi Advisory
- **Ownership Scope**:
  - Integration with Agmarknet / e-NAM Mandi historical price datasets.
  - Price forecasting model (predicting 7-day future commodity price per district).
  - Shelf-life decay and transit spoilage risk estimator based on harvest date, crop perishability, and weather/distance.
  - FastAPI or lightweight Node.js regression microservice exposed via `/api/ml/*`.
- **Backend Files**:
  - `backend/src/controllers/ml.controller.js`
  - `backend/src/routes/ml.routes.js`
  - `backend/src/services/ml.service.js`
  - `ml-service/` (Optional standalone Python FastAPI container)
- **Frontend Files**:
  - `frontend/src/components/MandiPriceChart.jsx`
  - `frontend/src/components/SpoilageIndicator.jsx`
- **Key Inter-Member Interfaces**:
  - Provides pricing benchmark data to Member 2 (farmer listing guidance) and Member 3 (buyer fair price check).

---

### Member 6: Quality Assurance, Integration & Deployment
- **Ownership Scope**:
  - Automated integration test suites for core user flows (Supertest, Jest, Vitest).
  - Database seed scripting with realistic Indian agricultural crops, mandis, and demo accounts.
  - Docker Compose configuration (`docker-compose.yml`) for PostgreSQL, Backend, Frontend, and ML service.
  - CI pipeline configuration (GitHub Actions).
  - Pre-demo smoke tests, mock datasets, and demo script coordination.
- **Files**:
  - `backend/tests/*` (`auth.test.js`, `order.test.js`, `logistics.test.js`)
  - `frontend/src/test/*` (`components.test.jsx`, `routing.test.jsx`)
  - `backend/prisma/seed.js`
  - `docker-compose.yml`, `Dockerfile.backend`, `Dockerfile.frontend`
  - `.github/workflows/ci.yml`
