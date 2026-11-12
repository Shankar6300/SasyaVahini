import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BuyerTypeSelector from '../components/buyer/BuyerTypeSelector';
import PasswordRequirements from '../components/buyer/PasswordRequirements';
import RoleBadge from '../components/RoleBadge';

describe('Buyer Auth Components', () => {
  it('renders BuyerTypeSelector with Consumer and Business options', () => {
    const handleChange = vi.fn();
    render(<BuyerTypeSelector value="INDIVIDUAL" onChange={handleChange} />);

    expect(screen.getByText(/Individual Consumer/i)).toBeInTheDocument();
    expect(screen.getByText(/Business Buyer/i)).toBeInTheDocument();

    const businessBtn = screen.getByRole('radio', { name: /business buyer/i });
    fireEvent.click(businessBtn);
    expect(handleChange).toHaveBeenCalledWith('business');
  });

  it('renders PasswordRequirements and flags meeting criteria', () => {
    const { rerender } = render(<PasswordRequirements password="short" />);
    expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/One uppercase letter/i)).toBeInTheDocument();

    rerender(<PasswordRequirements password="Password123" />);
    // Check that requirement items are rendered
    expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/One uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/One number/i)).toBeInTheDocument();
  });

  it('renders RoleBadge correctly for BUYER', () => {
    render(<RoleBadge role="BUYER" />);
    expect(screen.getByText(/Buyer/i)).toBeInTheDocument();
  });
});
