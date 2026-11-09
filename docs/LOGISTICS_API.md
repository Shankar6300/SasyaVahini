# SasyaVahini — Logistics & Fleet Operations API Specification (`/api/logistics`)

**Owner:** Member 4 (Logistics & Fleet Operations)  
**Standard Envelope:** All endpoints follow `{ success: true, data: ..., meta?: ... }` on success, and `{ success: false, error: { code, message, details? } }` on error.  
**Authentication:** Protected endpoints require header: `Authorization: Bearer <accessToken>`.

---

## Architecture: Two-Tier Logistics and PLAN/EXECUTE

Logistics is split into a stateless quote phase and a stateful execution phase:

- **PLAN** (`POST /api/logistics/plan`) performs no operational writes. It may use an optional quote cache, but returns a `quoteId`, `expiresAt`, `radiusUsedKm`, `ringsTried`, complete cost lines, legs, and an explanation/decision log.
- **EXECUTE** begins only after `POST /api/logistics/plans/:quoteId/confirm`. Confirmation re-validates stock and current costs, locks the quoted price, and fails clearly when the new total exceeds the buyer budget. Dispatch, handover, milestone, and delivery operations are stateful.
- Radius rings default to `[15, 30, 50, 80, 120]` km. The candidate pool is fetched once for the maximum radius, then filtered in memory for each ring. The first feasible ring is selected unless the next ring improves total cost by more than 3%.
- Farmers are clustered by their nearest eligible transfer point (or approximately 5 km when no transfer point is available). Plans are generated from clusters, not isolated farmer permutations.
- Fast costing uses `Haversine × 1.3` plus cached transfer-point distances. OSRM and OR-Tools are reserved for the top three plans. Fallbacks are explicit: OSRM → Haversine, Python solver → Node 2-opt, no transfer point → direct, no vehicle → radius expansion → nearest hub vehicle → ADMIN alert.
- Every selected plan contains `FEEDER`, `LINEHAUL`, `LASTMILE`, or `DIRECT` legs. Each leg includes `vehicleClass`, endpoints, `km`, `etaMin`, `cost`, and `kg`.
- Road access is ordered `LANE < LOCAL < MAIN < STATE_HIGHWAY < HIGHWAY`. A vehicle class may directly serve a point only when its minimum road class is no greater than the point's access class. Unknown access defaults to `LANE`; OSM-derived values are cached and farmer overrides take precedence.
- Transfer points must have `roadAccess >= MAIN`, sufficient capacity, open hours, and an arrival order where the line-haul ETA is no earlier than feeder ETA plus handling time.
- Traffic factors are supplied by `trafficService.getTravelFactor(zone, hour)`, affect ETA and delay/spoilage risk, and support configurable heavy-vehicle entry restrictions. Production traffic rules remain TBD until the ML service is integrated.

### PLAN response shape

```json
{
  "quoteId": "quote_01J...",
  "expiresAt": "2026-10-21T13:41:00.000Z",
  "radiusUsedKm": 30,
  "ringsTried": [15, 30],
  "totalCost": 68450,
  "overBudgetBy": 0,
  "legs": [
    {
      "type": "FEEDER",
      "vehicleClass": "TEMPO",
      "from": { "farmerId": "farmer_001", "lat": 18.7, "lng": 73.8 },
      "to": { "transferPointId": "tp_001" },
      "km": 8.4,
      "etaMin": 18,
      "cost": 620,
      "kg": 700
    },
    {
      "type": "LINEHAUL",
      "vehicleClass": "MEDIUM_TRUCK",
      "from": { "transferPointId": "tp_001" },
      "to": { "buyerLat": 18.5, "buyerLng": 73.9 },
      "km": 42,
      "etaMin": 72,
      "cost": 4200,
      "kg": 1800
    }
  ],
  "costBreakdown": {
    "productCost": 39600,
    "feederLegs": 1860,
    "lineHaul": 4200,
    "lastMile": 0,
    "transferHandling": 900,
    "transferFees": 450,
    "platformFee": 792,
    "aggregationFee": 350,
    "riskCost": 298,
    "total": 48450
  },
  "explanation": "Selected the 30 km ring because it is the first feasible ring; feeder consolidation avoids a large-truck lane detour.",
  "decisionLog": {
    "rejectedAlternatives": [
      { "label": "15 km ring", "reason": "Insufficient eligible stock" }
    ]
  }
}
```

