# SasyaVahini (सस्यवाहिनी)

> **"Farm to Market. Fair for Everyone."**  
> *Next-Generation Autonomous Agricultural Supply Chain & AI Market Intelligence Platform*

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-blue.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.2-purple.svg)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-1b222d.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg)](https://www.docker.com/)

---

## 🌾 The Problem

In India's current agricultural supply chain, farmers face systemic exploitation through layered intermediaries:
- **Depressed Farmer Realization:** Farmers receive only 15%–30% of the terminal consumer rupee.
- **Inflated Consumer Cost:** Multiple handling margins and transport markups inflate prices for retail and institutional buyers.
- **Information Asymmetry:** Farmers lack predictive visibility into demand peaks, localized mandi price arbitrage, and aggregation opportunities.
- **Fragmented Logistics:** High transit spoilage due to unoptimized vehicle routing, empty backhauls, and uncoordinated small-batch hauling.

---

## 🚀 The SasyaVahini Solution

SasyaVahini is an enterprise-grade digital agriculture platform connecting **Farmers**, **Farmer Producer Organizations (FPOs)**, **Bulk Buyers**, and **Logistics Fleet Operators** through an interconnected microservice stack:

1. **AI Demand Forecasting & Pricing Intelligence (`ml-service`):**
   - Multi-horizon quantile demand regressors ($P_{10}, P_{50}, P_{90}$) calibrated with crop perishability decay and festival calendars.
   - Inter-mandi spatial arbitrage engine calculating net road freight friction and margin optimization.
   - Price elasticity clearing curves to safeguard farmers against distress-selling.
2. **Capacitated Vehicle Routing Problem (CVRP) Logistics (`routing-service`):**
   - Google OR-Tools logistics solver minimizing freight mileage and transit spoilage.
   - Dynamic pickup pooling from multiple smallholder farms to wholesale fulfillment points.
   - Real-time fleet tracking, milestone verification, and live interactive routing maps.
3. **Atomic Inventory & Reservation Ledger (`backend`):**
   - Strict database-level concurrency control preventing phantom inventory and double-selling.
   - Automatic splitting and aggregation of institutional buyer orders across FPO farmer clusters.
4. **Accessible Multilingual Portals (`frontend`):**
   - Dedicated role-based portals for Farmers, Buyers, and Logistics operators.
   - Multilingual interface supporting **English**, **Hindi (हिंदी)**, and **Telugu (తెలుగు)**.
   - Voice-assisted produce listing modal with speech recognition for rural farmers.

---

## 🏛️ System Architecture

```
                                  ┌───────────────────────────┐
                                  │      Client Browsers      │
                                  │ (Farmer / Buyer / Fleet)  │
                                  └─────────────┬─────────────┘
                                                │ HTTP / 5173
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               SasyaVahini Frontend (Vite + React)                       │
│      • /login (Farmer & Partner)   • /buyer/login (Buyer)   • /logistics/login (Fleet)  │
└───────────────────────────────────────┬─────────────────────────────────────────────────┘
                                        │ REST API / 5000
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               SasyaVahini Express API Gateway                           │
│     • Auth & RBAC (JWT)    • Produce & FPO Routing     • Order & Reservation Ledger     │
└───────┬───────────────────────────────┬─────────────────────────────────────────┬───────┘
        │                               │                                         │
        ▼                               ▼                                         ▼
┌───────────────────────┐   ┌─────────────────────────────┐   ┌───────────────────────────┐
│  PostgreSQL Database  │   │      FastAPI ML Engine      │   │   FastAPI Routing Engine  │
│      (Port 5432)      │   │         (Port 8000)         │   │        (Port 8001)        │
│ • Prisma ORM          │   │ • Quantile Regressors (Pxx) │   │ • Google OR-Tools CVRP    │
│ • Atomic Transactions │   │ • Mandi Spatial Arbitrage   │   │ • Multi-stop Consolidation│
│ • Role Profiles       │   │ • Price Elasticity Engine   │   │ • OSRM Road Distance API  │
└───────────────────────┘   └─────────────────────────────┘   └───────────────────────────┘
```

---

## 📁 Repository Structure

```
SasyaVahini/
├── docker-compose.yml          # Production multi-container orchestrator
├── docker-compose.dev.yml      # Development orchestrator with live hot-reloading
├── .dockerignore               # Container build ignore rules
├── .env.example                # Unified environment variables template
├── package.json                # Monorepo root workspaces config
│
├── backend/                    # Node.js + Express REST API Gateway
│   ├── Dockerfile              # Production containerfile
│   ├── Dockerfile.dev          # Dev containerfile (Nodemon)
│   ├── prisma/
│   │   ├── schema.prisma       # Master PostgreSQL schema & relations
│   │   ├── migrations/         # Prisma migration history
│   │   └── seed.js             # Realistic multi-role seed dataset
│   └── src/
│       ├── controllers/        # Farmer, Buyer, FPO, Logistics & ML controllers
│       ├── routes/             # Express API endpoints
│       ├── services/           # Core domain logic & microservice proxies
│       └── schemas/            # Zod request validation schemas
│
├── frontend/                   # React 18 + Vite SPA Client
│   ├── Dockerfile              # Production Nginx containerfile
│   ├── Dockerfile.dev          # Dev containerfile (Vite HMR)
│   └── src/
│       ├── components/         # Reusable UI & role widgets
│       ├── pages/              # Portal dashboards & dedicated login views
│       ├── locales/            # i18n translations (en, hi, te)
│       └── services/           # Axios API clients (Core, ML, Logistics)
│
├── ml-service/                 # Python FastAPI AI Forecasting Microservice
│   ├── Dockerfile              # Production Python 3.11 containerfile
│   ├── requirements.txt        # Scikit-learn, Pandas, FastAPI, Uvicorn
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint (/health, /predict-demand)
│   │   ├── models/             # Quantile model inference & arbitrage math
│   │   └── artifacts/          # Pre-trained .joblib model binaries
│   └── data/                   # Historical Mandi price & harvest dataset
│
└── routing-service/            # Python FastAPI Logistics Solver Microservice
    ├── Dockerfile              # Production Python 3.11 containerfile
    ├── requirements.txt        # Google OR-Tools, FastAPI, Uvicorn
    └── main.py                 # CVRP vehicle routing solver (/plan-route)
```

---

## 👥 Role Portals & URLs

| Portal | Access URL | Dedicated Role | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Farmer & Partner** | [`/login`](http://localhost:5173/login) | `FARMER`, `FPO` | Voice-assisted crop listing, harvest pool management, payout tracking, AI price intelligence. |
| **Buyer Portal** | [`/buyer/login`](http://localhost:5173/buyer/login) | `BUYER` | Real-time produce discovery, batch reservation, contract management, APMC price trends. |
| **Logistics Fleet** | [`/logistics/login`](http://localhost:5173/logistics/login) | `LOGISTICS` | Optimized CVRP delivery route plans, live vehicle GPS simulation, milestone confirmation. |
| **Market Intelligence** | [`/market-intelligence`](http://localhost:5173/market-intelligence) | Authenticated | 7-day harvest forecast, multi-horizon quantiles ($P_{10}/P_{50}/P_{90}$), Mandi arbitrage. |
| **ML Service Docs** | [`http://localhost:8000/docs`](http://localhost:8000/docs) | Developer | Swagger UI for AI Demand & Pricing API. |
| **Routing Service Docs**| [`http://localhost:8001/docs`](http://localhost:8001/docs) | Developer | Swagger UI for CVRP Route Solver API. |

---

## ⚡ Quick Start Guide

### Option 1: Docker Compose (Recommended — Zero Host Configuration)

Run the complete 5-microservice stack with live code reloading:

```bash
# 1. Clone the repository
git clone https://github.com/Shankar6300/SasyaVahini.git
cd SasyaVahini

# 2. Copy the environment template
cp .env.example .env

# 3. Spin up all containers in development mode
docker compose -f docker-compose.dev.yml up --build
```

* Frontend: **`http://localhost:5173`**
* Backend API: **`http://localhost:5000`**
* ML Service Docs: **`http://localhost:8000/docs`**
* Routing Service Docs: **`http://localhost:8001/docs`**

To run in production mode:
```bash
docker compose up --build
```
Access the application at **`http://localhost:8080`**.

---

### Option 2: Local Bare-Metal Setup

#### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Python**: v3.10 or higher
- **PostgreSQL**: v14 or higher (running on port `5432`)

#### 1. Install Node Dependencies
```bash
npm install
```

#### 2. Configure Environment Variables
```bash
cp .env.example .env
cp .env.example backend/.env
```
Ensure your `DATABASE_URL` in `.env` matches your local PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sasyavahini?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/sasyavahini?schema=public"
```

#### 3. Database Migration & Seeding
```bash
# Generate Prisma Client
npm run db:generate --workspace=backend

# Run schema migrations
npm run db:migrate --workspace=backend

# Seed database with realistic users and listings
npm run db:seed --workspace=backend
```

#### 4. Setup Python Microservices
```bash
# Install ML Service dependencies
pip install -r ml-service/requirements.txt

# Install Logistics Routing dependencies
pip install -r routing-service/requirements.txt
```

#### 5. Launch All Services
Open separate terminals for each service:

```bash
# Terminal 1: Backend API Gateway (Port 5000)
npm run dev --workspace=backend

# Terminal 2: Frontend SPA (Port 5173)
npm run dev --workspace=frontend

# Terminal 3: AI Demand Forecasting Engine (Port 8000)
cd ml-service && uvicorn app.main:app --port 8000 --reload

# Terminal 4: CVRP Logistics Routing Engine (Port 8001)
cd routing-service && uvicorn main:app --port 8001 --reload
```

---

## 🔑 Test Accounts (From Database Seed)

All accounts share the default password: **`Password123!`**

| Role | Email | Purpose |
| :--- | :--- | :--- |
| **Farmer** | `farmer@sasyavahini.in` | Manage produce batches, view price predictions |
| **FPO Admin** | `fpo@sasyavahini.in` | Pool smallholder listings, aggregate supply |
| **Buyer** | `buyer@sasyavahini.in` | Purchase produce, create contracts |
| **Logistics** | `logistics@sasyavahini.in` | View routes, update shipment milestones |
| **Admin** | `admin@sasyavahini.in` | Platform governance and system audit |

---

## 🧪 Testing

```bash
# Run backend integration tests
npm run test --workspace=backend

# Run frontend unit tests
npm run test --workspace=frontend

# Run ML model validation
cd ml-service && python -m app.training.verify_models
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).  
Copyright © 2026 SasyaVahini Team.
