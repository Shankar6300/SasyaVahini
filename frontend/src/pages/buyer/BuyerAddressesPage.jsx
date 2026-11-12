import React, { useState, useEffect } from 'react';
import {
  MapPin, Plus, Loader2, CheckCircle, AlertCircle,
  Building2, Home, Trash2, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import buyerApi from '@/services/buyerApi';
import AddressCard from '@/components/buyer/AddressCard';
import AddressModal from '@/components/buyer/AddressModal';
import '@/styles/buyer-auth.css';

export default function BuyerAddressesPage() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion confirm dialog
  const [deletingAddress, setDeletingAddress] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await buyerApi.getAddresses();
      setAddresses(data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load addresses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr) => {
    setEditingAddress(addr);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingAddress) {
        await buyerApi.updateAddress(editingAddress.id, formData);
        setNotification('Address updated successfully!');
      } else {
        await buyerApi.createAddress(formData);
        setNotification('New address added to your address book!');
      }
      setIsModalOpen(false);
      await loadAddresses();
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      setSettingDefaultId(addressId);
      await buyerApi.setDefaultAddress(addressId);
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === addressId,
        }))
      );
      setNotification('Default delivery address updated!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to set default address.');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAddress) return;
    try {
      await buyerApi.deleteAddress(deletingAddress.id);
      setAddresses((prev) => prev.filter((a) => a.id !== deletingAddress.id));
      setNotification('Address deleted successfully.');
      setDeletingAddress(null);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete address.');
    }
  };

  return (
    <div className="buyer-page-container">
      {/* Top Notification Banner */}
      {notification && (
        <div className="buyer-alert buyer-alert-success buyer-animate-in mb-4">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {error && (
        <div className="buyer-alert buyer-alert-error buyer-animate-in mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <button
            type="button"
            className="text-xs font-semibold text-[#245C43] hover:text-[#173F30] flex items-center gap-1 mb-1.5"
            onClick={() => navigate('/buyer/profile')}
          >
            <ArrowLeft size={14} />
            <span>Back to Profile</span>
          </button>
          <h1 className="buyer-page-title">Delivery & Billing Addresses</h1>
          <p className="buyer-page-subtitle">
            Manage your destination points for Shanmukhananda's 2-tier logistics & CVRP fleet dispatch
          </p>
        </div>

        <button
          type="button"
          className="buyer-btn buyer-btn-primary"
          onClick={handleOpenAddModal}
        >
          <Plus size={16} />
          <span>Add New Address</span>
        </button>
      </div>

      {/* Address Listing or Loading / Empty state */}
      {loading ? (
        <div className="buyer-profile-loading">
          <Loader2 size={32} className="animate-spin text-[#245C43]" />
          <p className="text-sm font-semibold text-[#68736B] mt-2">Loading addresses...</p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="buyer-card text-center py-12 px-4">
          <div className="w-16 h-16 rounded-full bg-[#E8F0E8] text-[#245C43] flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} />
          </div>
          <h3 className="text-base font-bold text-[#202820] mb-1">No addresses saved yet</h3>
          <p className="text-xs text-[#68736B] max-w-sm mx-auto mb-6">
            Add your primary warehouse, store, or home address so farmers and FPO clusters can fulfill your delivery quotes.
          </p>
          <button
            type="button"
            className="buyer-btn buyer-btn-primary inline-flex"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>Add Your First Address</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onEdit={handleOpenEditModal}
              onDelete={(a) => setDeletingAddress(a)}
              onSetDefault={handleSetDefault}
              isSettingDefault={settingDefaultId === addr.id}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingAddress}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      {deletingAddress && (
        <div className="buyer-modal-overlay" role="dialog" aria-modal="true">
          <div className="buyer-modal-card max-w-sm">
            <div className="flex items-start gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-[#FEF3F2] text-[#B42318] flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#202820]">Delete this address?</h3>
                <p className="text-xs text-[#68736B] mt-1 leading-relaxed">
                  Are you sure you want to remove <strong>{deletingAddress.recipientName}</strong> (
                  {deletingAddress.city}) from your address book?
                </p>
              </div>
            </div>
            <div className="buyer-modal-actions bg-[#F8F9FA] px-4 py-3 rounded-b-2xl">
              <button
                type="button"
                className="buyer-btn buyer-btn-outline"
                onClick={() => setDeletingAddress(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="buyer-btn"
                style={{ background: '#B42318', color: 'white' }}
                onClick={handleConfirmDelete}
              >
                Delete Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