### EXECUTE endpoints

- `POST /api/logistics/plans/:quoteId/confirm` — re-validates stock and cost, locks the price, and creates the executable plan.
- `POST /api/logistics/plans/:quoteId/dispatch` — creates expiring offers per leg. Acceptance is transactional and first-accept-wins; timeouts widen radius, then use the nearest hub vehicle, then alert `ADMIN`.
- `POST /api/logistics/transfers/:transferPointId/handover` — requires both driver QR/OTP confirmations and enforces the configured kilogram tolerance (default 2%). A mismatch creates a dispute event and a `TransferEvent`.

Dispatch and handover events are emitted through `logisticsEvents` and persisted through the M4 Prisma models. The map consumes farmer, transfer-point, and buyer pins plus a coloured polyline per leg type.

## 1. Contract Endpoints (Core Specification)

### 1.1 `GET /api/logistics/available-shipments`
Lists all unassigned or pending shipments ready for dispatch or transporter bidding.
- **Roles:** `LOGISTICS`, `ADMIN`
- **Query Parameters:**
  - `page` (optional, default: 1)
  - `limit` (optional, default: 20)
  - `district` (optional, filter by pickup district)
- **Response `200`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "shp_1a2b3c",
        "trackingNumber": "SV-SHP-2026-0001",
        "orderId": "ord_101",
        "crop": "Tomato",
        "totalWeightKg": 2500,
        "pickupCount": 3,
        "pickupSummary": "Chakan, Manchar, Khed -> Hadapsar",
        "estimatedDistanceKm": 68.4,
        "suggestedVehicleType": "Mini-Truck",
        "status": "UNASSIGNED",
        "createdAt": "2026-10-21T01:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

---

### 1.2 `POST /api/logistics/shipments/:id/accept`
Assigns a vehicle and driver to a shipment, locking it into the `ASSIGNED` status.
- **Roles:** `LOGISTICS`, `ADMIN`
- **Path Parameters:** `id` (Shipment ID)
- **Body:**
  ```json
  {
    "vehicleId": "veh_mh12_4012",
    "driverNotes": "Departing from Chakan Hub at 06:00 AM"
  }
  ```
- **Response `200`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "shp_1a2b3c",
      "status": "ASSIGNED",
      "vehicleId": "veh_mh12_4012",
      "vehicleNumber": "MH-12-QX-4012",
      "driverName": "Shivaji Mane",
      "assignedAt": "2026-10-21T01:15:00.000Z"
    }
  }
  ```
- **Errors:**
  - `404 NOT_FOUND`: Shipment or vehicle does not exist.
  - `409 CONFLICT`: Shipment is already assigned or vehicle is unavailable.

---

### 1.3 `POST /api/logistics/shipments/:id/milestones`
Advances the shipment along the finite state machine:
`ASSIGNED` $\rightarrow$ `PICKUP` $\rightarrow$ `TRANSIT` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`.
- **Roles:** `LOGISTICS`, `ADMIN`
- **Path Parameters:** `id` (Shipment ID)
- **Body:**
  ```json
  {
    "milestone": "PICKUP",
    "latitude": 18.7606,
    "longitude": 73.8636,
    "stopId": "stop_1",
    "temperatureC": 14.2,
    "notes": "Collected 1000 kg from Farmer Ramesh at Chakan",
    "deliveryOtp": "492810"
  }
  ```
  *(Note: `deliveryOtp` is strictly required when transitioning to `DELIVERED`)*
- **Response `200`:**
  ```json
  {
    "success": true,
    "data": {
      "shipmentId": "shp_1a2b3c",
      "currentStatus": "PICKUP",
      "milestone": "PICKUP",
      "recordedAt": "2026-10-21T02:00:00.000Z",
      "temperatureC": 14.2
    }
  }
  ```
- **Errors:**
  - `422 VALIDATION_ERROR`: Illegal milestone transition or invalid OTP.
  - `404 NOT_FOUND`: Shipment not found.

---

