'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PARTNER_TYPES } from '@/lib/categories';
import { FormAlert, ModalShell } from '@/components/UploadZone';
import { Spinner } from '@/components/ui';

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
    <ModalShell
      title="Welcome to Revibe Training 👋"
      subtitle="Which of these describes you? We use it to show you the right training."
      icon="waving_hand"
      onClose={() => {}}
      dismissible={false}
      className="partner-modal"
    >
      <div className="partner-options" role="radiogroup" aria-label="Partner type">
        {PARTNER_TYPES.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected === p.id}
            className={`partner-option ${selected === p.id ? 'active' : ''}`}
            onClick={() => setSelected(p.id)}
            data-autofocus={p.id === PARTNER_TYPES[0].id ? true : undefined}
          >
            <i className="material-icons" aria-hidden="true">{p.icon}</i>
            <span className="partner-option-label">{p.short}</span>
            <span className="partner-option-desc">{DESCRIPTIONS[p.id]}</span>
          </button>
        ))}
      </div>

      <p className="field-hint partner-hint">You can only choose once. If you need to change it later, ask your Revibe contact.</p>
      <FormAlert>{error}</FormAlert>

      <div className="modal-footer up-modal-footer">
        <button type="button" className="btn btn-gradient partner-continue" disabled={!selected || saving} onClick={handleConfirm}>
          {saving ? <Spinner size="sm" white /> : <i className="material-icons" aria-hidden="true">arrow_forward</i>}
          {saving ? 'Saving' : 'Continue'}
        </button>
      </div>
    </ModalShell>
  );
}
