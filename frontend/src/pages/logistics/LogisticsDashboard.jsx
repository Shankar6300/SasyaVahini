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

  // Vehicle Management & Verification Modal States
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [inspectedVehicle, setInspectedVehicle] = useState(null);
  const [newVehicleForm, setNewVehicleForm] = useState({
    vehicleNumber: '',
    make: 'Tata',
    model: 'Intra V30',
    manufacturingYear: '2023',
    category: 'SCV',
    fuelType: 'DIESEL',
    capacityKg: '1500',
    mileageKmpl: '14.5',
    dimensions: '8.8ft x 5.3ft x 5.0ft',
    baseHub: 'Chakan Agri Hub',
    driverName: 'Kailash Jadhav',
    driverPhone: '+919822099881',
    isRefrigerated: false,
    minTempC: '10',
    maxTempC: '16',
    rcNumber: 'MH-14-AZ-RC99',
    insuranceNumber: 'COMM-INS-44910',
  });

  const handleAddVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      setAddingVehicle(true);
      await logisticsApi.createVehicle({
        ...newVehicleForm,
        capacityKg: parseFloat(newVehicleForm.capacityKg),
        mileageKmpl: parseFloat(newVehicleForm.mileageKmpl),
        manufacturingYear: parseInt(newVehicleForm.manufacturingYear, 10),
        documents: [
          { docType: 'RC', docNumber: newVehicleForm.rcNumber, fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_rc.pdf' },
          { docType: 'INSURANCE', docNumber: newVehicleForm.insuranceNumber, fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_insurance.pdf' },
        ],
      });
      setIsAddVehicleOpen(false);
      setNewVehicleForm({
        vehicleNumber: '',
        make: 'Tata',
        model: 'Intra V30',
        manufacturingYear: '2023',
        category: 'SCV',
        fuelType: 'DIESEL',
        capacityKg: '1500',
        mileageKmpl: '14.5',
        dimensions: '8.8ft x 5.3ft x 5.0ft',
        baseHub: 'Chakan Agri Hub',
        driverName: '',
        driverPhone: '',
        isRefrigerated: false,
        minTempC: '10',
        maxTempC: '16',
        rcNumber: '',
        insuranceNumber: '',
      });
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to register vehicle', err);
      alert(err.message || 'Failed to register vehicle');
    } finally {
      setAddingVehicle(false);
    }
  };

  const getVerificationBadge = (v) => {
    const status = v.verificationStatus || 'VERIFIED';
    if (status === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
          <CheckCircle size={10} /> VERIFIED
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
          <XCircle size={10} /> REJECTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
        <Clock size={10} /> PENDING
      </span>
    );
  };

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
        crop: 'Onion',
        qtyKg: 1500,
        maxBudget: 80000,
        minGrade: 'GRADE_B',
        minReliability: 0.70,
        priority: 0.5,
        buyerLat: 18.5089,
        buyerLng: 73.9260,
        buyerAddress: 'Pune APMC Market Yard, Gultekdi',
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
              baselineKm: 165,
              optimizedKm: 96,
              savedKm: 69,
              fuelSavedRs: 1639,
              utilizationPercent: 100,
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="card-title text-base">Active Commercial Vehicle Fleet (Pune District Corridors)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                {vehicles.length} Vehicles Listed
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Multi-category freight vehicles (SCV / MCV / HCV) with verified payload, fuel efficiency & RTO statutory compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              Register New Vehicle
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <th className="text-left py-2.5">Vehicle Reg. No.</th>
                <th className="text-left py-2.5">Make & Model</th>
                <th className="text-left py-2.5">Category</th>
                <th className="text-left py-2.5">Legal Payload</th>
                <th className="text-left py-2.5">Mileage (km/L)</th>
                <th className="text-left py-2.5">Driver & Phone</th>
                <th className="text-left py-2.5">Assigned Depot</th>
                <th className="text-left py-2.5">RTO Compliance</th>
                <th className="text-left py-2.5">Status</th>
                <th className="text-right py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id || v.vehicleNumber} className="border-b hover:bg-gray-50/70" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="py-2.5 font-bold text-gray-900">
                    <div className="flex items-center gap-1.5">
                      <Truck size={13} className="text-emerald-700" />
                      <span>{v.vehicleNumber}</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="font-semibold text-gray-800">{v.make || 'Tata'} {v.model || v.vehicleType}</div>
                    <div className="text-[10px] text-secondary">{v.manufacturingYear || 2023} • {v.fuelType || 'DIESEL'}</div>
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                      {v.category || (v.capacityKg > 5000 ? 'HCV' : v.capacityKg >= 2500 ? 'MCV' : 'SCV')}
                    </span>
                    {v.isRefrigerated && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">
                        ❄️ Reefer
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 font-bold text-gray-900">{v.capacityKg} kg</td>
                  <td className="py-2.5 text-secondary">{v.mileageKmpl || 14.5} km/L</td>
                  <td className="py-2.5">
                    <div className="font-medium text-gray-900">{v.driverName}</div>
                    <div className="text-[10px] text-secondary">{v.driverPhone}</div>
                  </td>
                  <td className="py-2.5 text-secondary">{v.baseHub || v.hubName || 'Pune Rural Depot'}</td>
                  <td className="py-2.5">{getVerificationBadge(v)}</td>
                  <td className="py-2.5">{getStatusChip(v.status)}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setInspectedVehicle(v)}
                      className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold"
                      title="Inspect technical specifications and certificates"
                    >
                      <Eye size={12} className="inline mr-1" />
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal: Register New Commercial Vehicle ─── */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-emerald-700" />
                <h3 className="font-bold text-base text-gray-900">Add Vehicle to Commercial Fleet</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVehicleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Vehicle Reg Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-12-RN-9988"
                    value={newVehicleForm.vehicleNumber}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Commercial Category *</label>
                  <select
                    value={newVehicleForm.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setNewVehicleForm((f) => ({
                        ...f,
                        category: cat,
                        capacityKg: cat === 'SCV' ? '1500' : cat === 'MCV' ? '3500' : '9000',
                        mileageKmpl: cat === 'SCV' ? '14.5' : cat === 'MCV' ? '8.5' : '4.5',
                      }));
                    }}
                    className="form-select text-xs w-full"
                  >
                    <option value="SCV">SCV - Small Commercial (&lt; 2.5T)</option>
                    <option value="MCV">MCV - Medium Commercial (2.5T - 9T)</option>
                    <option value="HCV">HCV - Heavy Commercial (&gt; 9T)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Manufacturer (Make) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Motors"
                    value={newVehicleForm.make}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, make: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Intra V30"
                    value={newVehicleForm.model}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, model: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Payload Capacity (kg) *</label>
                  <input
                    type="number"
                    required
                    value={newVehicleForm.capacityKg}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, capacityKg: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Fuel Efficiency (km/L) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newVehicleForm.mileageKmpl}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, mileageKmpl: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Fuel Type</label>
                  <select
                    value={newVehicleForm.fuelType}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, fuelType: e.target.value }))}
                    className="form-select text-xs w-full"
                  >
                    <option value="DIESEL">Diesel</option>
                    <option value="CNG">CNG</option>
                    <option value="ELECTRIC">Electric (EV)</option>
                    <option value="PETROL">Petrol</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanjay Thorat"
                    value={newVehicleForm.driverName}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, driverName: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Driver Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+919822001122"
                    value={newVehicleForm.driverPhone}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, driverPhone: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Base Logistics Hub *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chakan Agri Depot"
                    value={newVehicleForm.baseHub}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, baseHub: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Cargo Bed Dimensions</label>
                  <input
                    type="text"
                    placeholder="8.8ft x 5.3ft x 5.0ft"
                    value={newVehicleForm.dimensions}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, dimensions: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="font-semibold block mb-1">RC Certificate No.</label>
                  <input
                    type="text"
                    placeholder="MH14AZ-RC-2024"
                    value={newVehicleForm.rcNumber}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, rcNumber: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Commercial Insurance No.</label>
                  <input
                    type="text"
                    placeholder="NIC-COMM-9912"
                    value={newVehicleForm.insuranceNumber}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, insuranceNumber: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingVehicle}
                  className="btn btn-primary text-xs"
                >
                  {addingVehicle ? 'Registering...' : 'Register Vehicle & Queue for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Inspect Vehicle Specs & Documents ─── */}
      {inspectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-emerald-700" />
                <div>
                  <h3 className="font-bold text-base text-gray-900">{inspectedVehicle.vehicleNumber}</h3>
                  <p className="text-[11px] text-secondary">{inspectedVehicle.make || 'Tata'} {inspectedVehicle.model || inspectedVehicle.vehicleType}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedVehicle(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-secondary block">Category:</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.category || 'SCV'}</span>
              </div>
              <div>
                <span className="text-secondary block">Legal Payload:</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.capacityKg} kg</span>
              </div>
              <div>
                <span className="text-secondary block">Mileage (Physics Model):</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.mileageKmpl || 14.5} km/L</span>
              </div>
              <div>
                <span className="text-secondary block">Fuel Type:</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.fuelType || 'DIESEL'}</span>
              </div>
              <div>
                <span className="text-secondary block">Cargo Dimensions:</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.dimensions || '8.8ft x 5.3ft x 5.0ft'}</span>
              </div>
              <div>
                <span className="text-secondary block">Refrigeration:</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.isRefrigerated ? 'Yes (Cold-Chain)' : 'No (Ambient)'}</span>
              </div>
              <div>
                <span className="text-secondary block">Driver Assigned:</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.driverName} ({inspectedVehicle.driverPhone})</span>
              </div>
              <div>
                <span className="text-secondary block">Home Hub:</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.baseHub || inspectedVehicle.hubName || 'Pune Rural Depot'}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-teal-800">
                <ShieldCheck size={15} /> Statutory Verification Status
              </div>
              <div>• Status: <strong>{inspectedVehicle.verificationStatus || 'VERIFIED'}</strong></div>
              <div>• RC Certificate: {inspectedVehicle.rcVerified ? 'Verified ✓' : 'Under Review ⏳'}</div>
              <div>• Insurance: {inspectedVehicle.insuranceVerified ? 'Verified ✓' : 'Under Review ⏳'}</div>
              {inspectedVehicle.adminRemarks && <div>• Remarks: {inspectedVehicle.adminRemarks}</div>}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedVehicle(null)}
                className="btn btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
