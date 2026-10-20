# SasyaVahini — Unified API Contract & Conventions

This document specifies the standard REST API envelope, error schema, HTTP status codes, and endpoint specifications for all backend modules.

---

## 1. Response Envelope Standards

All responses across every endpoint must adhere to the standardized JSON envelope. Ad-hoc unformatted JSON responses are forbidden.

### 1.1 Success Response (`sendSuccess`)

```json
{
  "success": true,
  "data": {
    "item": {}
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "totalPages": 5
  }
}
```

*Note: The `meta` key is optional and used for paginated or aggregated queries.*

### 1.2 Error Response (`sendError`)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      {
        "field": "phone",
        "message": "Must be a valid 10-digit Indian phone number"
      }
    ]
  }
}
```

---

## 2. Standard HTTP Status & Error Codes

| Status | Code | Meaning |
| :---: | :--- | :--- |
| `200` | OK | Successful fetch, update, or action |
| `201` | CREATED | Resource successfully created |
| `400` | `BAD_REQUEST` | Malformed JSON or invalid parameter syntax |
| `401` | `UNAUTHORIZED` | Missing, expired, or invalid JWT access token |
| `403` | `FORBIDDEN` | Valid token, but user role is not permitted to access this resource |
| `404` | `NOT_FOUND` | Resource with requested ID does not exist |
| `409` | `CONFLICT` | Resource collision (e.g. email/phone already registered) |
| `422` | `VALIDATION_ERROR` | Request body failed Zod schema checks |
| `429` | `RATE_LIMIT` | Too many requests sent within rate limit window |
| `500` | `INTERNAL_ERROR` | Unhandled server exception (logged via Winston) |
| `503` | `DB_UNAVAILABLE` | Database or essential service unavailable |

---

## 3. Authentication & Headers

All protected endpoints require the standard Bearer token header:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## 4. Endpoint Specifications

### 4.1 System & Health

#### `GET /api/health`
Returns system operational status and PostgreSQL database connection state.
- **Auth**: None (Public)
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "system": "SasyaVahini API",
      "version": "1.0.0",
      "database": "connected",
      "environment": "development",
      "timestamp": "2026-10-20T16:00:00.000Z"
    }
  }
  ```

---

### 4.2 Authentication & Profile (`/api/auth`)

#### `POST /api/auth/register`
Register a new user account with role selection and profile stub creation.
- **Auth**: None (Public)
- **Body**:
  ```json
  {
    "name": "Ramesh Kumar",
    "email": "ramesh.farmer@sasyavahini.in",
    "phone": "+919876543210",
    "password": "SecurePassword123!",
    "role": "FARMER",
    "language": "hi"
  }
  ```
- **Response `201`**: Returns newly created user profile and tokens.

#### `POST /api/auth/login`
Authenticate with email/phone and password.
- **Auth**: None (Public)
- **Body**:
  ```json
  {
    "email": "ramesh.farmer@sasyavahini.in",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr_9812739",
        "name": "Ramesh Kumar",
        "email": "ramesh.farmer@sasyavahini.in",
        "role": "FARMER",
        "status": "ACTIVE"
      },
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

#### `POST /api/auth/refresh`
Exchange a valid refresh token for a fresh short-lived access token.
- **Auth**: None (Valid refreshToken in body)
- **Body**: `{ "refreshToken": "eyJhbGciOi..." }`
- **Response `200`**: `{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }`

#### `GET /api/auth/me`
Fetch current authenticated user profile.
- **Auth**: Bearer Token
- **Response `200`**: User object with profile relations.

#### `POST /api/auth/logout`
Revoke refresh token and invalidate active session.
- **Auth**: Bearer Token
- **Body**: `{ "refreshToken": "eyJhbGciOi..." }`

---

### 4.3 Farmer & Produce Management (`/api/farmers`)

| Method | Endpoint | Role | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/farmers/batches` | `FARMER` | List logged-in farmer's produce batches |
| `POST` | `/api/farmers/batches` | `FARMER` | Create a new produce batch listing |
| `GET` | `/api/farmers/batches/:id` | `FARMER, FPO` | Get batch detail with allocation history |
| `PUT` | `/api/farmers/batches/:id` | `FARMER` | Update price/quantity if not yet allocated |
| `GET` | `/api/farmers/earnings` | `FARMER` | View historical payouts and escrow status |

---

### 4.4 FPO Aggregation & Operations (`/api/fpo`)

| Method | Endpoint | Role | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/fpo/members` | `FPO` | List affiliated member farmers and KYC status |
| `GET` | `/api/fpo/pools` | `FPO` | View aggregated crop clusters available for bulk sale |
| `POST` | `/api/fpo/pools` | `FPO` | Create consolidated bulk batch from member lots |
| `POST` | `/api/fpo/dispatch` | `FPO` | Trigger logistics dispatch for an aggregated order |

---

### 4.5 Marketplace & Orders (`/api/marketplace`, `/api/orders`)

| Method | Endpoint | Role | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/marketplace/produce` | `BUYER, ALL` | Browse and filter listed produce by crop, grade, location |
| `POST` | `/api/orders` | `BUYER` | Place purchase order with multi-batch reservations |
| `GET` | `/api/orders/:id` | `BUYER, FPO, ADMIN`| Get order details, item breakdown, and delivery milestones |
| `POST` | `/api/orders/:id/confirm-delivery` | `BUYER` | Buyer submits delivery OTP to complete order & release escrow |
| `POST` | `/api/orders/:id/dispute` | `BUYER` | Raise quality or weight discrepancy dispute |

---

### 4.6 Logistics & Tracking (`/api/logistics`)

| Method | Endpoint | Role | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/logistics/available-shipments`| `LOGISTICS`| List pending shipments ready for bidding or assignment |
| `POST` | `/api/logistics/shipments/:id/accept` | `LOGISTICS`| Accept shipment and assign vehicle/driver |
| `POST` | `/api/logistics/shipments/:id/milestones` | `LOGISTICS`| Post milestone update (PICKUP, TRANSIT, OUT_FOR_DELIVERY) |
| `GET` | `/api/logistics/shipments/:id/tracking` | `ALL (auth)`| Real-time geo-coordinates and temperature/cold-chain data |

---

### 4.7 ML & Mandi Analytics (`/api/ml`)

| Method | Endpoint | Role | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/ml/price-forecast` | `ALL (auth)`| Mandi price prediction based on historical trends & seasonality |
| `GET` | `/api/ml/spoilage-risk` | `FARMER, FPO`| Estimate shelf life decay based on ambient temperature and delay |
| `GET` | `/api/ml/optimal-route` | `LOGISTICS`| Compute multi-stop pickup routing cost and time |

---

### 4.8 Admin & Governance (`/api/admin`)

| Method | Endpoint | Role | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/admin/users` | `ADMIN` | Manage users and toggle KYC approval state |
| `GET` | `/api/admin/disputes` | `ADMIN` | List pending arbitration disputes |
| `POST` | `/api/admin/disputes/:id/resolve` | `ADMIN` | Issue settlement verdict (refund, split, or payout) |
| `GET` | `/api/admin/audit-logs` | `ADMIN` | Audit log of security and financial events |
