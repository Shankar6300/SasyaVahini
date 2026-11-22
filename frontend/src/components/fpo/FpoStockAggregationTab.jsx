import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Layers, CheckCircle2, AlertCircle, Calculator, Package, UserCheck,
  RefreshCw, Plus, ShieldCheck, MapPin, Building, ArrowRight, X, Info,
  SlidersHorizontal, Check
} from 'lucide-react';

const FpoStockAggregationTab = ({ fpoProfile, onLotCreated }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [confirmedContributions, setConfirmedContributions] = useState([]);
  const [summary, setSummary] = useState(null);

  // Filters
  const [cropFilter, setCropFilter] = useState('ALL');
  const [availableOnly, setAvailableOnly] = useState(true);

  // Selection & Allocation State: { [notificationId]: quantityKg }
  const [selectedAllocations, setSelectedAllocations] = useState({});
  const [lotVariety, setLotVariety] = useState('');
  const [lotGrade, setLotGrade] = useState('GRADE_A');
  const [lotNotes, setLotNotes] = useState('');
  const [storageLocation, setStorageLocation] = useState(
    fpoProfile?.address || (fpoProfile?.district ? `${fpoProfile.district}, ${fpoProfile.state || 'Maharashtra'}` : 'Central Hub Depot')
  );

  const [creatingLot, setCreatingLot] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const fetchConfirmedContributions = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get('/fpo/contributions/confirmed');
      const data = res.data?.data || res.data || {};
      setConfirmedContributions(data.contributions || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.warn('Error fetching confirmed contributions:', err);
      setErrorMessage(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfirmedContributions();
  }, []);

  // Filtered Contributions List
  const filteredList = confirmedContributions.filter((c) => {
    if (cropFilter !== 'ALL' && c.cropName.toLowerCase() !== cropFilter.toLowerCase()) {
      return false;
    }
    if (availableOnly && c.availableForLotKg <= 0) {
      return false;
    }
    return true;
  });

  const availableCrops = Array.from(new Set(confirmedContributions.map((c) => c.cropName)));

  // Toggle selection
  const handleToggleSelect = (contrib) => {
    const id = contrib.id;
    if (selectedAllocations[id] !== undefined) {
      const next = { ...selectedAllocations };
      delete next[id];
      setSelectedAllocations(next);
    } else {
      // Default to full available quantity
      setSelectedAllocations({
        ...selectedAllocations,
        [id]: contrib.availableForLotKg
      });
      // Auto-set variety and grade if first selection
      if (Object.keys(selectedAllocations).length === 0) {
        if (contrib.variety) setLotVariety(contrib.variety);
        if (contrib.qualityGrade) setLotGrade(contrib.qualityGrade);
      }
    }
  };

  const handleQuantityChange = (contribId, val, maxAvailable) => {
    const parsed = parseFloat(val);
    setSelectedAllocations({
      ...selectedAllocations,
      [contribId]: isNaN(parsed) ? 0 : Math.min(Math.max(0, parsed), maxAvailable)
    });
  };

  // Selected Items Validation & Calculations
  const selectedEntries = Object.entries(selectedAllocations).filter(([, qty]) => qty > 0);
  const selectedItems = selectedEntries.map(([id, qty]) => {
    const item = confirmedContributions.find((c) => c.id === id);
    return { ...item, allocatedKg: qty };
  }).filter(item => item && item.id);

  // Check Crop Compatibility
  const selectedCrops = Array.from(new Set(selectedItems.map((i) => i.cropName)));
  const isCompatibleCrop = selectedCrops.length <= 1;
  const targetCrop = selectedCrops[0] || (cropFilter !== 'ALL' ? cropFilter : '');

  // Calculate live volume and weighted average rate
  const totalAggregatedKg = selectedItems.reduce((sum, item) => sum + (item.allocatedKg || 0), 0);
  const totalCost = selectedItems.reduce((sum, item) => sum + ((item.allocatedKg || 0) * (item.offeredPricePerKg || 0)), 0);
  const weightedRatePerKg = totalAggregatedKg > 0 ? Math.round((totalCost / totalAggregatedKg) * 100) / 100 : 0;

  const handleCreateLot = async () => {
    setErrorMessage('');
    if (selectedItems.length === 0) {
      alert(t('fpo.selectAtLeastOneContrib', 'Please select at least 1 farmer contribution to assemble into a lot.'));
      return;
    }

    if (!isCompatibleCrop) {
      setErrorMessage(
        t('fpo.incompatibleCropsSelected', `Cannot consolidate different crops: You selected ${selectedCrops.join(', ')}. All contributions in a lot must be the same crop.`)
      );
      return;
    }

    setCreatingLot(true);
    try {
      const payload = {
        cropName: targetCrop,
        variety: lotVariety.trim() || undefined,
        qualityGrade: lotGrade,
        notes: lotNotes.trim() || undefined,
        storageLocation: storageLocation.trim() || undefined,
        contributions: selectedItems.map((item) => ({
          contributionId: item.id,
          quantityKg: item.allocatedKg
        }))
      };

      const res = await api.post('/fpo/lots', payload);
      const createdLot = res.data?.data?.lot || res.data?.data;
      setSuccessResult({
        message: res.data?.data?.message || t('fpo.lotCreatedSuccess', 'Consolidated produce lot created successfully!'),
        lot: createdLot
      });
      setSelectedAllocations({});
      fetchConfirmedContributions();
      if (onLotCreated) onLotCreated(createdLot);
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setCreatingLot(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-sky-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-emerald-800/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-2">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            🌾 {t('fpo.aggregationEngineTab', 'Smallholder Consolidation & Aggregation Engine')}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {t('fpo.produceAggregationTitle', 'Assemble Traceable Produce Lots')}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
            {t('fpo.produceAggregationSubtitle', 'Combine confirmed harvest quantities from multiple member farmers into standardized, single-origin wholesale lots. Traceability and farmer equity are maintained with exact volume-weighted rates.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchConfirmedContributions}
            disabled={loading}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh Stock')}
          </button>
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.confirmedMemberContributions', 'Confirmed Stock Available')}</p>
            <p className="text-xl font-black text-emerald-800">
              {(summary?.totalAvailableForLotKg || 0).toLocaleString()} kg
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.committedToLots', 'Already Committed in Lots')}</p>
            <p className="text-xl font-black text-sky-900">
              {(summary?.totalUsedInLotsKg || 0).toLocaleString()} kg
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.contributingFarmersPool', 'Confirmed Farmer Contributions')}</p>
            <p className="text-xl font-black text-amber-800">
              {summary?.totalConfirmedCount || 0} batches
            </p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successResult && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 space-y-3 animate-fade-in">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{successResult.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessResult(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {successResult.lot && (
            <div className="bg-white rounded-xl p-3 border border-emerald-200 text-xs flex flex-wrap gap-4 text-slate-700">
              <span><strong>{t('fpo.lotNumber', 'Lot Number')}:</strong> {successResult.lot.lotNumber}</span>
              <span><strong>{t('fpo.crop', 'Crop')}:</strong> {successResult.lot.cropName}</span>
              <span><strong>{t('fpo.totalQuantity', 'Consolidated Quantity')}:</strong> {successResult.lot.totalQuantityKg?.toLocaleString()} kg</span>
              <span><strong>{t('fpo.weightedRate', 'Weighted Rate')}:</strong> ₹{successResult.lot.weightedAvgPricePerKg}/kg</span>
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-xs animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold">{t('common.error', 'Aggregation Error')}</p>
            <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Consolidation Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT / CENTER: Confirmed Contributions Catalog (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  {t('fpo.confirmedMemberStock', 'Farmer-Confirmed Contribution Inventory')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('fpo.selectToConsolidateDesc', 'Select confirmed contributions to combine. Only compatible crops and available quantities can be bundled.')}
                </p>
              </div>

              {/* Crop Filter Pill */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">{t('fpo.allCrops', 'All Crops')}</option>
                  {availableCrops.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>{t('fpo.availableOnly', 'Available Only')}</span>
                </label>
              </div>
            </div>

            {/* List Table */}
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-bold">{t('common.loading', 'Loading confirmed farmer contributions…')}</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-10 text-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">{t('fpo.noConfirmedContributions', 'No confirmed contributions available for aggregation')}</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  {t('fpo.noConfirmedDesc', 'When member farmers accept contribution requests from the "Member Produce" tab, their confirmed lots will appear here ready to be assembled into wholesale consignments.')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredList.map((c) => {
                  const isSelected = selectedAllocations[c.id] !== undefined;
                  const allocQty = selectedAllocations[c.id] || 0;

                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-emerald-300 bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={c.availableForLotKg <= 0}
                            onChange={() => handleToggleSelect(c)}
                            className="accent-emerald-600 w-4 h-4 rounded cursor-pointer mt-1"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">{c.cropName}</span>
                              {c.variety && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                  {c.variety}
                                </span>
                              )}
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                {c.qualityGrade}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              <strong className="text-slate-700">{c.farmerName}</strong>
                              <span>• {c.farmerVillage}</span>
                            </p>
                          </div>
                        </div>

                        {/* Quantity and Price */}
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">{t('fpo.availableStock', 'Available')}</span>
                            <span className="font-black text-slate-900 text-sm">
                              {c.availableForLotKg.toLocaleString()} kg
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              (Total confirmed: {c.confirmedQtyKg} kg)
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">{t('fpo.agreedRate', 'Agreed Rate')}</span>
                            <span className="font-black text-emerald-700 text-sm">
                              ₹{c.offeredPricePerKg}/kg
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Quantity Slider/Input if Selected */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-emerald-200/60 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-700">
                            {t('fpo.allocateFromFarmer', 'Quantity to commit from this farmer:')}
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              min="1"
                              max={c.availableForLotKg}
                              value={allocQty}
                              onChange={(e) => handleQuantityChange(c.id, e.target.value, c.availableForLotKg)}
                              className="w-28 px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-right font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <span className="text-xs font-bold text-slate-600">/ {c.availableForLotKg} kg</span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(c.id, c.availableForLotKg, c.availableForLotKg)}
                              className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold text-slate-700"
                            >
                              Max
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Lot Builder Panel (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm sticky top-6">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calculator className="w-4 h-4 text-emerald-600" />
              {t('fpo.lotConsolidationSummary', 'Lot Assembly Specification')}
            </h3>

            {/* Target Crop Indicator */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t('fpo.consolidatedCrop', 'Target Crop')} *
              </label>
              <div className="text-sm font-black text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {targetCrop || t('fpo.selectContributionsFirst', 'Select contributions on left')}
              </div>
            </div>

            {/* Incompatibility Warning */}
            {!isCompatibleCrop && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  {t('fpo.cropMismatchWarning', `Incompatible crops selected (${selectedCrops.join(', ')}). A lot can only contain one crop type.`)}
                </span>
              </div>
            )}

            {/* Lot Variety & Quality */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {t('fpo.variety', 'Variety / Spec')}
                </label>
                <input
                  type="text"
                  value={lotVariety}
                  onChange={(e) => setLotVariety(e.target.value)}
                  placeholder="e.g. Vaishali"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {t('fpo.qualityGrade', 'Grade')}
                </label>
                <select
                  value={lotGrade}
                  onChange={(e) => setLotGrade(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="GRADE_A">Grade A</option>
                  <option value="GRADE_B">Grade B</option>
                  <option value="GRADE_C">Grade C</option>
                  <option value="ORGANIC_PREMIUM">Organic Premium</option>
                </select>
              </div>
            </div>

            {/* Storage Location */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                {t('fpo.storageLocation', 'Storage / Aggregation Depot')}
              </label>
              <input
                type="text"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="e.g. Warehouse 4, Pune"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                {t('fpo.lotNotes', 'Consolidated Lot Notes')}
              </label>
              <textarea
                rows="2"
                value={lotNotes}
                onChange={(e) => setLotNotes(e.target.value)}
                placeholder="Quality certifications, sorting notes..."
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            {/* Live Volume & Fair Rate Calculation Box */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t('fpo.participatingFarmers', 'Participating Farmers')}:</span>
                <span className="font-bold text-slate-900">{selectedItems.length} smallholders</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t('fpo.totalAggregatedConsignment', 'Total Consignment')}:</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {totalAggregatedKg.toLocaleString()} kg
                </span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span>{t('fpo.volumeWeightedRate', 'Fair Weighted Rate')}:</span>
                <span className="font-black text-emerald-700 text-base">
                  ₹{weightedRatePerKg}<span className="text-[11px] font-normal text-slate-500">/kg</span>
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t('fpo.totalLotValue', 'Total Lot Value')}:</span>
                <span className="font-extrabold text-slate-900">
                  ₹{Math.round(totalCost).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Farmer Itemized Breakdown Chips */}
            {selectedItems.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t('fpo.farmerVolumeBreakdown', 'Farmer Volume Shares:')}
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-[11px] bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                      <span className="font-bold text-slate-800 truncate max-w-[140px]">{item.farmerName}</span>
                      <span className="font-mono text-emerald-800 font-extrabold">{item.allocatedKg} kg @ ₹{item.offeredPricePerKg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assemble & Create Lot Button */}
            <button
              type="button"
              onClick={handleCreateLot}
              disabled={creatingLot || selectedItems.length === 0 || !isCompatibleCrop || totalAggregatedKg <= 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>
                {creatingLot
                  ? t('fpo.creatingLotProgress', 'Assembling Lot…')
                  : t('fpo.createConsolidatedLotBtn', {
                      qty: totalAggregatedKg.toLocaleString(),
                      defaultValue: `Create ${totalAggregatedKg.toLocaleString()} kg Consolidated Lot`
                    })}
              </span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default FpoStockAggregationTab;
