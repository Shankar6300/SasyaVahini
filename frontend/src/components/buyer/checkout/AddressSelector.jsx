/**
 * SasyaVahini — Checkout Address Selector (Phase 5)
 *
 * Integrates directly with Phase 2 BuyerAddress records.
 * Allows buyers to choose a saved destination address or add a new address.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Check, Phone, Building2, Home, AlertCircle, Loader2 } from 'lucide-react';
import buyerApi from '@/services/buyerApi';
import AddressModal from '@/components/buyer/AddressModal';
import { useToast } from '@/components/Toast';

export default function AddressSelector({ selectedAddressId, onSelectAddress }) {
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast() || {};

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const data = await buyerApi.getAddresses();
      const list = data || [];
      setAddresses(list);

      // Auto-select default or first address if none currently selected
      if (!selectedAddressId && list.length > 0) {
        const def = list.find((a) => a.isDefault) || list[0];
        onSelectAddress(def.id);
      }
    } catch (err) {
      if (addToast) addToast('Failed to load saved delivery addresses.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleCreateAddress = async (payload) => {
    try {
      setIsSaving(true);
      const created = await buyerApi.createAddress(payload);
      if (addToast) addToast('New delivery address saved.', 'success');
      setIsModalOpen(false);
      await loadAddresses();
      if (created?.id) onSelectAddress(created.id);
    } catch (err) {
      if (addToast) addToast('Failed to save address.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white border border-[#DDE5DC] rounded-xl">
        <Loader2 size={24} className="animate-spin mx-auto text-[#245C43] mb-2" />
        <p className="text-xs text-[#68736B]">Loading saved delivery addresses...</p>
      </div>
    );
  }

  return (
    <div className="address-selector-section mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base text-[#202820] flex items-center gap-2">
          <MapPin size={18} className="text-[#245C43]" />
          <span>Delivery Destination Address</span>
        </h3>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-bold text-[#245C43] hover:underline flex items-center gap-1"
        >
          <Plus size={14} /> Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="p-6 bg-white border-2 border-dashed border-[#DDE5DC] rounded-xl text-center">
          <p className="text-xs text-[#68736B] mb-3">No saved addresses found. Please add a delivery address to calculate shipping.</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="buyer-btn buyer-btn-primary"
          >
            <Plus size={14} /> Add Delivery Address
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {addresses.map((addr) => {
            const isSelected = addr.id === selectedAddressId;
            return (
              <div
                key={addr.id}
                onClick={() => onSelectAddress(addr.id)}
                className={`checkout-address-card ${isSelected ? 'selected' : ''}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectAddress(addr.id);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="checkout-address-type-badge flex items-center gap-1">
                      {addr.addressType === 'BUSINESS' ? <Building2 size={11} /> : <Home size={11} />}
                      {addr.addressType}
                    </span>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#245C43] text-white flex items-center justify-center">
                      <Check size={12} />
                    </div>
                  )}
                </div>

                <p className="font-bold text-sm text-[#202820] mb-0.5">{addr.recipientName}</p>
                <p className="text-xs text-[#68736B] flex items-center gap-1 mb-1.5">
                  <Phone size={11} /> {addr.contactNumber}
                </p>
                <p className="text-xs text-[#202820] leading-relaxed">
                  {addr.addressLine1}
                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                  {addr.locality ? `, ${addr.locality}` : ''}
                </p>
                <p className="text-xs text-[#68736B]">
                  {addr.city}, {addr.state} — {addr.postalCode}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <AddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateAddress}
        isSubmitting={isSaving}
      />
    </div>
  );
}
