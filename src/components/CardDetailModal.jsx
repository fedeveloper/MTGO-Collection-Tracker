import React from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown, ShoppingBag } from 'lucide-react';
import { translations } from '../i18n/translations';

export function CardDetailModal({ card, onClose, lang = 'en' }) {
  if (!card) return null;
  const t = translations[lang] || translations.en;

  const isGainer = card.trend === 'up';
  const isLoser = card.trend === 'down';

  // Direct card URLs
  const goatbotsUrl = `https://www.goatbots.com/card/${encodeURIComponent(card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`;
  const cardhoarderUrl = card.cardhoarderUri || `https://www.cardhoarder.com/cards/id/${card.catId}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Card Image */}
          <div style={{ flex: '0 0 200px', display: 'flex', justifyContent: 'center' }}>
            <img 
              src={card.imageUri} 
              alt={card.name}
              style={{ width: '100%', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} 
            />
          </div>

          {/* Card Info & Metrics */}
          <div style={{ flex: '1 1 260px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '4px' }}>{card.name}</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: '700', textTransform: 'uppercase' }}>{card.setName || card.set}</span> • <span style={{ textTransform: 'capitalize' }}>{card.rarity}</span> • CatID: {card.catId}
            </div>

            {/* Price Movement Summary */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.currentPrice}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>{card.priceTix.toFixed(2)} TIX</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
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

            {/* Vendor Links */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a 
                href={card.scryfallUri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '8px 12px' }}
              >
                <ExternalLink size={14} /> Scryfall
              </a>
              <a 
                href={goatbotsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '8px 12px' }}
              >
                <ShoppingBag size={14} /> GoatBots
              </a>
              <a 
                href={cardhoarderUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '8px 12px' }}
              >
                <ShoppingBag size={14} /> Cardhoarder
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
