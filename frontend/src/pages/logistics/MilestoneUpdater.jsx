import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Thermometer,
  AlertCircle,
  Truck,
  RotateCw,
} from 'lucide-react';
import logisticsApi from '../../services/logisticsApi';

// FSM definition matching backend config
const VALID_TRANSITIONS = {
  UNASSIGNED: ['ASSIGNED'],
  ASSIGNED: ['PICKUP'],
  PICKUP: ['TRANSIT'],
  TRANSIT: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
};

const MILESTONE_DESCRIPTIONS = {
  ASSIGNED: 'Vehicle & driver designated; route dispatched from hub.',
  PICKUP: 'Arrived at farmer location and produce loaded into vehicle.',
  TRANSIT: 'All farm gates cleared; vehicle en route along highway corridor.',
  OUT_FOR_DELIVERY: 'Approaching destination geofence at buyer market yard.',
  DELIVERED: 'Consignee inspected goods; OTP verified; escrow payout released.',
};

/**
 * SasyaVahini — Milestone Progression & Proof of Delivery Page
 * Strict FSM enforcement: only legal next transitions are enabled.
 *
 * Owner: Member 4
 */
export default function MilestoneUpdater() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryId = searchParams.get('shipmentId') || 'SV-DATASET-S2-001';

  const [shipmentId, setShipmentId] = useState(queryId);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [temperatureC, setTemperatureC] = useState(14.0);
  const [notes, setNotes] = useState('');

  const loadShipment = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await logisticsApi.getShipmentById(shipmentId);
      setShipment(data);

      const nextAllowed = VALID_TRANSITIONS[data.status] || [];
      if (nextAllowed.length > 0) {
        setSelectedMilestone(nextAllowed[0]);
      } else {
        setSelectedMilestone('');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipment();
  }, [shipmentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMilestone) return;

    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = {
        milestone: selectedMilestone,
        temperatureC: parseFloat(temperatureC) || 14.0,
        notes: notes || `Milestone updated to ${selectedMilestone}`,
      };

      if (selectedMilestone === 'DELIVERED') {
        if (!otpInput || otpInput.trim().length !== 6) {
          throw new Error('Please enter the 6-digit delivery OTP provided by the buyer');
        }
        payload.deliveryOtp = otpInput.trim();
      }

      await logisticsApi.updateMilestone(shipment.id, payload);
      setSuccessMsg(`Shipment status advanced to ${selectedMilestone} successfully!`);
      setOtpInput('');
      setNotes('');
      // Reload shipment
      await loadShipment();
    } catch (err) {
      setErrorMsg(err.message || 'Milestone update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = shipment?.status || 'ASSIGNED';
  const validNextStates = VALID_TRANSITIONS[currentStatus] || [];

  return (
    <div className="main-content max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2 flex items-center gap-2">
            <Truck size={24} style={{ color: 'var(--color-primary)' }} />
            Shipment Milestone & Handover Protocol
          </h1>
          <p className="text-secondary text-sm">
            Verifiable milestone progression with OTP proof-of-delivery and cold-chain logging.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/logistics/shipments')}
          className="btn btn-secondary text-xs"
        >
          Back to Shipments
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-secondary">Loading shipment state...</div>
      ) : !shipment ? (
        <div className="card p-8 text-center text-secondary">
          <AlertCircle size={32} className="mx-auto mb-2 text-amber-500" />
          <p>Shipment not found. Please select a valid shipment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Action Form (2 Cols) */}
          <div className="md:col-span-2 card p-6 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between pb-4 border-b mb-5" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-xs text-secondary">Tracking Number</span>
                <div className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                  {shipment.trackingNumber}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-secondary">Current Status</span>
                <div>
                  <span className="badge badge-info uppercase font-bold text-xs">{currentStatus}</span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 rounded bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 mb-4 rounded bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border border-emerald-200 font-medium">
                <CheckCircle2 size={16} /> {successMsg}
              </div>
            )}

            {currentStatus === 'DELIVERED' ? (
              <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-2">
                <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
                <h3 className="font-bold text-base">Shipment Successfully Delivered!</h3>
                <p className="text-xs text-emerald-700">
                  Buyer OTP verified. Escrow disbursement signal emitted to Farmer & FPO payout ledgers.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Milestone Selection (Only legal transitions enabled) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Select Next Authorized Milestone:
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {['PICKUP', 'TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((m) => {
                      const isLegal = validNextStates.includes(m);
                      const isSelected = selectedMilestone === m;

                      return (
                        <div
                          key={m}
                          onClick={() => isLegal && setSelectedMilestone(m)}
                          className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                              : isLegal
                              ? 'hover:bg-gray-50 border-gray-300'
                              : 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-xs text-gray-900">{m.replace(/_/g, ' ')}</span>
                            <p className="text-[11px] text-secondary mt-0.5">{MILESTONE_DESCRIPTIONS[m]}</p>
                          </div>
                          {isSelected && <CheckCircle2 size={18} style={{ color: 'var(--color-primary)' }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* If DELIVERED: OTP Verification Input */}
                {selectedMilestone === 'DELIVERED' && (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                    <label className="block text-xs font-bold text-amber-900">
                      Buyer Consignee OTP Verification (Strictly Required):
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP (e.g. 492810)"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="input w-full text-center tracking-widest font-mono text-lg font-bold"
                      style={{ letterSpacing: '4px' }}
                      required
                    />
                    <div className="text-[11px] text-amber-800 flex items-center gap-1">
                      <ShieldCheck size={14} /> For demo simulation, the generated OTP is{' '}
                      <strong>{shipment.deliveryOtp || '492810'}</strong>.
                    </div>
                  </div>
                )}

                {/* Cold Chain Reading */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Cold-Chain Temperature (°C):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={temperatureC}
                        onChange={(e) => setTemperatureC(e.target.value)}
                        className="input w-full pr-8 text-xs"
                      />
                      <Thermometer
                        size={15}
                        className="absolute right-2.5 top-2.5 text-secondary pointer-events-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Driver Notes / Proof:</label>
                    <input
                      type="text"
                      placeholder="e.g. 1000 kg loaded at Manchar"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="input w-full text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedMilestone}
                  className="btn btn-primary w-full text-sm font-bold flex items-center justify-center gap-2 py-2.5"
                >
                  {submitting ? 'Updating Milestone...' : `Confirm & Advance to ${selectedMilestone || 'Next State'}`}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>

          {/* Timeline & Audit History (1 Col) */}
          <div className="card p-5 rounded-xl bg-white border flex flex-col justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-1.5">
                <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                Immutable Milestone Log
              </h3>

              <div className="space-y-4 relative border-l-2 ml-3 pl-4" style={{ borderColor: 'var(--color-border)' }}>
                {shipment.milestoneHistory?.map((h, idx) => (
                  <div key={idx} className="relative text-xs">
                    <span className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white" />
                    <div className="font-bold text-gray-900">{h.status || h.milestone}</div>
                    <div className="text-[11px] text-secondary">
                      {new Date(h.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {h.notes && <div className="text-[11px] text-gray-600 mt-0.5">{h.notes}</div>}
                    {h.temperatureC && (
                      <div className="text-[10px] text-purple-700 font-medium">🌡️ {h.temperatureC}°C</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t text-xs text-secondary" style={{ borderColor: 'var(--color-border)' }}>
              🔒 Cryptographically timestamped for audit & settlement compliance.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
