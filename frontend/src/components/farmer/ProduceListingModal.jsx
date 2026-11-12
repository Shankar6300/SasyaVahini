import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SasyaLogo from '../SasyaLogo';
import VoiceInput from '../VoiceInput';
import FarmLocationPicker from './FarmLocationPicker';
import { extractNumberFromSpeech, extractCropFromSpeech } from '../../services/voiceFormParser';
import {
  Package, X, Check, AlertCircle, Sparkles, 
  DollarSign, Sprout, Scale, Clock, Sliders, CheckCircle2,
  ShieldCheck, MapPin
} from 'lucide-react';
import {
  INITIAL_CROPS,
  kgToQuintals,
  calculateGrossValue,
  translateHarvestDate,
  validateProduceListing
} from '../../utils/listingHelpers';

const ProduceListingModal = ({
  isOpen,
  onClose,
  onListingSaved,
  initialData = null,
  defaultLocation = '',
  initialMode = 'QUICK'
}) => {
  const { t } = useTranslation();
  const isEditing = Boolean(initialData?.id);

  // Listing mode: 'QUICK' | 'DETAILED'
  const [listingMode, setListingMode] = useState(initialMode);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    if (initialMode) setListingMode(initialMode);
  }, [initialMode]);

  // Form State shared seamlessly across both modes
  const [formData, setFormData] = useState({
    cropName: initialData?.cropName || 'Tomato',
    customCropName: '',
    category: initialData?.category || 'Vegetables',
    quantityKg: initialData?.quantityKg?.toString() || '500',
    askingPricePerKg: initialData?.askingPricePerKg?.toString() || '25',
    minPricePerKg: initialData?.minPricePerKg?.toString() || '22.5',
    harvestOption: 'TODAY', // 'TODAY' | 'IN_3_DAYS' | 'NEXT_WEEK' | 'CUSTOM'
    harvestDate: initialData?.harvestDate || translateHarvestDate('TODAY'),
    qualityGrade: initialData?.qualityGrade || 'GRADE_A',
    isOrganic: initialData?.isOrganic || false,
    location: initialData?.location || defaultLocation || 'Pune Farm Hub',
    pickupAddress: initialData?.pickupAddress || defaultLocation || '',
    village: initialData?.village || '',
    district: initialData?.district || '',
    state: initialData?.state || 'Maharashtra',
    pincode: initialData?.pincode || '',
    latitude: initialData?.latitude || null,
    longitude: initialData?.longitude || null,
    locationAccuracy: initialData?.locationAccuracy || 'GPS_PIN',
    imageUrl: initialData?.imageUrl || ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Market price guidance state (genuine API-driven)
  const [marketBenchmark, setMarketBenchmark] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkSource, setBenchmarkSource] = useState('');

  // Synchronize initial data when editing or changing props
  useEffect(() => {
    if (initialData) {
      const knownCrop = INITIAL_CROPS.find(c => c.id === initialData.cropName);
      setFormData(prev => ({
        ...prev,
        cropName: knownCrop ? knownCrop.id : 'Other',
        customCropName: knownCrop ? '' : initialData.cropName || '',
        category: initialData.category || 'Vegetables',
        quantityKg: initialData.quantityKg?.toString() || '500',
        askingPricePerKg: initialData.askingPricePerKg?.toString() || '25',
        minPricePerKg: initialData.minPricePerKg?.toString() || (initialData.askingPricePerKg * 0.9).toFixed(1),
        harvestOption: 'CUSTOM',
        harvestDate: initialData.harvestDate || translateHarvestDate('TODAY'),
        qualityGrade: initialData.qualityGrade || 'GRADE_A',
        isOrganic: initialData.isOrganic || false,
        location: initialData.location || defaultLocation || 'Pune Farm Hub',
        pickupAddress: initialData.pickupAddress || initialData.location || defaultLocation || '',
        village: initialData.village || '',
        district: initialData.district || '',
        state: initialData.state || 'Maharashtra',
        pincode: initialData.pincode || '',
        latitude: initialData.latitude || null,
        longitude: initialData.longitude || null,
        imageUrl: initialData.imageUrl || ''
      }));
    }
  }, [initialData, defaultLocation]);

  // Fetch real market price guidance for selected crop
  useEffect(() => {
    let isMounted = true;
    const fetchGuidance = async () => {
      const effectiveCrop = formData.cropName === 'Other'
        ? (formData.customCropName || 'Tomato')
        : formData.cropName;

      if (!effectiveCrop.trim()) return;

      setBenchmarkLoading(true);
      try {
        const res = await api.post('/forecast/price', {
          crop: effectiveCrop,
          location: formData.location || 'Pune',
          quantity: parseFloat(formData.quantityKg) || 1000
        });

        if (isMounted && res.data) {
          const benchmarkData = res.data?.data || res.data;
          setMarketBenchmark(benchmarkData);
          setBenchmarkSource('SasyaVahini Fair Value Engine (Pune Mandi Benchmark)');
        }
      } catch (err) {
        if (isMounted) {
          setMarketBenchmark(null);
          setBenchmarkSource('Market price benchmark currently unavailable');
        }
      } finally {
        if (isMounted) setBenchmarkLoading(false);
      }
    };

    const timer = setTimeout(fetchGuidance, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.cropName, formData.customCropName, formData.location, formData.quantityKg]);

  // Handle Quick Crop Card Selection
  const handleSelectCrop = (crop) => {
    setFormData(prev => {
      const nextCategory = crop.category || prev.category;
      const nextCropName = crop.id;
      // Keep price if already set, or adopt crop default if default
      const nextPrice = (!prev.askingPricePerKg || prev.askingPricePerKg === '24')
        ? crop.defaultPrice.toString()
        : prev.askingPricePerKg;
      const nextMinPrice = (parseFloat(nextPrice) * 0.9).toFixed(1);

      return {
        ...prev,
        cropName: nextCropName,
        category: nextCategory,
        askingPricePerKg: nextPrice,
        minPricePerKg: nextMinPrice
      };
    });
  };

  // Handle Quantity Quick Increment
  const handleIncrementQty = (incrementKg) => {
    const current = parseFloat(formData.quantityKg) || 0;
    const nextVal = Math.min(100000, Math.max(10, current + incrementKg));
    setFormData(prev => ({ ...prev, quantityKg: nextVal.toString() }));
  };

  // Handle Harvest Option Quick Selection
  const handleHarvestOptionChange = (option) => {
    const newDate = translateHarvestDate(option, formData.harvestDate);
    setFormData(prev => ({
      ...prev,
      harvestOption: option,
      harvestDate: newDate
    }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    const effectiveCrop = formData.cropName === 'Other'
      ? formData.customCropName.trim()
      : formData.cropName;

    const validation = validateProduceListing({
      ...formData,
      cropName: effectiveCrop
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors({});
    setLoading(true);

    try {
      const payload = {
        cropName: effectiveCrop,
        category: formData.category,
        quantityKg: parseFloat(formData.quantityKg),
        askingPricePerKg: parseFloat(formData.askingPricePerKg),
        minPricePerKg: parseFloat(formData.minPricePerKg || (formData.askingPricePerKg * 0.9)),
        harvestDate: formData.harvestDate,
        qualityGrade: formData.qualityGrade,
        isOrganic: formData.isOrganic,
        location: formData.location || defaultLocation || 'Pune Region',
        pickupAddress: formData.pickupAddress || formData.location || defaultLocation || 'Farm Hub',
        village: formData.village || '',
        district: formData.district || '',
        state: formData.state || 'Maharashtra',
        pincode: formData.pincode || '',
        latitude: formData.latitude !== null && formData.latitude !== undefined ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude !== null && formData.longitude !== undefined ? parseFloat(formData.longitude) : null,
        locationAccuracy: formData.locationAccuracy || 'GPS_PIN',
        imageUrl: formData.imageUrl || undefined
      };

      if (isEditing) {
        await api.put(`/farmers/produce/${initialData.id}`, payload);
        setSuccessMessage('Listing updated successfully!');
      } else {
        await api.post('/farmers/produce', payload);
        setSuccessMessage('Produce lot published directly to marketplace!');
      }

      if (onListingSaved) {
        onListingSaved();
      }

      setTimeout(() => {
        onClose();
      }, 700);

    } catch (err) {
      setServerError(err.response?.data?.error?.message || err.response?.data?.error || 'Failed to save produce listing. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const grossValue = calculateGrossValue(formData.quantityKg, formData.askingPricePerKg);
  const quintals = kgToQuintals(formData.quantityKg);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="produce-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-md animate-fade-in overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-3xl w-full my-auto p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-6 max-h-[92vh] overflow-y-auto">

        {/* 1. TOP BRAND HEADER & CLOSE */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <SasyaLogo size={42} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-[#07875B] uppercase">SasyaVahini</span>
                <span className="text-[10px] text-slate-400 font-semibold">• {t('farmer.portalTitle', 'Farmer Portal')}</span>
              </div>
              <h2 id="produce-modal-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isEditing ? t('farmer.updateProduceTitle', 'Update Produce Lot') : t('farmer.listProduceTitle', 'List Your Produce')}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {t('common.tagline', 'Farm to Market. Fair for Everyone.')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="self-end sm:self-auto text-slate-400 hover:text-slate-600 p-2 rounded-2xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. DUAL-MODE SWITCHER WITH ACCESSIBLE CONTROLS */}
        <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
            <span>{t('farmer.selectListingExperience', 'Select Listing Experience:')}</span>
            <span className="text-[11px] text-[#07875B] font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> {t('farmer.inputsPreserve', 'Inputs preserve when switching')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Listing Modes">
            <button
              type="button"
              role="tab"
              id="tab-quick-listing"
              aria-selected={listingMode === 'QUICK'}
              aria-controls="panel-quick-listing"
              onClick={() => setListingMode('QUICK')}
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                listingMode === 'QUICK'
                  ? 'bg-[#07875B] text-white shadow-md shadow-emerald-900/20 scale-[1.01]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>⚡ {t('farmer.quickListing', 'Quick Listing')}</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-detailed-listing"
              aria-selected={listingMode === 'DETAILED'}
              aria-controls="panel-detailed-listing"
              onClick={() => setListingMode('DETAILED')}
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                listingMode === 'DETAILED'
                  ? 'bg-[#07875B] text-white shadow-md shadow-emerald-900/20 scale-[1.01]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>📋 {t('farmer.detailedListing', 'Detailed Listing')}</span>
            </button>
          </div>

          <div className="px-1 text-[11px] text-slate-500 font-medium">
            {listingMode === 'QUICK' ? (
              <p>
                <strong>{t('farmer.quickListing', 'Quick Listing')}:</strong> {t('farmer.quickListingDesc', 'Fast visual cards, quantity slider, secondary quintal conversion, and transparent mandi price guidance.')}
              </p>
            ) : (
              <p>
                <strong>{t('farmer.detailedListing', 'Detailed Listing')}:</strong> {t('farmer.detailedListingDesc', 'Full specification form including quality grading, organic certification, minimum acceptable price, and pickup gate.')}
              </p>
            )}
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {serverError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{serverError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#07875B]" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {/* 3. MODE 1: QUICK LISTING WORKFLOW */}
        {listingMode === 'QUICK' && (
          <form id="panel-quick-listing" role="tabpanel" aria-labelledby="tab-quick-listing" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Step 1: Crop Selection Cards */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sprout className="w-4 h-4 text-[#07875B]" /> {t('farmer.step1SelectCrop', '1. Select Crop Produce')}
                  </label>
                  <VoiceInput
                    onResult={(text) => {
                      const c = extractCropFromSpeech(text);
                      if (c) {
                        handleSelectCrop(c);
                      } else {
                        setFormData(f => ({ ...f, cropName: 'Other', customCropName: text }));
                      }
                    }}
                    title={t('voice.speakCropName', 'Speak crop name to select')}
                  />
                </div>
                <span className="text-[11px] text-slate-400">{t('farmer.clickOrEnterCrop', 'Click a card, enter custom crop, or speak')}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {INITIAL_CROPS.map((crop) => {
                  const isSelected = formData.cropName === crop.id;
                  return (
                    <button
                      key={crop.id}
                      type="button"
                      onClick={() => handleSelectCrop(crop)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-[#07875B] bg-[#E8F5E9]/60 shadow-sm ring-2 ring-[#07875B]/20 scale-[1.02]'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-2xl" role="img" aria-label={crop.name}>{crop.icon}</span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-[#07875B] text-white flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="font-extrabold text-xs text-slate-900">{t('crops.' + crop.id, crop.name)}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{crop.vernacular}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {formData.cropName === 'Other' && (
                <div className="mt-3 p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      {t('farmer.enterCustomCropName', 'Enter Custom Crop Name *')}
                    </label>
                    <VoiceInput
                      onResult={(t) => setFormData({ ...formData, customCropName: t })}
                      title={t('voice.speakCropName', 'Speak crop name')}
                    />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.customCropName}
                    onChange={(e) => setFormData({ ...formData, customCropName: e.target.value })}
                    placeholder={t('farmer.cropPlaceholder', 'e.g. Garlic, Capsicum, Ginger, Turmeric')}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:border-[#07875B] outline-none"
                  />
                  {validationErrors.cropName && (
                    <p className="text-rose-600 text-[11px] font-semibold">{validationErrors.cropName}</p>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Quantity Selector (Slider + Numeric Input + Quintals) */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-[#07875B]" /> {t('farmer.step2Quantity', '2. Quantity To List')}
                </label>
                <div className="text-right">
                  <span className="text-sm font-black text-[#07875B]">
                    {parseFloat(formData.quantityKg || 0).toLocaleString()} kg
                  </span>
                  <span className="text-xs text-slate-500 font-bold ml-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                    ≈ {quintals} {t('farmer.quintals', 'Quintals')}
                  </span>
                </div>
              </div>

              {/* Slider */}
              <div>
                <input
                  type="range"
                  min="50"
                  max="10000"
                  step="50"
                  value={Math.min(10000, parseFloat(formData.quantityKg) || 50)}
                  onChange={(e) => setFormData({ ...formData, quantityKg: e.target.value })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#07875B]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                  <span>50 kg</span>
                  <span>2,500 kg (25 Q)</span>
                  <span>5,000 kg (50 Q)</span>
                  <span>10,000 kg (100 Q)</span>
                </div>
              </div>

              {/* Numeric Input & Quick Add Chips */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">{t('farmer.exactKg', 'Exact kg:')}</span>
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    step="10"
                    required
                    value={formData.quantityKg}
                    onChange={(e) => setFormData({ ...formData, quantityKg: e.target.value })}
                    className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-[#07875B]"
                  />
                  <VoiceInput
                    onResult={(t) => {
                      const num = extractNumberFromSpeech(t);
                      if (num) setFormData(f => ({ ...f, quantityKg: num }));
                    }}
                    title={t('voice.speakQuantity', 'Speak quantity in kg')}
                  />
                  <span className="text-[11px] text-slate-500 font-medium">({t('farmer.quintalFormula', '1 Quintal = 100 kg')})</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-bold">{t('farmer.quickAdd', 'Quick +:')}</span>
                  {[50, 100, 500, 1000].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleIncrementQty(inc)}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-[#07875B] border border-slate-200 rounded-lg text-[10px] font-extrabold text-slate-700 transition-colors"
                    >
                      +{inc} kg
                    </button>
                  ))}
                </div>
              </div>

              {validationErrors.quantityKg && (
                <p className="text-rose-600 text-[11px] font-semibold">{validationErrors.quantityKg}</p>
              )}
            </div>

            {/* Step 3: Price Selector & Genuine Market Guidance */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#07875B]" /> {t('farmer.step3AskingRate', '3. Asking Rate Per Kilogram')}
                </label>
                <div className="text-right">
                  <span className="text-base font-black text-[#07875B]">₹{formData.askingPricePerKg}</span>
                  <span className="text-xs text-slate-500 font-semibold"> {t('common.perKg', '/kg')}</span>
                </div>
              </div>

              {/* Slider for Price */}
              <div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="0.5"
                  value={Math.min(150, parseFloat(formData.askingPricePerKg) || 10)}
                  onChange={(e) => {
                    const price = e.target.value;
                    const minPrice = (parseFloat(price) * 0.9).toFixed(1);
                    setFormData({ ...formData, askingPricePerKg: price, minPricePerKg: minPrice });
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#07875B]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                  <span>₹5/kg</span>
                  <span>₹50/kg</span>
                  <span>₹100/kg</span>
                  <span>₹150/kg</span>
                </div>
              </div>

              {/* Exact Rate Input */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">{t('farmer.customRate', 'Enter custom rate:')}</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={formData.askingPricePerKg}
                    onChange={(e) => {
                      const price = e.target.value;
                      const minPrice = (parseFloat(price) * 0.9).toFixed(1);
                      setFormData({ ...formData, askingPricePerKg: price, minPricePerKg: minPrice });
                    }}
                    className="w-28 pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-[#07875B]"
                  />
                </div>
                <VoiceInput
                  onResult={(t) => {
                    const num = extractNumberFromSpeech(t);
                    if (num) {
                      const p = parseFloat(num);
                      if (!isNaN(p)) {
                        setFormData(f => ({ ...f, askingPricePerKg: String(p), minPricePerKg: (p * 0.9).toFixed(1) }));
                      }
                    }
                  }}
                  title={t('voice.speakPrice', 'Speak price per kg')}
                />
                <span className="text-xs text-slate-500 font-medium">{t('common.perKg', '/kg')}</span>
              </div>

              {validationErrors.askingPricePerKg && (
                <p className="text-rose-600 text-[11px] font-semibold">{validationErrors.askingPricePerKg}</p>
              )}

              {/* Genuine Market Price Guidance Box */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-[#07875B]" />
                    {t('farmer.fairMarketGuidance', 'Fair Market Guidance:')}
                  </span>
                  <span className="text-[10px] text-slate-400">{benchmarkSource}</span>
                </div>

                {benchmarkLoading ? (
                  <p className="text-slate-400 text-[11px]">{t('farmer.fetchingBenchmark', 'Fetching regional fair benchmark...')}</p>
                ) : marketBenchmark ? (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#E8F5E9]/40 p-2.5 rounded-xl border border-emerald-200/60">
                    <div>
                      <span className="text-slate-600 text-[11px] block">
                        {t('farmer.estimatedMandiRange', 'Estimated Mandi Range:')} <strong>{marketBenchmark.market_range}</strong>
                      </span>
                      <span className="text-[10px] text-[#07875B] font-bold">
                        {t('farmer.recommendedBenchmark', 'Recommended Direct Benchmark:')} ₹{marketBenchmark.recommended_price}/kg
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const rec = marketBenchmark.recommended_price.toString();
                        const min = (marketBenchmark.recommended_price * 0.9).toFixed(1);
                        setFormData(prev => ({
                          ...prev,
                          askingPricePerKg: rec,
                          minPricePerKg: min
                        }));
                      }}
                      className="px-3 py-1.5 bg-[#07875B] text-white font-extrabold text-[11px] rounded-lg shadow-sm hover:bg-[#056b48] transition-all whitespace-nowrap"
                    >
                      {t('farmer.useBenchmark', 'Use Benchmark')} (₹{marketBenchmark.recommended_price})
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px]">
                    {t('farmer.benchmarkUnavailable', 'Market benchmark unavailable for this item. You have complete freedom to specify your asking price.')}
                  </p>
                )}
              </div>
            </div>

            {/* Step 4: Harvest Availability Chips */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#07875B]" /> {t('farmer.step4Harvest', '4. Harvest Availability')}
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'TODAY', label: '🌱 ' + t('farmer.readyToday', 'Ready Today'), sub: t('farmer.readyTodaySub', 'Immediate dispatch') },
                  { key: 'IN_3_DAYS', label: '⏳ ' + t('farmer.in3Days', 'In 3 Days'), sub: t('farmer.in3DaysSub', 'Harvest in progress') },
                  { key: 'NEXT_WEEK', label: '📅 ' + t('farmer.nextWeek', 'Next Week'), sub: t('farmer.nextWeekSub', 'Scheduled harvest') },
                  { key: 'CUSTOM', label: '🗓️ ' + t('farmer.chooseDate', 'Choose Date'), sub: t('farmer.chooseDateSub', 'Specific date') }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleHarvestOptionChange(item.key)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      formData.harvestOption === item.key
                        ? 'border-[#07875B] bg-[#E8F5E9]/60 ring-2 ring-[#07875B]/20 text-[#07875B]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-500">{item.sub}</div>
                  </button>
                ))}
              </div>

              {formData.harvestOption === 'CUSTOM' && (
                <div className="pt-2">
                  <input
                    type="date"
                    required
                    value={formData.harvestDate}
                    onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#07875B]"
                  />
                </div>
              )}
            </div>

            {/* Step 4b: Farm Pickup Location & Map Pin */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#07875B]" /> {t('location.farmPickupPin', 'Farm Pickup Location & Map Pin')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="text-xs font-bold text-[#07875B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {showLocationPicker ? t('common.close', 'Hide Map') : t('location.openMapBtn', 'Pin on Interactive Map 🗺️')}
                </button>
              </div>

              {formData.pickupAddress ? (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase">{t('location.pinnedPickupLocation', 'Pinned Pickup Location')}</span>
                    <p className="text-slate-800 font-semibold truncate text-xs mt-0.5">{formData.pickupAddress}</p>
                    {formData.latitude && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        GPS: {formData.latitude.toFixed(4)}° N, {formData.longitude.toFixed(4)}° E
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="ml-2 px-2.5 py-1 text-[11px] font-bold bg-white text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-50 cursor-pointer"
                  >
                    {t('common.edit', 'Change Pin')}
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <span className="text-slate-500">{t('location.noPinYet', 'No farm coordinates pinned yet. Tap button to set exact farm gate.')}</span>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="px-3 py-1 text-xs font-bold bg-[#07875B] text-white rounded-lg hover:bg-[#056b48] cursor-pointer"
                  >
                    {t('location.setPinBtn', 'Set Farm Pin')}
                  </button>
                </div>
              )}

              {showLocationPicker && (
                <FarmLocationPicker
                  initialLat={formData.latitude}
                  initialLng={formData.longitude}
                  initialAddress={formData.pickupAddress || formData.location}
                  initialVillage={formData.village}
                  initialDistrict={formData.district}
                  initialState={formData.state}
                  initialPincode={formData.pincode}
                  onLocationSelect={(loc) => {
                    setFormData(prev => ({
                      ...prev,
                      ...loc,
                      location: loc.pickupAddress
                    }));
                    setShowLocationPicker(false);
                  }}
                />
              )}
            </div>

            {/* Step 5: Transparent Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-5 rounded-3xl shadow-xl border border-emerald-800/40 space-y-4">
              <div className="flex justify-between items-center border-b border-emerald-800/50 pb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {t('farmer.listingSummaryTitle', 'Transparent Listing Summary')}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {t('farmer.directMarketplaceBadge', 'Direct Marketplace')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">{t('farmer.cropNameLabel', 'Crop')}</span>
                  <span className="font-black text-white text-sm">
                    {formData.cropName === 'Other' ? (formData.customCropName || t('crops.Other', 'Other')) : t('crops.' + formData.cropName, formData.cropName)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">{t('farmer.quantityLabel', 'Quantity')}</span>
                  <span className="font-black text-white text-sm">
                    {parseFloat(formData.quantityKg || 0).toLocaleString()} kg ({quintals} Q)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">{t('farmer.askingPriceLabel', 'Asking Rate')}</span>
                  <span className="font-black text-emerald-300 text-sm">
                    ₹{formData.askingPricePerKg} / kg
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">{t('farmer.harvestDate', 'Harvest Date')}</span>
                  <span className="font-semibold text-white text-xs">
                    {formData.harvestDate}
                  </span>
                </div>
              </div>

              <div className="bg-white/10 p-3.5 rounded-2xl border border-white/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-extrabold block">
                    {t('farmer.grossValuationTitle', 'Indicative Gross Lot Valuation')}
                  </span>
                  <span className="text-2xl font-black text-white">
                    ₹{grossValue.toLocaleString()}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 max-w-sm">
                  ⚠️ <strong>{t('farmer.indicativeEstimate', 'Indicative estimate only.')}</strong> {t('farmer.indicativeEstimateDesc', 'This is not confirmed earnings or guaranteed sale. Lot is listed as AVAILABLE until explicit allocation consent.')}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#07875B] hover:bg-[#056b48] text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>{t('farmer.publishingProduce', 'Publishing Produce Lot...')}</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isEditing ? t('farmer.saveChanges', 'Save Changes') : t('farmer.listMyProduce', 'List My Produce')}</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

        {/* 4. MODE 2: DETAILED LISTING FORM (PRESERVED FULL CAPABILITY) */}
        {listingMode === 'DETAILED' && (
          <form id="panel-detailed-listing" role="tabpanel" aria-labelledby="tab-detailed-listing" onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">{t('farmer.cropNameLabel', 'Crop Produce Name *')}</label>
                  <VoiceInput
                    onResult={(text) => {
                      const matched = extractCropFromSpeech(text);
                      if (matched) {
                        setFormData(prev => ({
                          ...prev,
                          cropName: matched.standard,
                          category: matched.category || prev.category
                        }));
                      } else {
                        setFormData(prev => ({ ...prev, cropName: 'Other', customCropName: text }));
                      }
                    }}
                    title={t('voice.speakCropName', 'Speak crop name')}
                  />
                </div>
                <select
                  value={formData.cropName}
                  onChange={(e) => setFormData({ ...formData, cropName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:border-[#07875B] outline-none transition-all"
                >
                  <option value="Tomato">{t('crops.Tomato', 'Tomato')}</option>
                  <option value="Onion">{t('crops.Onion', 'Onion')}</option>
                  <option value="Potato">{t('crops.Potato', 'Potato')}</option>
                  <option value="Paddy">{t('crops.Paddy', 'Paddy / Rice')}</option>
                  <option value="Wheat">{t('crops.Wheat', 'Wheat')}</option>
                  <option value="Maize">{t('crops.Maize', 'Maize')}</option>
                  <option value="Leafy vegetables">{t('crops.Leafy vegetables', 'Leafy Vegetables')}</option>
                  <option value="Grapes">{t('crops.Grapes', 'Grapes')}</option>
                  <option value="Pomegranate">{t('crops.Pomegranate', 'Pomegranate')}</option>
                  <option value="Soybean">{t('crops.Soybean', 'Soybean')}</option>
                  <option value="Cotton">{t('crops.Cotton', 'Cotton')}</option>
                  <option value="Other">{t('crops.Other', 'Other Produce')}</option>
                </select>
                {formData.cropName === 'Other' && (
                  <input
                    type="text"
                    required
                    placeholder={t('farmer.cropPlaceholder', 'Enter custom crop name')}
                    value={formData.customCropName}
                    onChange={(e) => setFormData({ ...formData, customCropName: e.target.value })}
                    className="mt-2 w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                )}
                {validationErrors.cropName && (
                  <p className="text-rose-600 text-[11px] mt-1">{validationErrors.cropName}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">{t('farmer.cropCategory', 'Produce Category *')}</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:border-[#07875B] outline-none transition-all"
                >
                  <option value="Vegetables">{t('categories.vegetables', 'Vegetables')}</option>
                  <option value="Fruits">{t('categories.fruits', 'Fruits')}</option>
                  <option value="Grains">{t('categories.grains', 'Grains & Cereals')}</option>
                  <option value="Pulses">{t('categories.pulses', 'Pulses & Legumes')}</option>
                  <option value="Cash Crops">{t('categories.cashCrops', 'Cash Crops')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">{t('farmer.quantityLabel', 'Quantity (kg) *')}</label>
                  <VoiceInput
                    onResult={(t) => {
                      const num = extractNumberFromSpeech(t);
                      if (num) setFormData(f => ({ ...f, quantityKg: num }));
                    }}
                    title="Speak quantity in kg"
                  />
                </div>
                <input
                  type="number"
                  step="1"
                  min="10"
                  max="100000"
                  required
                  value={formData.quantityKg}
                  onChange={(e) => setFormData({ ...formData, quantityKg: e.target.value })}
                  placeholder="e.g. 1500"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border ${validationErrors.quantityKg ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all`}
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">≈ {quintals} Quintals</span>
                {validationErrors.quantityKg && (
                  <p className="text-rose-600 text-[11px] mt-1">{validationErrors.quantityKg}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">{t('farmer.askingPriceLabel', 'Asking Price (₹/kg) *')}</label>
                  <VoiceInput
                    onResult={(t) => {
                      const num = extractNumberFromSpeech(t);
                      if (num) {
                        const p = parseFloat(num);
                        if (!isNaN(p)) {
                          setFormData(f => ({ ...f, askingPricePerKg: String(p), minPricePerKg: (p * 0.9).toFixed(1) }));
                        }
                      }
                    }}
                    title="Speak price per kg"
                  />
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={formData.askingPricePerKg}
                  onChange={(e) => setFormData({ ...formData, askingPricePerKg: e.target.value })}
                  placeholder="e.g. 24"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border ${validationErrors.askingPricePerKg ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all`}
                />
                {validationErrors.askingPricePerKg && (
                  <p className="text-rose-600 text-[11px] mt-1">{validationErrors.askingPricePerKg}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">{t('farmer.minPriceThreshold', 'Min Price Threshold (₹/kg) *')}</label>
                  <VoiceInput
                    type="number"
                    onResult={(num) => {
                      if (num) {
                        const p = parseFloat(num);
                        if (!isNaN(p)) setFormData(f => ({ ...f, minPricePerKg: String(p) }));
                      }
                    }}
                    title="Speak minimum price per kg"
                  />
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={formData.minPricePerKg}
                  onChange={(e) => setFormData({ ...formData, minPricePerKg: e.target.value })}
                  placeholder="e.g. 21"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border ${validationErrors.minPricePerKg ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'} rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all`}
                />
                {validationErrors.minPricePerKg && (
                  <p className="text-rose-600 text-[11px] mt-1">{validationErrors.minPricePerKg}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">{t('farmer.qualityGradeLabel', 'Quality Grade')}</label>
                <select
                  value={formData.qualityGrade}
                  onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:border-[#07875B] outline-none transition-all"
                >
                  <option value="GRADE_A">{t('grade.GRADE_A', 'Grade A (Premium Export/Retail)')}</option>
                  <option value="GRADE_B">{t('grade.GRADE_B', 'Grade B (Standard Market Quality)')}</option>
                  <option value="GRADE_C">{t('grade.GRADE_C', 'Grade C (Processing / Bulk Commercial)')}</option>
                  <option value="ORGANIC_PREMIUM">{t('grade.ORGANIC_PREMIUM', 'Certified Organic Premium')}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">{t('farmer.harvestDateLabel', 'Harvest / Availability Date *')}</label>
                <input
                  type="date"
                  required
                  value={formData.harvestDate}
                  onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:border-[#07875B] outline-none transition-all"
                />
                {validationErrors.harvestDate && (
                  <p className="text-rose-600 text-[11px] mt-1">{validationErrors.harvestDate}</p>
                )}
              </div>
            </div>

            {/* Farm Pickup Location & Map Pin Picker */}
            <div>
              <FarmLocationPicker
                initialLat={formData.latitude}
                initialLng={formData.longitude}
                initialAddress={formData.pickupAddress || formData.location}
                initialVillage={formData.village}
                initialDistrict={formData.district}
                initialState={formData.state}
                initialPincode={formData.pincode}
                onLocationSelect={(loc) => {
                  setFormData(prev => ({
                    ...prev,
                    ...loc,
                    location: loc.pickupAddress
                  }));
                }}
              />
            </div>

            {/* Organic Checkbox */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl flex items-center gap-3">
              <input
                type="checkbox"
                id="isOrganicDetailed"
                checked={formData.isOrganic}
                onChange={(e) => setFormData({ ...formData, isOrganic: e.target.checked })}
                className="accent-[#07875B] rounded w-4 h-4 cursor-pointer"
              />
              <label htmlFor="isOrganicDetailed" className="cursor-pointer select-none">
                <span className="font-bold text-slate-900 block">{t('farmer.certifiedOrganic', 'Certified Organic Harvest 🌿')}</span>
                <span className="text-[11px] text-slate-500">{t('farmer.certifiedOrganicDesc', 'Produce grown using verified chemical-free organic farming practices')}</span>
              </label>
            </div>

            {/* Indicative gross value summary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">{t('farmer.grossValuationTitle', 'Indicative Gross Valuation')}:</span>
              <span className="font-black text-[#07875B] text-sm">₹{grossValue.toLocaleString()}</span>
            </div>

            {/* Actions */}
            <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#07875B] hover:bg-[#056b48] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>{t('farmer.savingProduce', 'Saving Produce...')}</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isEditing ? t('farmer.saveChanges', 'Save Changes') : t('farmer.confirmAndPublish', 'Confirm & Publish Listing')}</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export default ProduceListingModal;
