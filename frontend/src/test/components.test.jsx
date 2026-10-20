import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from '../components/Button';
import RoleBadge from '../components/RoleBadge';
import Badge from '../components/Badge';

describe('Shared UI Components', () => {
  it('renders Button with children and handles click', () => {
    render(<Button>Click Me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
  });

  it('renders RoleBadge with correct label for FARMER', () => {
    render(<RoleBadge role="FARMER" />);
    expect(screen.getByText(/Farmer/i)).toBeInTheDocument();
  });

  it('renders RoleBadge with correct label for FPO', () => {
    render(<RoleBadge role="FPO" />);
    expect(screen.getByText(/FPO/i)).toBeInTheDocument();
  });

  it('renders Badge component', () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
