import React, { useState } from 'react';
import { X, PlusCircle, Check } from 'lucide-react';
import { translations } from '../i18n/translations';

export function AddCardModal({ isOpen, onClose, onAddCard, lang = 'en' }) {
  const t = translations[lang] || translations.en;

  const [catIdInput, setCatIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [qtyInput, setQtyInput] = useState(1);
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!catIdInput.trim() || !nameInput.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddCard({
        catId: parseInt(catIdInput.trim()),
        name: nameInput.trim(),
        quantity: Math.max(1, parseInt(qtyInput) || 1),
        purchasePriceTix: purchasePriceInput.trim() ? parseFloat(purchasePriceInput) : null
      });
      setCatIdInput('');
      setNameInput('');
      setQtyInput(1);
      setPurchasePriceInput('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <PlusCircle size={22} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{t.addCardModalTitle}</h2>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          {t.addCardModalSubtitle}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              CatID MTGO *
            </label>
            <input 
              type="number"
              required
              className="search-input"
              style={{ padding: '9px 12px', fontSize: '0.9rem' }}
              placeholder="e.g. 123603"
              value={catIdInput}
              onChange={(e) => setCatIdInput(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              {t.cardNameOrCatId} *
            </label>
            <input 
              type="text"
              required
              className="search-input"
              style={{ padding: '9px 12px', fontSize: '0.9rem' }}
              placeholder="e.g. Thoughtseize"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {t.quantityLabel} *
              </label>
              <input 
                type="number"
                min="1"
                required
                className="search-input"
                style={{ padding: '9px 12px', fontSize: '0.9rem' }}
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {t.purchasePriceLabel}
              </label>
              <input 
                type="number"
                step="0.01"
                min="0"
                className="search-input"
                style={{ padding: '9px 12px', fontSize: '0.9rem' }}
                placeholder="e.g. 6.50"
                value={purchasePriceInput}
                onChange={(e) => setPurchasePriceInput(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t.cancel}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Check size={16} />
              <span>{t.addCardSubmit}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
