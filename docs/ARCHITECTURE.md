# SasyaVahini — System Architecture Specification

## 1. Executive Architecture Overview

SasyaVahini is engineered as a decoupled modular platform with an Express.js orchestration backend, a React 18 frontend with role-specific dashboards, an ACID-compliant PostgreSQL relational data store accessed via Prisma ORM, and optional auxiliary microservices for Machine Learning price forecasting and vehicle route optimization.

```mermaid
graph TD
    Client["Browser / Client PWA\n(React 18 + Vite)"]
    
    subgraph Core Platform
        Express["Express.js API Gateway & App Server\n(Port 5000)"]
        AuthMid["JWT Auth & Role-Based RBAC"]
        ZodVal["Zod Request Validation"]
        TxEngine["Atomic Transaction & Reservation Engine"]
        Postgres[("PostgreSQL 14+\nPrisma ORM")]
    end
    
    subgraph Auxiliary Services
        ML["ML Price Forecasting Engine\n(FastAPI / Python)"]
        LogisticsOpt["Route & Fleet Optimization\n(OR-Tools / Python)"]
        GovAPIs["Agmarknet / e-NAM Mandi APIs"]
    end

    Client -->|HTTPS / REST API| Express
    Express --> AuthMid --> ZodVal --> TxEngine
    TxEngine --> Postgres
    Express -.->|HTTP JSON| ML
    Express -.->|HTTP JSON| LogisticsOpt
    ML -.->|Scraper / Feeds| GovAPIs
```

---

## 2. Core Domain Entities & Relational Schema

The data model in `backend/prisma/schema.prisma` is designed around strict transactional consistency, auditable inventory tracking, and transparent financial accounting.

```mermaid
erDiagram
    USER ||--o{ FARMER_PROFILE : has
    USER ||--o{ FPO_PROFILE : has
    USER ||--o{ BUYER_PROFILE : has
    USER ||--o{ LOGISTICS_PROFILE : has
    
    FARMER_PROFILE ||--o{ PRODUCE_BATCH : lists
    FPO_PROFILE ||--o{ PRODUCE_BATCH : aggregates
    
    PRODUCE_BATCH ||--o{ INVENTORY_RESERVATION : locks
    
    BUYER_PROFILE ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER_ITEM ||--o{ ALLOCATION : splits_into
    PRODUCE_BATCH ||--o{ ALLOCATION : fulfills
    
    ORDER ||--o| SHIPMENT : dispatches
    LOGISTICS_PROFILE ||--o{ SHIPMENT : delivers
    SHIPMENT ||--o{ SHIPMENT_MILESTONE : tracks
    
    ORDER ||--o{ PAYMENT_ESCROW : secures
    ORDER ||--o{ DISPUTE : raises
    PAYMENT_ESCROW ||--|{ SETTLEMENT_SPLIT : pays
```

### Entity Responsibilities

1. **User & Profiles**: Multi-tenant identity. Each user has one primary system role (`FARMER`, `FPO`, `BUYER`, `LOGISTICS`, `ADMIN`) mapped to a specialized profile storing KYC, GSTIN, coordinates, and bank details.
2. **ProduceBatch**: Physical agricultural units harvested by farmers or consolidated by an FPO. Tracks quantity, grade, minimum base price, harvest date, shelf life, and GPS location.
3. **InventoryReservation**: Ephemeral reservations created during checkout with strict expiration TTLs (default: 15 minutes). Prevents double-allocation while payment/confirmation is pending.
4. **Order & OrderItem**: Purchase orders submitted by buyers. Supports split fulfillments across multiple batches and suppliers.
5. **Allocation**: The binding record linking a specific `ProduceBatch` to an `OrderItem`, locking the physical kilograms and specifying farmer realization.
6. **Shipment & Milestones**: Physical transit coordination with cold-chain checkpoints, geo-timestamps, and handover signatures.
7. **PaymentEscrow & SettlementSplit**: Multi-party transparent financial breakdown calculated at checkout and disbursed upon verified delivery.

---

## 3. Finite State Machines (FSM)

### 3.1 Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: Buyer Submits Order
    PENDING --> ALLOCATING: Payment / Escrow Initiated
    PENDING --> CANCELLED: Buyer Aborts / Timeout (15m)
    ALLOCATING --> CONFIRMED: Batches Reserved & Escrow Locked
    ALLOCATING --> FAILED: Insufficient Valid Inventory
    CONFIRMED --> IN_TRANSIT: Logistics Pickup Verified
    CONFIRMED --> CANCELLED: Supplier Cancellation (Penalty)
    IN_TRANSIT --> DELIVERED: Consignee OTP Verified
    DELIVERED --> COMPLETED: Quality Check Passed & Escrow Released
    DELIVERED --> DISPUTED: Quality / Shortage Issue Raised
    DISPUTED --> COMPLETED: Admin Arbitration Settled
    DISPUTED --> REFUNDED: Returned / Full Refund Settled
    COMPLETED --> [*]
    CANCELLED --> [*]
    REFUNDED --> [*]