### 1.4 `GET /api/logistics/shipments/:id/tracking`
Fetches real-time tracking information, latest GPS location, cold-chain temperature telemetry, and completed milestones.
- **Roles:** Any authenticated user (`FARMER`, `FPO`, `BUYER`, `LOGISTICS`, `ADMIN`)
- **Path Parameters:** `id` (Shipment ID)
- **Response `200`:**
  ```json
  {
    "success": true,
    "data": {
      "shipmentId": "shp_1a2b3c",
      "trackingNumber": "SV-SHP-2026-0001",
      "status": "TRANSIT",
      "vehicle": {
        "vehicleNumber": "MH-12-QX-4012",
        "driverName": "Shivaji Mane",
        "driverPhone": "+919822014012"
      },
      "currentLocation": {
        "latitude": 18.7125,
        "longitude": 73.8821,
        "speedKmh": 42.5,
        "lastPingAt": "2026-10-21T02:30:00.000Z"
      },
      "coldChain": {
        "currentTempC": 13.8,
        "status": "OPTIMAL",
        "minTempC": 10.0,
        "maxTempC": 16.0
      },
      "route": {
        "totalDistanceKm": 68.4,
        "remainingDistanceKm": 24.1,
        "etaMinutes": 38,
        "geometry": { "type": "LineString", "coordinates": [...] }
      },
      "stops": [
        { "sequence": 1, "name": "Farmer Ramesh", "type": "PICKUP", "status": "COMPLETED", "qtyKg": 1000 },
        { "sequence": 2, "name": "Farmer Suresh", "type": "PICKUP", "status": "COMPLETED", "qtyKg": 1500 },
        { "sequence": 3, "name": "FreshBasket Buyer Hub", "type": "DELIVERY", "status": "PENDING", "qtyKg": 2500 }
      ],
      "milestonesHistory": [
        { "status": "ASSIGNED", "timestamp": "2026-10-21T01:15:00.000Z" },
        { "status": "PICKUP", "timestamp": "2026-10-21T02:00:00.000Z" },
        { "status": "TRANSIT", "timestamp": "2026-10-21T02:15:00.000Z" }
      ]
    }
  }
  ```

---

## 2. Extended Member 4 Endpoints

### 2.1 `POST /api/logistics/plan`
Generates optimal sourcing and logistics fulfillment plans for a buyer's crop requirement. Compares single-farmer vs multi-farmer allocations, evaluates Total Landed Cost (TLC), enforces budget and grade constraints, and ranks up to 3 candidate plans.
- **Roles:** `BUYER`, `FPO`, `ADMIN`
- **Body:**
  ```json
  {
    "crop": "Tomato",
    "qtyKg": 2500,
    "maxBudget": 75000,
    "minGrade": "GRADE_B",
    "minReliability": 0.70,
    "priority": 0.5,
    "buyerLat": 18.5089,
    "buyerLng": 73.9260,
    "buyerAddress": "Hadapsar Wholesale Market, Pune"
  }
  ```
- **Response `200`:**
  ```json
  {
    "success": true,
    "data": {
      "crop": "Tomato",
      "requestedQtyKg": 2500,
      "maxBudget": 75000,
      "priority": 0.5,
      "plans": [
        {
          "planId": "plan_best_val",
          "label": "BEST_VALUE",
          "isSingleSource": false,
          "farmers": [
            {
              "farmerId": "f_pune_01",
              "batchId": "b_tom_01",
              "name": "Ramesh Kulkarni",
              "village": "Manchar",
              "qtyKg": 1500,
              "pricePerKg": 22.0,
              "grade": "GRADE_A",
              "reliability": 0.92,
              "matchScore": 88.4,
              "lat": 18.9880,
              "lng": 73.9400,
              "pickupSeq": 1
            },
            {
              "farmerId": "f_pune_02",
              "batchId": "b_tom_02",
              "name": "Suresh Bhor",
              "village": "Khed",
              "qtyKg": 1000,
              "pricePerKg": 23.5,
              "grade": "GRADE_A",
              "reliability": 0.88,
              "matchScore": 84.1,
              "lat": 18.8470,
              "lng": 73.9100,
              "pickupSeq": 2
            }
          ],
          "costBreakdown": {
            "productCost": 56500.0,
            "transportCost": 2840.0,
            "handlingCost": 1250.0,
            "platformFee": 1130.0,
            "aggregationFee": 350.0,
            "riskCost": 1130.0,
            "gst": 0.0,
            "totalCost": 63200.0
          },
          "totalCost": 63200.0,
          "effectivePricePerKg": 25.28,
          "avgGrade": "GRADE_A",
          "avgReliability": 0.904,
          "etaMinutes": 110,
          "routeKm": 78.5,
          "savings": {
            "baselineKm": 142.0,
            "optimizedKm": 78.5,
            "savedKm": 63.5,
            "fuelSavedRs": 1508.13,
            "utilizationPercent": 83.3
          },
          "vehicleSuggestion": {
            "vehicleType": "Mini-Truck",
            "capacityKg": 3000,
            "targetUtilization": 83.3
          },
          "routeGeometry": { "type": "LineString", "coordinates": [...] }
        }
      ],
      "overBudget": false
    }
  }
  ```
