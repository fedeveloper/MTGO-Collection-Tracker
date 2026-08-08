import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Layers, ShoppingBag, Award } from 'lucide-react';
import { translations } from '../i18n/translations';

export function DashboardStats({ cards = [], summary = {}, lang = 'en', valueFilterEnabled = false }) {
  const t = translations[lang] || translations.en;

  const targetCards = valueFilterEnabled ? cards.filter((c) => (c.priceTix || 0) >= 1.0) : cards;

  let totalCardsCount = 0;
  let totalGainers = 0;
  let totalLosers = 0;
  let takeProfitCount = 0;

  let bestGainer = null;
  let worstLoser = null;

  targetCards.forEach((c) => {
    const qty = c.quantity || 1;
    totalCardsCount += qty;

    if (c.signal === 'take_profit' || c.signal === 'near_peak') {
      takeProfitCount++;
    }

    if (c.trend === 'up' || c.timeZeroDeltaTix > 0) {
      totalGainers++;
      if (!bestGainer || c.deltaPercent > bestGainer.deltaPercent) {
        bestGainer = c;
      }
    } else if (c.trend === 'down' || c.timeZeroDeltaTix < 0) {
      totalLosers++;
      if (!worstLoser || c.deltaPercent < worstLoser.deltaPercent) {
        worstLoser = c;
      }
    }
  });

  const currentVal = summary.currentPortfolioValue !== undefined ? summary.currentPortfolioValue : 0;
  const initialVal = summary.initialPortfolioValue !== undefined ? summary.initialPortfolioValue : currentVal;
  const netProfitTix = summary.netProfitTix !== undefined ? summary.netProfitTix : 0;
  const netProfitPercent = summary.netProfitPercent !== undefined ? summary.netProfitPercent : 0;

  const isProfitPositive = netProfitTix >= 0;

  return (
    <div className="stats-grid">
      {/* Total Portfolio Value & Net P&L */}
      <div className="stat-card glass-panel">
        <div className="stat-header">
          <span className="stat-title">{t.totalValue}</span>
          <div className="stat-icon"><DollarSign size={18} /></div>
        </div>
        <div className="stat-value">{currentVal.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>TIX</span></div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
          <div className={`stat-badge ${isProfitPositive ? 'badge-gainer' : 'badge-loser'}`}>
            {isProfitPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>P&L: {isProfitPositive ? '+' : ''}{netProfitTix.toFixed(2)} TIX ({isProfitPositive ? '+' : ''}{netProfitPercent}%)</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ({t.initialValue}: {initialVal.toFixed(2)} TIX)
          </span>
        </div>
      </div>

      {/* Sell Signals / Take Profit Counter */}
      <div className="stat-card glass-panel" style={{ borderColor: takeProfitCount > 0 ? '#f59e0b' : undefined }}>
        <div className="stat-header">
          <span className="stat-title" style={{ color: '#f59e0b' }}>{t.sellSignalsTab}</span>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <ShoppingBag size={18} />
          </div>
        </div>
        <div className="stat-value" style={{ color: '#f59e0b' }}>{takeProfitCount}</div>
        <div className="stat-badge badge-neutral" style={{ color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <Award size={13} /> {t.sellSignalsSub}
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
