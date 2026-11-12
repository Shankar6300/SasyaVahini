import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VerificationBadge from '../components/buyer/VerificationBadge';
import ProfileCompletionCard from '../components/buyer/ProfileCompletionCard';
import AddressCard from '../components/buyer/AddressCard';
import AddressModal from '../components/buyer/AddressModal';

describe('Phase 2: Buyer Profile & Address Components', () => {
  // ── VerificationBadge Tests ──────────────────────────────────────────────
  describe('VerificationBadge', () => {
    it('renders Verified Business badge when status is VERIFIED', () => {
      render(<VerificationBadge status="VERIFIED" />);
      expect(screen.getByText(/Verified Business/i)).toBeInTheDocument();
    });

    it('renders Pending Review badge when status is PENDING', () => {
      render(<VerificationBadge status="PENDING" showDescription />);
      expect(screen.getByText(/Verification Pending Review/i)).toBeInTheDocument();
      expect(screen.getByText(/currently being reviewed/i)).toBeInTheDocument();
    });

    it('renders Unverified Account when status is NOT_SUBMITTED', () => {
      render(<VerificationBadge status="NOT_SUBMITTED" />);
      expect(screen.getByText(/Unverified Account/i)).toBeInTheDocument();
    });
  });

  // ── ProfileCompletionCard Tests ──────────────────────────────────────────
  describe('ProfileCompletionCard', () => {
    it('renders completion percentage and checklist items', () => {
      const handleAction = vi.fn();
      render(
        <ProfileCompletionCard
          percentage={60}
          checklist={{
            basicInfo: true,
            addressAdded: true,
            contactVerified: false,
            businessInfo: false,
          }}
          isBusiness={true}
          onActionClick={handleAction}
        />
      );

      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText(/Profile Readiness/i)).toBeInTheDocument();
      expect(screen.getByText(/Basic Account Details/i)).toBeInTheDocument();
      expect(screen.getByText(/Business Details & GSTIN/i)).toBeInTheDocument();

      // Click an incomplete checklist item
      const contactItem = screen.getByText(/Verified Contact/i);
      fireEvent.click(contactItem);
      expect(handleAction).toHaveBeenCalledWith('contactVerified');
    });
  });

  // ── AddressCard Tests ────────────────────────────────────────────────────
  describe('AddressCard', () => {
    const mockAddress = {
      id: 'addr-001',
      recipientName: 'Kishore Kumar',
      contactNumber: '+919876543210',
      addressType: 'BUSINESS',
      addressLine1: 'Shop 10, APMC Market',
      addressLine2: 'Sector 19',
      locality: 'Vashi',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      postalCode: '400703',
      country: 'India',
      deliveryInstructions: 'Enter from Gate 2',
      isDefault: false,
    };

    it('renders address details, type badge, and triggers actions', () => {
      const handleEdit = vi.fn();
      const handleDelete = vi.fn();
      const handleSetDefault = vi.fn();

      render(
        <AddressCard
          address={mockAddress}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
        />
      );

      expect(screen.getByText('Kishore Kumar')).toBeInTheDocument();
      expect(screen.getByText('+919876543210')).toBeInTheDocument();
      expect(screen.getByText('BUSINESS')).toBeInTheDocument();
      expect(screen.getByText(/Navi Mumbai/i)).toBeInTheDocument();
      expect(screen.getByText(/Enter from Gate 2/i)).toBeInTheDocument();

      // Click "Set as Default"
      const defaultBtn = screen.getByRole('button', { name: /set as default/i });
      fireEvent.click(defaultBtn);
      expect(handleSetDefault).toHaveBeenCalledWith('addr-001');

      // Click Edit
      const editBtn = screen.getByLabelText(/edit address/i);
      fireEvent.click(editBtn);
      expect(handleEdit).toHaveBeenCalledWith(mockAddress);

      // Click Delete
      const deleteBtn = screen.getByLabelText(/delete address/i);
      fireEvent.click(deleteBtn);
      expect(handleDelete).toHaveBeenCalledWith(mockAddress);
    });

    it('renders Default Delivery badge when isDefault is true', () => {
      render(
        <AddressCard
          address={{ ...mockAddress, isDefault: true }}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onSetDefault={vi.fn()}
        />
      );

      expect(screen.getByText(/Default Delivery/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /set as default/i })).not.toBeInTheDocument();
    });
  });

  // ── AddressModal Tests ───────────────────────────────────────────────────
  describe('AddressModal', () => {
    it('validates required fields on submission', () => {
      const handleSubmit = vi.fn();
      const handleClose = vi.fn();

      render(
        <AddressModal
          isOpen={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
        />
      );

      expect(screen.getByText(/Add New Address/i)).toBeInTheDocument();

      // Submit empty form
      const saveBtn = screen.getByRole('button', { name: /save address/i });
      fireEvent.click(saveBtn);

      expect(handleSubmit).not.toHaveBeenCalled();
      expect(screen.getByText(/Recipient name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Enter a valid 10-digit mobile number/i)).toBeInTheDocument();
    });
  });
});
