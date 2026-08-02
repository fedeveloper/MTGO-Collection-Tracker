import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { translations } from '../i18n/translations';

export function DashboardStats({ cards = [], lang = 'en' }) {
  const t = translations[lang] || translations.en;

  let totalPortfolioValueTix = 0;
  let totalCardsCount = 0;
  let totalGainers = 0;
  let totalLosers = 0;

  let bestGainer = null;
  let worstLoser = null;

  cards.forEach((c) => {
    const qty = c.quantity || 1;
    const val = (c.priceTix || 0) * qty;
    totalPortfolioValueTix += val;
    totalCardsCount += qty;

    if (c.trend === 'up') {
      totalGainers++;
      if (!bestGainer || c.deltaPercent > bestGainer.deltaPercent) {
        bestGainer = c;
      }
    } else if (c.trend === 'down') {
      totalLosers++;
      if (!worstLoser || c.deltaPercent < worstLoser.deltaPercent) {
        worstLoser = c;
      }
    }
  });

  const formattedPortfolioValue = totalPortfolioValueTix.toFixed(2);

  return (
    <div className="stats-grid">
      {/* Total Portfolio Value */}
      <div className="stat-card glass-panel">
        <div className="stat-header">
          <span className="stat-title">{t.totalValue}</span>
          <div className="stat-icon"><DollarSign size={18} /></div>
        </div>
        <div className="stat-value">{formattedPortfolioValue} <span style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>TIX</span></div>
        <div className="stat-badge badge-neutral">
          <Layers size={13} /> {cards.length} {t.uniqueCards} ({totalCardsCount} {t.totalCards})
        </div>
      </div>

      {/* Top Gainers Count */}
      <div className="stat-card glass-panel" style={{ borderColor: totalGainers > 0 ? 'var(--gainer-border)' : undefined }}>
        <div className="stat-header">
          <span className="stat-title" style={{ color: 'var(--gainer-color)' }}>{t.gainersCount}</span>
          <div className="stat-icon" style={{ background: 'var(--gainer-bg)', color: 'var(--gainer-color)' }}>
            <TrendingUp size={18} />
          </div>
        </div>
        <div className="stat-value" style={{ color: 'var(--gainer-color)' }}>+{totalGainers}</div>
        {bestGainer ? (
          <div className="stat-badge badge-gainer">
            <span>🔥 {t.bestGainer}: {bestGainer.name} (+{bestGainer.deltaPercent}%)</span>
          </div>
        ) : (
          <div className="stat-badge badge-neutral">{t.noGainers}</div>
        )}
      </div>

      {/* Top Losers Count */}
      <div className="stat-card glass-panel" style={{ borderColor: totalLosers > 0 ? 'var(--loser-border)' : undefined }}>
        <div className="stat-header">
          <span className="stat-title" style={{ color: 'var(--loser-color)' }}>{t.losersCount}</span>
          <div className="stat-icon" style={{ background: 'var(--loser-bg)', color: 'var(--loser-color)' }}>
            <TrendingDown size={18} />
          </div>
        </div>
        <div className="stat-value" style={{ color: 'var(--loser-color)' }}>-{totalLosers}</div>
        {worstLoser ? (
          <div className="stat-badge badge-loser">
            <span>📉 {t.worstLoser}: {worstLoser.name} ({worstLoser.deltaPercent}%)</span>
          </div>
        ) : (
          <div className="stat-badge badge-neutral">{t.noLosers}</div>
        )}
      </div>
    </div>
  );
}
