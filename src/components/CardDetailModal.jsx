import React, { useState } from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown, ShoppingBag, Link as LinkIcon, Check, Trash2, Award, ShieldAlert, Sparkles, DollarSign, Tag, CheckCircle } from 'lucide-react';
import { translations } from '../i18n/translations';

export function CardDetailModal({ card, onClose, onSaveCustomLink, onSavePurchase, onRecordSale, lang = 'en' }) {
  if (!card) return null;
  const t = translations[lang] || translations.en;

  const [customUrlInput, setCustomUrlInput] = useState(card.customUrl || '');
  const [purchaseInput, setPurchaseInput] = useState(card.purchasePriceTix !== null && card.purchasePriceTix !== undefined ? card.purchasePriceTix : '');
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Sell form state
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellQty, setSellQty] = useState(1);
  const [sellPriceInput, setSellPriceInput] = useState(card.priceTix || '');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  const isGainer = card.deltaTix > 0;
  const isLoser = card.deltaTix < 0;

  const goatbotsUrl = `https://www.goatbots.com/card/${encodeURIComponent(card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`;
  const cardhoarderUrl = card.cardhoarderUri || `https://www.cardhoarder.com/cards/id/${card.catId}`;

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!onSaveCustomLink) return;
    setIsSavingLink(true);
    try {
      await onSaveCustomLink(card.catId, customUrlInput);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleRemoveLink = async () => {
    if (!onSaveCustomLink) return;
    setIsSavingLink(true);
    try {
      await onSaveCustomLink(card.catId, '');
      setCustomUrlInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingLink(false);
    }
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!onSavePurchase) return;
    setIsSavingPurchase(true);
    try {
      await onSavePurchase(card.catId, purchaseInput);
      setPurchaseSuccess(true);
      setTimeout(() => setPurchaseSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!onRecordSale) return;
    setIsSubmittingSale(true);
    try {
      await onRecordSale({
        catId: card.catId,
        name: card.name,
        set: card.set,
        quantity: Math.min(card.quantity, Math.max(1, parseInt(sellQty) || 1)),
        purchasePriceTix: card.purchasePriceTix || 0,
        salePriceTix: parseFloat(sellPriceInput) || 0,
        imageUri: card.imageUri
      });
      setShowSellForm(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'flex-start' }}>
          {/* Card Image */}
          <div style={{ flex: '0 0 220px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <img 
              src={card.imageUri} 
              alt={card.name}
              style={{ 
                width: '100%', 
                height: 'auto', 
                maxHeight: '340px', 
                objectFit: 'contain', 
                borderRadius: '12px', 
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                aspectRatio: '5 / 7'
              }} 
            />
          </div>

          {/* Card Info & Metrics */}
          <div style={{ flex: '1 1 260px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '4px' }}>{card.name}</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: '700', textTransform: 'uppercase' }}>{card.setName || card.set}</span> • <span style={{ textTransform: 'capitalize' }}>{card.rarity}</span> • CatID: {card.catId}
              {card.isCustomLinked && (
                <span style={{ marginLeft: '8px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700' }}>
                  🔗 {t.customLinkedBadge}
                </span>
              )}
            </div>

            {/* Trading Signal Banners */}
            {card.signal === 'take_profit' && (
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} />
                <span>{t.bannerTakeProfit}</span>
              </div>
            )}
            {card.signal === 'near_peak' && (
              <div style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)', color: 'var(--accent-cyan)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} />
                <span>{t.bannerNearPeak}</span>
              </div>
            )}
            {card.signal === 'stop_loss' && (
              <div style={{ background: 'var(--loser-bg)', border: '1px solid var(--loser-border)', color: 'var(--loser-color)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} />
                <span>{t.bannerStopLoss}</span>
              </div>
            )}

            {/* Price Movement Summary */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.currentPrice}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>{card.priceTix.toFixed(2)} TIX</span>
              </div>

              {card.purchasePriceTix !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{t.pnlVsPurchase}</span>
                  <span className={`stat-badge ${card.purchaseDeltaTix >= 0 ? 'badge-gainer' : 'badge-loser'}`}>
                    {card.purchaseDeltaTix >= 0 ? '+' : ''}{card.purchaseDeltaTix.toFixed(2)} TIX ({card.purchaseDeltaPercent >= 0 ? '+' : ''}{card.purchaseDeltaPercent}%)
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.timeZeroPriceLabel}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {(card.timeZeroPrice || card.priceTix).toFixed(2)} TIX
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.lastCheckChange}</span>
                {isGainer && (
                  <span className="stat-badge badge-gainer">
                    <TrendingUp size={13} /> +{card.deltaPercent}% (+{card.deltaTix} TIX)
                  </span>
                )}
                {isLoser && (
                  <span className="stat-badge badge-loser">
                    <TrendingDown size={13} /> {card.deltaPercent}% ({card.deltaTix} TIX)
                  </span>
                )}
                {!isGainer && !isLoser && (
                  <span className="stat-badge badge-neutral">{t.badgeStable}</span>
                )}
              </div>
            </div>

            {/* Ownership details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.quantityOwned}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>x{card.quantity}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.collectionValue}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                  {(card.priceTix * card.quantity).toFixed(2)} TIX
                </div>
              </div>
            </div>

            {/* Action Buttons: Sell Card */}
            <div style={{ marginBottom: '14px' }}>
              {!showSellForm ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowSellForm(true)}
                  style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <Tag size={16} />
                  <span>{t.sellCard}</span>
                </button>
              ) : (
                <form onSubmit={handleSellSubmit} style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fbbf24', marginBottom: '10px' }}>{t.recordSaleTitle}</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{t.quantityToSell}</label>
                      <input 
                        type="number"
                        min="1"
                        max={card.quantity}
                        className="search-input"
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                        value={sellQty}
                        onChange={(e) => setSellQty(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{t.unitSalePrice}</label>
                      <input 
                        type="number"
                        step="0.01"
                        min="0"
                        className="search-input"
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                        value={sellPriceInput}
                        onChange={(e) => setSellPriceInput(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" disabled={isSubmittingSale} style={{ flex: 1, padding: '6px 12px', fontSize: '0.82rem', background: '#d97706' }}>
                      <Check size={14} /> {t.confirmSale}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowSellForm(false)} style={{ padding: '6px 10px', fontSize: '0.82rem' }}>
                      {t.cancel}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Vendor Links */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a 
                href={card.scryfallUri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              >
                <ExternalLink size={13} /> Scryfall
              </a>
              <a 
                href={goatbotsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              >
                <ShoppingBag size={13} /> GoatBots
              </a>
              <a 
                href={cardhoarderUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              >
                <ShoppingBag size={13} /> Cardhoarder
              </a>
            </div>
          </div>
        </div>

        {/* Set Purchase Price Form */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <DollarSign size={16} color="var(--accent-cyan)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700' }}>{t.purchasePrice}</h4>
            {purchaseSuccess && (
              <span style={{ fontSize: '0.75rem', color: 'var(--gainer-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={13} /> Saved!
              </span>
            )}
          </div>
          <form onSubmit={handlePurchaseSubmit} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input 
              type="number"
              step="0.01"
              min="0"
              className="search-input"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
              placeholder={t.purchasePriceHint}
              value={purchaseInput}
              onChange={(e) => setPurchaseInput(e.target.value)}
            />
            <button 
              type="submit" 
              className="btn btn-secondary"
              disabled={isSavingPurchase}
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <Check size={14} />
              <span>{t.savePurchasePrice}</span>
            </button>
          </form>
        </div>

        {/* Tier 3 Manual Scryfall URL Override Section */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <LinkIcon size={16} color="var(--accent-cyan)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700' }}>{t.customLinkTitle}</h4>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            {t.customLinkSub}
          </p>

          <form onSubmit={handleLinkSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="url"
              className="search-input"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
              placeholder={t.customLinkPlaceholder}
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSavingLink || !customUrlInput.trim()}
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <Check size={14} />
              <span>{t.saveLink}</span>
            </button>

            {card.isCustomLinked && (
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleRemoveLink}
                disabled={isSavingLink}
                style={{ padding: '8px 10px', color: 'var(--loser-color)' }}
                title={t.removeLink}
              >
                <Trash2 size={14} />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
