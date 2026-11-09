import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, ArrowRight, CheckCircle2, RotateCw, Filter } from 'lucide-react';
import logisticsApi from '../../services/logisticsApi';

/**
 * SasyaVahini — Shipment List Page
 *
 * Owner: Member 4
 */
export default function ShipmentList() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await logisticsApi.getShipments({
        status: filterStatus === 'ALL' ? undefined : filterStatus,
      });
      setShipments(res.shipments || []);
    } catch (err) {
      console.error('Failed to fetch shipments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [filterStatus]);

  const getStatusBadge = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'UNASSIGNED':
        return <span className="badge badge-neutral">UNASSIGNED</span>;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="heading-2 flex items-center gap-2">
            <Package size={24} style={{ color: 'var(--color-primary)' }} />
            Shipment Dispatch Center
          </h1>
          <p className="text-secondary text-sm">
            Monitor and advance active multi-stop procurement shipments across Maharashtra.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchShipments}
          className="btn btn-secondary text-sm flex items-center gap-1.5"
        >
          <RotateCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {['ALL', 'UNASSIGNED', 'ASSIGNED', 'PICKUP', 'TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              filterStatus === st
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
            style={{
              borderColor: filterStatus === st ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: filterStatus === st ? 'var(--color-primary)' : undefined,
            }}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Shipments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-secondary">Loading shipments...</div>
        ) : shipments.length === 0 ? (
          <div className="card p-12 text-center text-secondary">
            <Package size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">No shipments found in {filterStatus} state.</p>
          </div>
        ) : (
          shipments.map((s) => (
            <div
              key={s.id}
              className="card p-5 rounded-xl bg-white border hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-base" style={{ color: 'var(--color-primary)' }}>
                    {s.trackingNumber}
                  </span>
                  {getStatusBadge(s.status)}
                  <span className="text-xs text-secondary font-mono">Order: {s.orderId}</span>
                </div>

                <div className="text-xs text-secondary flex flex-wrap items-center gap-4">
                  <span>📦 Load: <strong className="text-gray-800">{s.totalWeightKg} kg</strong></span>
                  <span>🛣️ Route: <strong className="text-gray-800">{s.totalDistanceKm || 0} km</strong></span>
                  <span>
                    🚚 Vehicle: <strong className="text-gray-800">{s.vehicleNumber || 'Pending Assignment'}</strong>
                  </span>
                  {s.driverName && <span>👤 Driver: <strong>{s.driverName}</strong></span>}
                </div>

                {s.stops && s.stops.length > 0 && (
                  <div className="text-xs text-secondary pt-1 flex items-center gap-1.5">
                    <span className="font-medium text-gray-700">Stops:</span>
                    {s.stops.map((stop, i) => (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded text-[11px] ${
                          stop.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 font-medium'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {stop.sequence}. {stop.stopName?.slice(0, 18)}
                        {stop.status === 'COMPLETED' ? ' ✓' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => navigate(`/logistics/map?shipmentId=${s.id}`)}
                  className="btn btn-secondary text-xs"
                >
                  Live Map
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/logistics/milestones?shipmentId=${s.id}`)}
                  className="btn btn-primary text-xs flex items-center gap-1"
                >
                  Advance Status <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
