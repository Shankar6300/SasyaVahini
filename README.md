# SasyaVahini (सस्यवाहिनी)

> **"Farm to Market. Fair for Everyone."**  
> *Smart India Hackathon (SIH 2026) — Problem 26033*

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-blue.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.2-purple.svg)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.14-1b222d.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791.svg)](https://www.postgresql.org/)

---

## 🌾 The Problem

In India's current agricultural supply chain, farmers are isolated by a layered web of intermediaries (middlemen, commission agents, regional wholesalers, local traders).
- **Depressed Farmer Realization:** Farmers receive only 15%–30% of the terminal consumer rupee.
- **Inflated Consumer Cost:** Multiple handling margins and transport markups inflate prices for buyers.
- **Information Asymmetry:** Farmers lack real-time visibility into mandi prices, aggregation opportunities via local Farmer Producer Organizations (FPOs), and route logistics.
- **Fragmented Logistics:** High transit spoilage due to sub-optimal routing, lack of cold-chain tracking, and uncoordinated small-batch hauling.

## 🚀 The SasyaVahini Solution

SasyaVahini is an enterprise-grade digital agriculture platform connecting **Farmers**, **FPOs**, **Bulk Buyers/Consumers**, and **Logistics Providers** with:
1. **Direct Procurement & Fair Pricing:** Transparent price discovery benchmarking against live government Mandi rates (Agmarknet).
2. **FPO Aggregation & Multi-Supplier Allocation:** Automated splitting and pooling of large buyer orders across multiple smallholder farmers via FPOs.
3. **Atomic Inventory & Reservation Ledger:** Strict database-level transaction guarantees preventing phantom inventory and overselling.
4. **End-to-End Route & Cold-Chain Logistics:** Consolidated route scheduling, multi-stop pickup optimization, and verifiable milestone handovers.
5. **Auditable Cost Breakdown:** Clear ledger detailing farmer realization, FPO margin, logistics cost, platform fee, and GST.

---

## 🏛️ Monorepo Architecture

```
SasyaVahiniFarmersFPO/
├── .env.example              # Centralized environment template
├── .gitignore                # Workspace gitignore
├── package.json              # Monorepo root workspace config
├── README.md                 # Project handbook (this file)
│
├── docs/                     # Engineering specifications
│   ├── ARCHITECTURE.md       # High-level architecture, schemas, state machines
│   ├── API_CONTRACT.md       # Unified REST API contract and status codes
│   ├── TEAM_MODULES.md       # 6-member team ownership and deliverables
│   └── DEVELOPMENT_WORKFLOW.md # Git branching, CI/CD, PR checklists
│
├── backend/                  # Node.js + Express API server
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma     # Complete PostgreSQL data model
│   │   └── seed.js           # Multi-role seed data for demo/testing
│   ├── src/
│   │   ├── app.js            # Express app, security middleware, routes
│   │   ├── index.js          # Server entrypoint with graceful shutdown
│   │   ├── controllers/      # Route controllers (auth, demo)
│   │   ├── middleware/       # Auth (JWT), RBAC, validation, rate limiting
│   │   ├── routes/           # Express router endpoints
│   │   ├── schemas/          # Zod validation schemas
│   │   ├── services/         # Business logic layer
│   │   └── utils/            # Logger, API response formatter, env validator
│   └── tests/                # Supertest + Jest integration tests
│
└── frontend/                 # React 18 + Vite SPA
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx           # Client-side router & protected routes
        ├── main.jsx          # App root with Context Providers
        ├── index.css         # Custom CSS design system (zero external CSS frameworks)
        ├── components/       # Shared UI components (Button, Card, FormField, etc.)
        ├── context/          # AuthContext & global state
        ├── pages/            # Role-specific dashboards & auth pages
        ├── services/         # Axios API client & token storage
        └── test/             # Vitest component test suites
```

---

## 👥 Role Taxonomy

| Role | Emoji | Description | Dashboard Route |
| :--- | :---: | :--- | :--- |
| **FARMER** | 🌾 | Individual crop producers listing harvest, viewing Mandi trends, and tracking payouts. | `/farmer` |
| **FPO** | 🤝 | Farmer Producer Organizations aggregating produce, bulk-dispatching, and managing farmer pools. | `/fpo` |
| **BUYER** | 🏪 | Institutional, wholesale, and retail buyers creating procurement purchase orders. | `/buyer` |
| **LOGISTICS** | 🚚 | Fleet operators, drivers, and transport coordinators executing multi-point transit. | `/logistics` |
| **ADMIN** | 🛡️ | System administrators managing user KYC, compliance, platform dispute arbitration, and audit logs. | `/admin` |

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14 or higher running locally or via Docker

### 1. Clone & Install Dependencies

```bash
# From the repository root
npm run install:all
```

### 2. Configure Environment Variables

```bash
# Copy template to backend/.env
cp .env.example backend/.env
```

Edit `backend/.env` to configure your PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sasyavahini?schema=public"
JWT_ACCESS_SECRET="generate-a-random-64-char-string"
JWT_REFRESH_SECRET="generate-another-random-64-char-string"
```

### 3. Database Migration & Seeding

```bash
# Generate Prisma Client
npm run db:generate

# Run schema migrations
npm run db:migrate

# Seed database with baseline users and demo data
npm run db:seed
```

### 4. Run Development Servers

Open two terminals or run concurrently:

```bash
# Terminal 1: Backend API (runs on http://localhost:5000)
npm run dev:backend

# Terminal 2: Frontend SPA (runs on http://localhost:5173)
npm run dev:frontend
```

---

## 🔑 Demo Seed Accounts

The database seed provides predefined credentials for testing all roles:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Farmer** | `farmer@sasyavahini.in` | `Password123!` |
| **FPO Admin** | `fpo@sasyavahini.in` | `Password123!` |
| **Buyer** | `buyer@sasyavahini.in` | `Password123!` |
| **Logistics** | `logistics@sasyavahini.in` | `Password123!` |
| **Admin** | `admin@sasyavahini.in` | `Password123!` |

---

## 🧪 Testing

```bash
# Run backend integration tests (requires PostgreSQL test database)
npm run test:backend

# Run frontend Vitest component tests
npm run test:frontend
```

---

## 📖 Detailed Engineering Documentation

For in-depth architecture, data contracts, and team module splits, consult:
- [System Architecture](docs/ARCHITECTURE.md)
- [API Contract & Error Conventions](docs/API_CONTRACT.md)
- [6-Member Team Module Specifications](docs/TEAM_MODULES.md)
- [Development & Git Branching Workflow](docs/DEVELOPMENT_WORKFLOW.md)

---

## ⚖️ License & Hackathon Notice

Developed exclusively for **Smart India Hackathon 2026** by Team SasyaVahini.  
Proprietary prototype — all rights reserved.
