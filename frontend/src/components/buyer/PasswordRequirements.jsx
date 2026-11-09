import React from 'react';
import { Check, X } from 'lucide-react';

const REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'number', label: 'One number', test: (pw) => /\d/.test(pw) },
  { id: 'special', label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export default function PasswordRequirements({ password = '' }) {
  if (!password) return null;

  return (
    <div className="buyer-pw-requirements">
      <p className="buyer-pw-requirements-title">Password requirements</p>
      <ul className="buyer-pw-req-list">
        {REQUIREMENTS.map((req) => {
          const met = req.test(password);
          return (
            <li key={req.id} className={`buyer-pw-req-item${met ? ' met' : ''}`}>
              <span className="req-icon">
                {met ? <Check size={14} /> : <X size={14} />}
              </span>
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
