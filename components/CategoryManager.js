'use client';

import { useState } from 'react';
import { saveCategory, deleteCategory, PARTNER_TYPES } from '@/lib/categories';

/**
 * Trainer modal: create categories and tag which partner groups can see them.
 * Revibe members always see every category.
 */
export default function CategoryManager({ categories, onClose, onChanged }) {
  const [newName, setNewName] = useState('');
  const [newAudiences, setNewAudiences] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const toggle = (list, id) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  const run = async (key, fn) => {
    setBusy(key);
    setError('');
    try {
      await fn();
      await onChanged();
    } catch (err) {
      console.error('Category update failed:', err);
      setError(err.message || 'Something went wrong');
    }
    setBusy(null);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setError(`"${name}" already exists`);
      return;
    }
    run('new', async () => {
      await saveCategory(name, newAudiences);
      setNewName('');
      setNewAudiences([]);
    });
  };

  const handleDelete = (cat) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    run(cat.id, () => deleteCategory(cat.name));
  };

  return (
    <div className="modal-backdrop active" onClick={onClose}>
      <div className="modal category-manager" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="category-manager-title">Categories</h2>
            <p className="category-manager-subtitle">Revibe members see everything. Tag who else can see each category.</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <i className="material-icons">close</i>
          </button>
        </div>

        <div className="category-list">
          {categories.map(cat => (
            <div key={cat.id} className="category-row">
              <span className="category-row-name">{cat.name}</span>
              <div className="category-row-tags">
                {PARTNER_TYPES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`audience-chip ${cat.audiences.includes(p.id) ? 'active' : ''}`}
                    disabled={busy === cat.id}
                    onClick={() => run(cat.id, () => saveCategory(cat.name, toggle(cat.audiences, p.id)))}
                    title={`Visible to ${p.label}`}
                  >
                    <i className="material-icons">{p.icon}</i>
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn-icon btn-sm category-row-delete"
                  disabled={busy === cat.id}
                  onClick={() => handleDelete(cat)}
                  title="Delete category"
                >
                  <i className="material-icons">{busy === cat.id ? 'hourglass_empty' : 'delete_outline'}</i>
                </button>
              </div>
            </div>
          ))}
        </div>

        <form className="category-add" onSubmit={handleAdd}>
          <input
            className="input"
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={40}
          />
          <div className="category-row-tags">
            {PARTNER_TYPES.map(p => (
              <button
                key={p.id}
                type="button"
                className={`audience-chip ${newAudiences.includes(p.id) ? 'active' : ''}`}
                onClick={() => setNewAudiences(toggle(newAudiences, p.id))}
              >
                <i className="material-icons">{p.icon}</i>
                {p.label}
              </button>
            ))}
            <button type="submit" className="btn btn-gradient btn-sm" disabled={!newName.trim() || busy === 'new'}>
              <i className="material-icons" style={{ fontSize: '16px' }}>add</i> Add
            </button>
          </div>
        </form>

        {error && <p className="category-manager-error">⚠️ {error}</p>}
      </div>
    </div>
  );
}
