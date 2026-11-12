# SasyaVahini — Cross-Module Logistics Integration Guide

This document defines the interface contracts, event subscriptions, adapter ports, and shared invariants between **Member 4 (Logistics & Fleet Operations)** and team members across SasyaVahini.

---

## 1. Member 1: Buyer Operations & Order Fulfillment

### 1.1 Delivery Coordinates Contract
- **Requirement:** Member 1's `Order` model must provide explicit `deliveryLatitude` and `deliveryLongitude`.
- **Geocoding:** Buyer address geocoding should occur at address save time via `BuyerAddress` rather than relying on logistics runtime defaults.
- **Strict Validation:** If `deliveryLatitude` or `deliveryLongitude` is missing when creating a shipment, the logistics module throws HTTP `422 VALIDATION_ERROR`.

### 1.2 Secure Delivery Handover OTP
- **Confidential Delivery Code:** When a shipment is created, a 6-digit numeric OTP is cryptographically generated via `crypto.randomInt(100000, 1000000)`.
- **Visibility:** The plain 6-digit OTP is returned **exclusively** in the buyer view (`toBuyerView`). Drivers, farmers, and transporters never receive the plain OTP over the wire.
- **Escrow Release Signal:** When the driver delivers produce at the destination and inputs the buyer's 6-digit OTP:
  - Validated using constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
  - Automatically triggers the `shipment.delivered` event.
  - Member 1's Escrow subsystem listens to `shipment.delivered` to disburse farmer payments and release logistics payouts.

### 1.3 Event Subscriptions for Member 1
```javascript
// Member 1 Escrow & Order Service can subscribe:
logisticsEvents.on('shipment.delivered', async ({ shipmentId, orderId, deliveredAt, verifiedOtp }) => {
  // Release buyer escrow funds to farmers & transporter
  await escrowService.releasePaymentForOrder(orderId);
});

logisticsEvents.on('shipment.milestone', async ({ orderId, milestone, location }) => {
  // Update order tracking status for buyer mobile app / web portal
  await orderService.updateFulfillmentMilestone(orderId, milestone);
});
```

---

## 2. Member 2: Farmer & FPO Consolidation

### 2.1 Farmer Pickup Stops
- **Pickup Stop Sequence:** The two-tier logistics solver computes an optimal pickup sequence along the agricultural corridor (e.g. Manchar -> Khed -> Chakan -> Hadapsar).
- **Driver Geofence on Loading:** Drivers cannot mark `PICKUP` completed unless their GPS ping is within 200 meters of the farmer's registered location (or an explicit `geofenceOverrideReason` like `ACCESS_ROAD_BLOCKED` is supplied).
- **Farmer Privacy:** In public views (`toDriverView`, `toBuyerView`), farmer personal documents (PAN, bank accounts, Aadhaar) are scrubbed; only pickup sequence, crop quantity, and contact numbers are visible.

### 2.2 Hub Handover & Weight Tolerance (Two-Tier Model)
- **Transfer Point Handover:** When a feeder vehicle transfers aggregated produce to a linehaul truck at an FPO hub:
  - Endpoint: `POST /api/logistics/transfers/:transferPointId/handover`
  - Requires both feeder and linehaul driver confirmation codes.
  - Enforces a 2% weight tolerance (`Math.abs(feederKg - linehaulKg) / linehaulKg <= 0.02`).
  - Weight discrepancies beyond tolerance log a `DISPUTED` status and emit `logistics.transfer.dispute`.

---

## 3. Member 3: Marketplace Inventory & Stock Reservation

### 3.1 ReservationPort Adapter
Logistics uses a clean port adapter (`backend/src/adapters/reservationPort.js`) to interact with Member 3's `ProduceListing` stock without mutating Member 3's internal domain logic:
```javascript
const { reservationPort } = require('./adapters');

// Reserve stock atomically during order planning / confirmation
const reservation = await reservationPort.reserveStock({
  orderId: 'ord_101',
  items: [
    { listingId: 'list_manchar_tomato_01', quantityKg: 1500 },
    { listingId: 'list_khed_tomato_02', quantityKg: 1000 }
  ],
  ttlMinutes: 30
});
```

### 3.2 Invariants & Quote TTL
1. **ProduceListing Invariant:**
   `ProduceListing.reservedQty + ProduceListing.soldQty <= ProduceListing.totalQuantityKg`
2. **Quote TTL Enforcement:**
   Logistics quotes (`PlanQuote`) carry a 30-minute expiration timestamp (`expiresAt`). Attempting to confirm or create a shipment with an expired quote throws `409 CONFLICT` (`The logistics plan quote has expired. Please generate a fresh plan.`).

---

## 4. Member 4 Invariants Guaranteed Across Platform

1. **Immutable Buyer Price:**
   Once a logistics quote is confirmed, `buyerPrice` is fixed and immutable. Dynamic driver rerouting, fuel cost fluctuations, or traffic congestion never increase the buyer's invoice.
2. **Protected Driver Net Earnings:**
   Driver payout per leg (`legPayoutRs`) is guaranteed server-side. Rerouting due to road closures or weather deviations logs reasons via statutory DoCA compliance rules without penalizing driver earnings.
3. **No Silent Fallbacks:**
   OSRM road routing provides true road geometries (hundreds of road points). If OSRM is unreachable, the system returns straight-line coordinates marked explicitly with `isEstimated: true` rendered as dashed grey lines, and does not poison the 24-hour route cache.
4. **Optimistic Concurrency Control:**
   All shipment updates and milestone transitions use optimistic concurrency locking via an integer `version` field to eliminate race conditions between simultaneous driver pings and dispatcher commands.