```

### 3.2 Produce Batch Lifecycle

```mermaid
stateDiagram-v2
    [*] --> HARVESTED: Farmer Records Listing
    HARVESTED --> QC_PENDING: Submitted to FPO / Portal
    QC_PENDING --> LISTED: Quality Grade Assigned (A/B/C)
    QC_PENDING --> REJECTED: Failed Quality Baseline
    LISTED --> PARTIALLY_RESERVED: Order Allocation in progress
    PARTIALLY_RESERVED --> LISTED: Reservation Released (Timeout)
    PARTIALLY_RESERVED --> SOLD: Fully Allocated & Shipped
    LISTED --> EXPIRED: Exceeded Shelf Life
    SOLD --> [*]
    EXPIRED --> [*]
    REJECTED --> [*]
```

### 3.3 Shipment Milestones

```mermaid
stateDiagram-v2
    [*] --> ASSIGNED: Vehicle / Driver Designated
    ASSIGNED --> PICKUP_ARRIVED: Geofence Trigger at Farm/FPO
    PICKUP_ARRIVED --> GOODS_LOADED: Batch Weight & Grade Checked
    GOODS_LOADED --> IN_TRANSIT: Bill of Lading Issued
    IN_TRANSIT --> HUB_TRANSFERRED: Intermediate FPO Consolidation
    HUB_TRANSFERRED --> IN_TRANSIT: Outbound Long Haul
    IN_TRANSIT --> OUT_FOR_DELIVERY: Destination Geofence Trigger
    OUT_FOR_DELIVERY --> DELIVERED: Buyer e-Signature & OTP
    DELIVERED --> [*]
```

---

## 4. Concurrency & Inventory Invariants

To avoid phantom inventory and race conditions in concurrent multi-buyer hackathon demonstrations, the system implements three strict database invariants:

### Invariant 1: Available Stock Formula
$$\text{AvailableQuantity} = \text{TotalQuantity} - \sum(\text{ActiveReservations}) - \sum(\text{CommittedAllocations})$$
Any attempt to allocate or reserve produce must satisfy:
$$\text{RequestedQuantity} \le \text{AvailableQuantity}$$

### Invariant 2: Atomic Checkout via Prisma Transaction
All order reservations must occur inside an atomic `$transaction` with optimistic locking or row-level constraints:
```javascript
// Pattern for inventory reservation
await prisma.$transaction(async (tx) => {
  const batch = await tx.produceBatch.findUnique({
    where: { id: batchId },
  });
  
  if (batch.availableQuantity < requestedQuantity) {
    throw new BadRequestError('Produce batch insufficient stock');
  }

  await tx.produceBatch.update({
    where: { id: batchId },
    data: { availableQuantity: { decrement: requestedQuantity } },
  });

  await tx.inventoryReservation.create({
    data: {
      batchId,
      orderId,
      quantity: requestedQuantity,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    },
  });
});
```

### Invariant 3: Zero-Sum Financial Ledger
For every confirmed order, the total buyer payment must strictly balance the payout ledger:
$$\text{TotalBuyerPaid} = \sum(\text{FarmerPayouts}) + \text{FPOMargin} + \text{LogisticsFee} + \text{PlatformFee} + \text{GST}$$
Every rupee is tracked with immutable credit/debit records.

---

## 5. Security & Authentication Architecture

1. **Token Flow**:
   - Access tokens: Short-lived (15 minutes), signed with `HS256`, stored in client `sessionStorage` (cleared on tab close).
   - Refresh tokens: Long-lived (7 days), stored in client `localStorage`, hashed before storage in PostgreSQL for single-device revocation.
2. **Role-Based Access Control (RBAC)**:
   - Server-side middleware `authorizeRoles('FARMER', 'FPO')` executes on protected route chains before controller invocation.
   - Client-side `<ProtectedRoute roles={['FARMER']} />` prevents unauthorized UI rendering.
3. **Payload Sanitization**:
   - Every mutating endpoint passes through Zod schema validation middleware (`validate(schema)`), stripping unknown attributes and casting types safely.
4. **HTTP Hardening**:
   - Helmet headers configured (CSP, HSTS, frameguard).
   - Strict CORS origin whitelisting.
   - Rate limiting (500 requests/15m globally, 20 requests/15m on authentication endpoints).
