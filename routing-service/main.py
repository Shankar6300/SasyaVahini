"""
SasyaVahini — Logistics CVRP Optimization Microservice
Python 3.12 + FastAPI + Google OR-Tools

Solves Capacitated Vehicle Routing Problem (CVRP):
- Multi-depot starts (each vehicle starts at its current hub/location)
- Common destination (all vehicles terminate at the Buyer node)
- Vehicle capacity dimensions and demand constraints
- Objective: Minimize total traveled kilometers
- Solver: PATH_CHEAPEST_ARC + GUIDED_LOCAL_SEARCH (3s limit)

Owner: Member 4
"""

import math
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

app = FastAPI(
    title="SasyaVahini Routing & CVRP Service",
    description="OR-Tools vehicle routing optimization for agricultural multi-stop procurement",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic Data Models ───────────────────────────────────────────────────────

class DepotNode(BaseModel):
    id: str
    lat: float
    lng: float


class PickupNode(BaseModel):
    id: str
    name: Optional[str] = "Farmer Pickup"
    lat: float
    lng: float
    demandKg: float = Field(default=0, ge=0)


class BuyerNode(BaseModel):
    id: str
    lat: float
    lng: float
    name: Optional[str] = "Buyer Hub"


class VehicleSpec(BaseModel):
    id: str
    capacityKg: float = Field(gt=0)


class OptimizeRequest(BaseModel):
    depots: List[DepotNode]
    pickups: List[PickupNode]
    buyer: BuyerNode
    vehicles: List[VehicleSpec]


# ─── Distance Helpers ──────────────────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    if lat1 == lat2 and lon1 == lon2:
        return 0.0
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def road_km(lat1: float, lon1: float, lat2: float, lon2: float, detour: float = 1.3) -> float:
    return haversine_km(lat1, lon1, lat2, lon2) * detour


# ─── CVRP Solver Core ─────────────────────────────────────────────────────────

def solve_cvrp(request: OptimizeRequest):
    num_vehicles = len(request.vehicles)
    if num_vehicles == 0:
        raise ValueError("At least one vehicle required")
    if len(request.pickups) == 0:
        raise ValueError("At least one pickup stop required")

    # Nodes layout:
    # 0 .. (num_vehicles - 1): Vehicle Start Depots
    # num_vehicles .. (num_vehicles + num_pickups - 1): Pickup Nodes
    # Final index: Buyer End Node
    num_pickups = len(request.pickups)
    buyer_idx = num_vehicles + num_pickups
    total_nodes = buyer_idx + 1

    all_coords = []
    # 1. Depots
    for i in range(num_vehicles):
        depot = request.depots[i] if i < len(request.depots) else request.depots[0]
        all_coords.append((depot.lat, depot.lng))

    # 2. Pickups
    demands = [0] * num_vehicles
    for p in request.pickups:
        all_coords.append((p.lat, p.lng))
        demands.append(int(p.demandKg))

    # 3. Buyer
    all_coords.append((request.buyer.lat, request.buyer.lng))
    demands.append(0)

    # Build Distance Matrix (in meters as integers for OR-Tools)
    distance_matrix = []
    for i in range(total_nodes):
        row = []
        for j in range(total_nodes):
            if i == j:
                row.append(0)
            else:
                dist_m = int(road_km(all_coords[i][0], all_coords[i][1],
                                     all_coords[j][0], all_coords[j][1]) * 1000)
                row.append(dist_m)
        distance_matrix.append(row)

    # Setup Routing Model
    starts = list(range(num_vehicles))
    ends = [buyer_idx] * num_vehicles

    manager = pywrapcp.RoutingIndexManager(total_nodes, num_vehicles, starts, ends)
    routing = pywrapcp.RoutingModel(manager)

    # Transit Distance Callback
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Capacity & Demand Dimension
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    vehicle_capacities = [int(v.capacityKg) for v in request.vehicles]

    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        vehicle_capacities,
        True,  # start cumul to zero
        "Capacity"
    )

    # Search Parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 3

    # Solve
    solution = routing.SolveWithParameters(search_parameters)
    if not solution:
        return None

    # Extract Routes
    routes_out = []
    total_distance_m = 0
    total_load_kg = 0

    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        route_stops = []
        route_dist_m = 0
        route_load = 0
        coords = []

        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            # If it's a pickup node
            if num_vehicles <= node_index < buyer_idx:
                p_idx = node_index - num_vehicles
                pickup = request.pickups[p_idx]
                route_stops.append({
                    "sequence": len(route_stops) + 1,
                    "stopId": pickup.id,
                    "name": pickup.name,
                    "lat": pickup.lat,
                    "lng": pickup.lng,
                    "demandKg": pickup.demandKg,
                })
                route_load += pickup.demandKg

            coords.append([all_coords[node_index][1], all_coords[node_index][0]])
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_dist_m += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)

        # Buyer node
        buyer_node_idx = manager.IndexToNode(index)
        coords.append([all_coords[buyer_node_idx][1], all_coords[buyer_node_idx][0]])

        dist_km = round(route_dist_m / 1000.0, 1)
        total_distance_m += route_dist_m
        total_load_kg += route_load

        if len(route_stops) > 0:
            routes_out.append({
                "vehicleId": request.vehicles[vehicle_id].id,
                "stops": route_stops,
                "loadKg": route_load,
                "capacityKg": request.vehicles[vehicle_id].capacityKg,
                "distanceKm": dist_km,
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                }
            })

    # Baseline Km: each pickup has a direct return trip to buyer
    baseline_km = round(sum(
        2 * road_km(p.lat, p.lng, request.buyer.lat, request.buyer.lng)
        for p in request.pickups
    ), 1)

    optimized_km = round(total_distance_m / 1000.0, 1)
    saved_km = max(0.0, round(baseline_km - optimized_km, 1))
    fuel_saved_rs = round(saved_km * 23.75, 2)  # ₹23.75 per km

    total_cap = sum(r["capacityKg"] for r in routes_out) if routes_out else 1
    utilization_pct = min(100.0, round((total_load_kg / total_cap) * 100.0, 1))

    return {
        "routes": routes_out,
        "totalKm": optimized_km,
        "baselineKm": baseline_km,
        "savedKm": saved_km,
        "fuelSavedRs": fuel_saved_rs,
        "utilizationPercent": utilization_pct,
        "solver": "OR_TOOLS_CVRP_FASTAPI",
    }


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "SasyaVahini OR-Tools Routing Microservice",
        "version": "1.0.0",
        "solver": "Google OR-Tools pywrapcp",
    }


@app.post("/optimize")
def optimize_cvrp(request: OptimizeRequest):
    try:
        result = solve_cvrp(request)
        if not result:
            raise HTTPException(status_code=422, detail="No feasible CVRP solution found under vehicle constraints")
        return {
            "success": True,
            "data": result
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solver internal error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
