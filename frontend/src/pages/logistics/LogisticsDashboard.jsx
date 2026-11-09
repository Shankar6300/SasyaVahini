import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  RotateCw,
  Navigation,
  CheckCircle,
  Layers,
  MapPin,
  ExternalLink,
  Thermometer,
  Package,
  Calendar,
  Sliders,
} from 'lucide-react';
import logisticsApi from '../../services/logisticsApi';
import LiveMap from '../../components/logistics/LiveMap';
import NearbyBuyerRadar from '../../components/logistics/NearbyBuyerRadar';
import SavingsCard from '../../components/logistics/SavingsCard';
import PlanCards from '../../components/logistics/PlanCards';
import ShipmentList from './ShipmentList';
import RouteMap from './RouteMap';
import MilestoneUpdater from './MilestoneUpdater';

/**
 * SasyaVahini — Logistics Operations Center & Sub-Router
 *
 * Owner: Member 4
 */
export default function LogisticsDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Child view routing based on pathname
  const path = location.pathname;
  if (path.includes('/shipments')) {
    return <ShipmentList />;
  }
  if (path.includes('/map')) {
    return <RouteMap />;
  }
  if (path.includes('/milestones')) {
    return <MilestoneUpdater />;
  }

  // Otherwise, render main Logistics Operations Dashboard
  return <MainOperationsDashboard />;
}

function MainOperationsDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [savings, setSavings] = useState(null);
  const [activeShipment, setActiveShipment] = useState(null);
  const [planResult, setPlanResult] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [vehRes, shpRes, savRes] = await Promise.all([
        logisticsApi.getVehicles(),
        logisticsApi.getShipments({ limit: 10 }),
        logisticsApi.getSavingsAnalytics(),
      ]);

      setVehicles(vehRes || []);
      const shipList = shpRes?.shipments || [];
      setShipments(shipList);
      setSavings(savRes);

      const active = shipList.find((s) => s.status === 'TRANSIT') || shipList[0];
      if (active) {
        setActiveShipment(active);
      }
    } catch (err) {
      console.error('Failed to load logistics dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRunOptimizer = async () => {
    try {
      setOptimizing(true);
      const planRes = await logisticsApi.planOrder({
        crop: 'Tomato',
        qtyKg: 2500,
        maxBudget: 75000,
        minGrade: 'GRADE_B',
        minReliability: 0.70,
        priority: 0.5,
        buyerLat: 18.5089,
        buyerLng: 73.9260,
        buyerAddress: 'Hadapsar Wholesale Market, Pune',
      });

      setPlanResult(planRes);
      if (planRes.plans && planRes.plans.length > 0) {
        setSelectedPlan(planRes.plans[0]);
      }
    } catch (err) {
      console.error('Optimization failed', err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleVehicleLocationUpdate = async (vehicleId, locationPayload) => {
    try {
      await logisticsApi.updateVehicleLocation(vehicleId, locationPayload);
    } catch (err) {
      console.error('Failed to send vehicle GPS telemetry', err);
    }
  };

  const getStatusChip = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'AVAILABLE':
        return <span className="badge badge-success">AVAILABLE</span>;
      case 'ASSIGNED':
        return <span className="badge badge-info">ASSIGNED</span>;
      case 'PICKUP':
        return <span className="badge badge-warning">PICKUP</span>;
      case 'TRANSIT':
        return <span className="badge" style={{ backgroundColor: '#7C3AED', color: '#fff' }}>IN TRANSIT</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="badge badge-warning">OUT FOR DELIVERY</span>;
      case 'DELIVERED':
        return <span className="badge badge-success">DELIVERED</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="main-content space-y-6">
      {/* ─── Module Sub-Navigation Bar ───────────────────────────────────────── */}
      <div className="logistics-subnav" style={{ borderColor: 'var(--color-border)' }}>
        <Link
          to="/logistics"
          className="px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-600 text-white"
        >
          Overview & Optimizer
        </Link>
        <Link
          to="/logistics/shipments"
          className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Shipments Dispatch
        </Link>
        <Link
          to="/logistics/map"
          className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Live Route Tracking
        </Link>
        <Link
          to="/logistics/milestones"
          className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Milestone Updater
        </Link>
      </div>

      <div className="logistics-workflow">
        <div className="logistics-workflow-heading">
          <div>
            <span className="logistics-eyebrow">Current delivery</span>
            <h2>{activeShipment?.trackingNumber || 'Preparing live shipment data'}</h2>
          </div>
          <span className={`logistics-status ${activeShipment ? 'is-live' : ''}`}>
            {activeShipment?.status || 'LOADING'}
          </span>
        </div>
        <div className="logistics-workflow-details">
          <span><strong>Route:</strong> Manchar → Khed → Hadapsar</span>
          <span><strong>Vehicle:</strong> {activeShipment?.vehicleNumber || 'Loading...'}</span>
          <span><strong>Driver:</strong> {activeShipment?.driverName || 'Loading...'}</span>
          <span><strong>Load:</strong> {activeShipment?.totalWeightKg || 0} kg</span>
        </div>
        <div className="logistics-workflow-actions">
          <Link to={`/logistics/map?shipmentId=${activeShipment?.trackingNumber || 'SV-DATASET-S2-001'}`} className="btn btn-primary btn-sm">
            View live map
          </Link>
          <Link to="/logistics/shipments" className="btn btn-secondary btn-sm">
            View shipments
          </Link>
          <Link to={`/logistics/milestones?shipmentId=${activeShipment?.trackingNumber || 'SV-DATASET-S2-001'}`} className="btn btn-secondary btn-sm">
            Update status
          </Link>
        </div>
      </div>

      {/* ─── Dark Header with CVRP Badge ───────────────────────────────────── */}
      <div
        className="logistics-header rounded-xl text-white shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1F2937 50%, #064E3B 100%)',
          color: '#FFFFFF',
        }}
      >
        <div className="logistics-header-content">
          <div className="logistics-header-meta">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-gray-950 flex items-center gap-1">
              <Layers size={13} /> CVRP v2.0
            </span>
            <span className="text-xs" style={{ color: '#D1D5DB' }}>OR-Tools + OSRM Multi-Stop Fleet Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#FFFFFF' }}>
            Logistics & Fleet Operations Control
          </h1>
          <p className="text-sm mt-1" style={{ color: '#D1D5DB' }}>
            Real-time multi-farmer pickup aggregation, capacity optimization, and cold-chain monitoring.
          </p>
        </div>

        <div className="logistics-header-actions">
          <button
            type="button"
            onClick={loadDashboardData}
            className="btn btn-secondary text-sm flex items-center gap-1.5 bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"
          >
            <RotateCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleRunOptimizer}
            disabled={optimizing}
            className="btn btn-primary text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
            style={{ backgroundColor: '#07875B', borderColor: '#07875B' }}
          >
            <Navigation size={16} className={optimizing ? 'animate-spin' : ''} />
            {optimizing ? 'Solving CVRP...' : 'Run Route Optimizer'}
          </button>
        </div>
      </div>

      {/* ─── Route Optimization Results (If executed) ────────────────────────── */}
      {planResult && planResult.plans && (
        <div className="card p-5 border-2 border-emerald-500 bg-emerald-50/20 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="text-emerald-600" size={20} />
              Optimization Result: {planResult.requestedQtyKg} kg {planResult.crop}
            </h2>
            <button
              type="button"
              onClick={() => setPlanResult(null)}
              className="text-xs text-secondary hover:underline"
            >
              Dismiss
            </button>
          </div>

          <PlanCards
            plans={planResult.plans}
            selectedPlanId={selectedPlan?.planId}
            onSelectPlan={(p) => setSelectedPlan(p)}
            priority={planResult.priority}
            onPriorityChange={(newPriority) => {
              logisticsApi
                .planOrder({
                  crop: planResult.crop,
                  qtyKg: planResult.requestedQtyKg,
                  priority: newPriority,
                  buyerLat: 18.5089,
                  buyerLng: 73.9260,
                })
                .then((res) => {
                  setPlanResult(res);
                  if (res.plans?.length > 0) setSelectedPlan(res.plans[0]);
                });
            }}
          />
        </div>
      )}

      {/* ─── Map & Impact Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Map Card (2 Cols) */}
        <div className="lg:col-span-2 card p-4 rounded-xl flex flex-col justify-between bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="card-title text-base flex items-center gap-2">
                <Truck size={18} style={{ color: 'var(--color-primary)' }} />
                Active Sourcing & Delivery Corridor (Pune Hub)
              </h2>
              <p className="text-xs text-secondary">
                {selectedPlan
                  ? `Viewing: ${selectedPlan.label} (${selectedPlan.farmers.length} farmers -> Buyer)`
                  : activeShipment
                  ? `Tracking ${activeShipment.trackingNumber} (${activeShipment.status})`
                  : 'Live Fleet Positions'}
              </p>
            </div>
            {activeShipment && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
                <Thermometer size={14} /> 13.8°C Cold-Chain
              </span>
            )}
          </div>

          <LiveMap
            key={activeShipment?.id || selectedPlan?.planId || 'fleet-preview'}
            farmers={selectedPlan ? selectedPlan.farmers : activeShipment ? activeShipment.stops.filter((s) => s.stopType === 'PICKUP') : []}
            buyer={selectedPlan ? selectedPlan.destination : { lat: 18.5089, lng: 73.9260, name: 'Hadapsar Hub' }}
            vehicle={activeShipment ? { ...activeShipment.currentLocation, vehicleNumber: activeShipment.vehicleNumber } : null}
            routeGeometry={selectedPlan?.routeGeometry || activeShipment?.routeGeometry}
            height="380px"
          />
        </div>

        {/* Optimization Impact (1 Col) */}
        <div className="flex flex-col gap-4">
          <SavingsCard
            savings={selectedPlan?.savings || savings || {
              baselineKm: 142.0,
              optimizedKm: 78.5,
              savedKm: 63.5,
              fuelSavedRs: 1508.13,
              utilizationPercent: 83.3,
            }}
          />

          <NearbyBuyerRadar
            vehicles={vehicles}
            shipments={shipments}
            onLocationUpdate={handleVehicleLocationUpdate}
          />

          {/* Quick Dispatch / Fleet Summary Card */}
          <div className="card p-4 rounded-xl bg-white border flex-1" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center justify-between">
              <span>Fleet Dispatch Hub</span>
              <span className="text-xs font-normal text-secondary">Pune Agri Zone</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                <span className="text-secondary">Total Registered Fleet:</span>
                <span className="font-bold text-gray-900">{vehicles.length || 10} Vehicles</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-emerald-50 text-emerald-800">
                <span>Available for Dispatch:</span>
                <span className="font-bold">
                  {vehicles.filter((v) => v.status === 'AVAILABLE').length || 7} Ready
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-purple-50 text-purple-800">
                <span>Active in Transit:</span>
                <span className="font-bold">
                  {vehicles.filter((v) => v.status === 'ASSIGNED' || v.status === 'IN_TRANSIT').length || 3} En Route
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => navigate('/logistics/shipments')}
                className="btn btn-secondary w-full text-xs"
              >
                View Shipments
              </button>
              <button
                type="button"
                onClick={() => navigate('/logistics/milestones')}
                className="btn btn-primary w-full text-xs"
              >
                Update Milestones
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Active Fleet Vehicles Table ────────────────────────────────────── */}
      <div className="card p-5 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="card-title text-base">Active Vehicle Fleet (Pune District Hubs)</h2>
            <p className="text-xs text-secondary">
              Real-time driver assignment, GPS coordinates, and capacity utilization.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <th className="text-left py-2">Vehicle No.</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Capacity</th>
                <th className="text-left py-2">Driver</th>
                <th className="text-left py-2">Assigned Hub</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id || v.vehicleNumber} className="border-b hover:bg-gray-50/70" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="py-2.5 font-bold text-gray-900">{v.vehicleNumber}</td>
                  <td className="py-2.5 text-secondary">{v.vehicleType}</td>
                  <td className="py-2.5 font-medium">{v.capacityKg} kg</td>
                  <td className="py-2.5">
                    <div>{v.driverName}</div>
                    <div className="text-[11px] text-secondary">{v.driverPhone}</div>
                  </td>
                  <td className="py-2.5 text-secondary">{v.hubName || 'Pune Rural Depot'}</td>
                  <td className="py-2.5">{getStatusChip(v.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Active Orders & Shipments Table ─────────────────────────────────── */}
      <div className="card p-5 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="card-title text-base">Active Procurement Orders & Shipments</h2>
            <p className="text-xs text-secondary">
              Multi-stop fulfillment progress, route distances, and milestone tracking.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <th className="text-left py-2">Tracking #</th>
                <th className="text-left py-2">Order ID</th>
                <th className="text-left py-2">Total Load</th>
                <th className="text-left py-2">Route Summary</th>
                <th className="text-left py-2">Distance</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-b hover:bg-gray-50/70" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="py-2.5 font-bold" style={{ color: 'var(--color-primary)' }}>
                    {s.trackingNumber}
                  </td>
                  <td className="py-2.5 text-secondary">{s.orderId}</td>
                  <td className="py-2.5 font-semibold">{s.totalWeightKg} kg</td>
                  <td className="py-2.5 text-secondary">
                    {s.stops?.length ? `${s.stops.length - 1} pickups -> ${s.stops[s.stops.length - 1]?.stopName?.slice(0, 20)}` : 'Multi-stop route'}
                  </td>
                  <td className="py-2.5">{s.totalDistanceKm} km</td>
                  <td className="py-2.5">{getStatusChip(s.status)}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveShipment(s);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="btn btn-secondary text-xs px-2 py-1"
                    >
                      Focus Map
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
