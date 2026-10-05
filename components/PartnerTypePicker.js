'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PARTNER_TYPES } from '@/lib/categories';

const DESCRIPTIONS = {
  seller: 'You sell devices on Revibe.',
  repair: 'You repair or refurbish devices for Revibe.',
};

/**
 * Shown once to non-Revibe users until they pick Seller or Repair partner.
 * The choice is locked afterwards (a trainer can change it).
 */
export default function PartnerTypePicker() {
  const { user, isPartner, partnerType, choosePartnerType } = useAuth();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user || !isPartner || partnerType) return null;

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      await choosePartnerType(selected);
    } catch (err) {
      console.error('Failed to save partner type:', err);
      setError('Could not save your choice. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop active partner-picker">
      <div className="modal">
        <h2 className="partner-picker-title">Welcome to Revibe Training 👋</h2>
        <p className="partner-picker-subtitle">Which of these describes you? We use it to show you the right training.</p>

        <div className="partner-picker-options">
          {PARTNER_TYPES.map(p => (
            <button
              key={p.id}
              type="button"
              className={`partner-picker-option ${selected === p.id ? 'active' : ''}`}
              onClick={() => setSelected(p.id)}
            >
              <i className="material-icons">{p.icon}</i>
              <span className="partner-picker-option-label">{p.short}</span>
              <span className="partner-picker-option-desc">{DESCRIPTIONS[p.id]}</span>
            </button>
          ))}
        </div>

        <p className="partner-picker-hint">You can only choose once. If you need to change it later, ask your Revibe contact.</p>
        {error && <p className="category-manager-error">⚠️ {error}</p>}

        <button className="btn btn-gradient" style={{ width: '100%' }} disabled={!selected || saving} onClick={handleConfirm}>
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
