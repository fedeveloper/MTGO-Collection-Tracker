import React, { useState } from 'react';
import { makeT } from '../i18n/useT';
import { Dialog } from './Dialog';

export function AddCardModal({ onClose, onAddCard, lang = 'en' }) {
  const t = makeT(lang);
  const [catId, setCatId] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onAddCard({
        catId: parseInt(catId, 10),
        name: name.trim(),
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        purchasePriceTix: purchasePrice.trim() ? parseFloat(purchasePrice) : null
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('addCardFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog title={t('addCardTitle')} onClose={onClose} closeLabel={t('close')}>
      <p className="dialog-help">{t('addCardHelp')}</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        <div className="field-row">
          <label className="field">
            <span>{t('catId')}</span>
            <input className="input" type="number" required min="1" max="999999" step="1" placeholder="123603" value={catId} onChange={(e) => setCatId(e.target.value)} />
          </label>
          <label className="field">
            <span>{t('quantity')}</span>
            <input className="input" type="number" required min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>{t('cardName')}</span>
          <input className="input" type="text" required placeholder="Thoughtseize" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>{t('purchasePriceOptional')}</span>
          <input className="input" type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? t('saving') : t('addCard')}</button>
        </div>
      </form>
    </Dialog>
  );
}