- **Over-Budget Response `200`:** If no candidate plan satisfies `maxBudget`, returns the best plan found with `overBudget: true`, `overBudgetBy: <diff>`, and actionable recommendation:
  ```json
  {
    "overBudget": true,
    "overBudgetBy": 4200.0,
    "hint": "Reduce requested quantity from 2500 kg to 2100 kg to fit your ₹75000 budget."
  }
  ```

---

### 2.2 `POST /api/logistics/shipments`
Internal/Admin endpoint to create a concrete shipment record from an accepted order and selected plan.
- **Roles:** `ADMIN`, `BUYER`, or internal service call
- **Body:**
  ```json
  {
    "orderId": "ord_101",
    "planId": "plan_best_val",
    "planData": { ... }
  }
  ```
- **Response `201`:** Created shipment details with generated delivery OTP.

---

### 2.3 `GET /api/logistics/shipments`
List shipments with pagination, role filtering, and status filters.
- **Roles:** `LOGISTICS`, `ADMIN`
- **Query Parameters:** `page`, `limit`, `status`

---

### 2.4 `GET /api/logistics/shipments/:id`
Retrieves detailed shipment info, vehicle details, stops, and milestone timeline.
- **Roles:** Owner roles (`BUYER`, `FARMER`, `LOGISTICS`, `ADMIN`)

---

### 2.5 `GET /api/logistics/vehicles` & `POST /api/logistics/vehicles` & `PATCH /api/logistics/vehicles/:id`
Fleet vehicle inventory management.
- **Roles:** `LOGISTICS`, `ADMIN`

---

### 2.6 `POST /api/logistics/vehicles/:id/location`
Driver or GPS device telemetry ingestion.
- **Roles:** `LOGISTICS`, `ADMIN`
- **Body:**
  ```json
  {
    "latitude": 18.7230,
    "longitude": 73.8910,
    "speedKmh": 45.0,
    "temperatureC": 13.5
  }
  ```

---

### 2.7 `GET /api/logistics/map/:orderId`
Map visualization metadata for an active order: farmer pins (numbered sequence), buyer pin, assigned vehicle pin, and road geometry polyline.
- **Roles:** Authenticated owner roles (`BUYER`, `FARMER`, `LOGISTICS`, `ADMIN`)

---

### 2.8 `GET /api/logistics/analytics/savings`
Aggregated CVRP optimization impact metrics: total baseline km vs optimized km, total fuel saved (₹), and fleet capacity utilization %.
- **Roles:** `LOGISTICS`, `ADMIN`

---

## 3. Data Source Adapters & Fallback Strategy

When running in Standalone Mode (`LOGISTICS_DATA_SOURCE=mock`), the module operates without dependencies on unmerged database tables:
- **Missing / Derived Fields Handling:**
  - `grade`: Defaults to `GRADE_A` or uses `qualityGrade` from `ProduceListing`.
  - `reliability`: Computed from farmer historical delivery count or default baseline `0.85`.
  - `lat/lng`: When a profile lacks explicit coordinates, geocoded district centroid fallbacks (Pune district hubs: Chakan `18.7606, 73.8636`, Manchar `18.9880, 73.9400`, Khed `18.8470, 73.9100`, etc.) are applied automatically.
