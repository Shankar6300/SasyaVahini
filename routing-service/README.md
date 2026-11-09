# SasyaVahini — Routing & Fleet Optimization Microservice

FastAPI + Google OR-Tools CVRP (Capacitated Vehicle Routing Problem) engine.

## Prerequisites
- Python 3.12+ (or 3.10+)

## Quick Start

```bash
# 1. Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start server (Port 8001)
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints
- `GET /health` — Health check
- `POST /optimize` — Solves multi-stop CVRP with start depots, pickup nodes, demands, and buyer destination

*Note: If this microservice is not running, the Node backend automatically falls back to its built-in 2-opt nearest-neighbor optimizer.*
