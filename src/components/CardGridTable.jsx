import React, { useState } from 'react';
import { Search, TrendingUp, TrendingDown, LayoutGrid, List, Sparkles, ShoppingBag, Clock, ShieldAlert, Filter, Receipt, RotateCcw, Calendar, Trash2 } from 'lucide-react';
import { translations } from '../i18n/translations';

export function CardGridTable({ cards = [], salesHistory = [], onSelectCard, onUndoSale, timeframe = 'time_zero', onChangeTimeframe, lang = 'en', valueFilterEnabled = false, onToggleValueFilter }) {
  const t = translations[lang] || translations.en;

  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'gainers' | 'losers' | 'sell_signals' | 'sold'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('price_desc');
  const [viewStyle, setViewStyle] = useState('grid');
  const [undoConfirmId, setUndoConfirmId] = useState(null);

  // Global pre-filter: exclude cards below 1 TIX when toggle is active, and filter purchase prices when purchase_price benchmark is selected
  let baseCards = valueFilterEnabled ? cards.filter(c => (c.priceTix || 0) >= 1.0) : cards;
  if (timeframe === 'purchase_price') {
    baseCards = baseCards.filter((c) => c.purchasePriceTix !== null && c.purchasePriceTix !== undefined);
  }

  const filteredCards = baseCards.filter((card) => {
    const matchesSearch = 
      card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.set && card.set.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === 'gainers') return card.deltaTix > 0;
    if (filterMode === 'losers') return card.deltaTix < 0;
    if (filterMode === 'sell_signals') return card.signal === 'take_profit' || card.signal === 'near_peak';

    return true;
  });

  const sortedCards = [...filteredCards].sort((a, b) => {
    if (sortBy === 'price_desc') return (b.priceTix || 0) - (a.priceTix || 0);
    if (sortBy === 'price_asc') return (a.priceTix || 0) - (b.priceTix || 0);
    if (sortBy === 'gainers') return (b.deltaPercent || 0) - (a.deltaPercent || 0);
    if (sortBy === 'losers') return (a.deltaPercent || 0) - (b.deltaPercent || 0);
    if (sortBy === 'purchase_gainers') return (b.purchaseDeltaPercent !== null ? b.purchaseDeltaPercent : -9999) - (a.purchaseDeltaPercent !== null ? a.purchaseDeltaPercent : -9999);
    if (sortBy === 'purchase_losers') return (a.purchaseDeltaPercent !== null ? a.purchaseDeltaPercent : 9999) - (b.purchaseDeltaPercent !== null ? b.purchaseDeltaPercent : 9999);
    if (sortBy === 'qty') return (b.quantity || 0) - (a.quantity || 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const filteredSales = salesHistory.filter((s) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.set && s.set.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatSaleDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString || '-';
    }
  };

  const handleUndo = async (saleId) => {
    if (!onUndoSale) return;
    try {
      await onUndoSale(saleId);
      setUndoConfirmId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const renderSignalBadge = (card) => {
    if (card.signal === 'take_profit') {
      return (
        <span className="stat-badge" style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 0 12px rgba(245, 158, 11, 0.3)' }}>
          <ShoppingBag size={12} /> {t.signalTakeProfit}
        </span>
      );
    }
    if (card.signal === 'near_peak') {
      return (
        <span className="stat-badge" style={{ background: 'rgba(6, 182, 212, 0.18)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.4)' }}>
          <Sparkles size={12} /> {t.signalNearPeak}
        </span>
      );
    }
    if (card.signal === 'stop_loss') {
      return (
        <span className="stat-badge badge-loser">
          <ShieldAlert size={12} /> {t.signalStopLoss}
        </span>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Timeframe & Benchmark Control Bar */}
      <div className="filter-bar glass-panel" style={{ marginBottom: '14px', background: 'rgba(18, 24, 36, 0.9)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
            {t.timeframeLabel}
          </span>
          <div className="filter-tabs">
            <button 
              className={`tab-btn ${timeframe === 'time_zero' ? 'active' : ''}`}
              onClick={() => onChangeTimeframe && onChangeTimeframe('time_zero')}
            >
              {t.timeframeTimeZero}
            </button>
            <button 
              className={`tab-btn ${timeframe === 'last_check' ? 'active' : ''}`}
              onClick={() => onChangeTimeframe && onChangeTimeframe('last_check')}
            >
              {t.timeframeLastCheck}
            </button>
            <button 
              className={`tab-btn ${timeframe === 'purchase_price' ? 'active' : ''}`}
              onClick={() => onChangeTimeframe && onChangeTimeframe('purchase_price')}
            >
              {t.timeframePurchasePrice}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="filter-bar glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="filter-tabs">
            <button 
              className={`tab-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              {t.allCards} ({baseCards.length})
            </button>
            <button 
              className={`tab-btn tab-gainer ${filterMode === 'gainers' ? 'active' : ''}`}
              onClick={() => setFilterMode('gainers')}
            >
              <TrendingUp size={15} /> {t.gainersTab} ({baseCards.filter(c => c.deltaTix > 0).length})
            </button>
            <button 
              className={`tab-btn tab-loser ${filterMode === 'losers' ? 'active' : ''}`}
              onClick={() => setFilterMode('losers')}
            >
              <TrendingDown size={15} /> {t.losersTab} ({baseCards.filter(c => c.deltaTix < 0).length})
            </button>
            <button 
              className={`tab-btn ${filterMode === 'sell_signals' ? 'active' : ''}`}
              style={{ background: filterMode === 'sell_signals' ? '#d97706' : undefined, color: filterMode === 'sell_signals' ? 'white' : '#fbbf24' }}
              onClick={() => setFilterMode('sell_signals')}
            >
              <ShoppingBag size={15} /> {t.sellSignalsTab} ({baseCards.filter(c => c.signal === 'take_profit' || c.signal === 'near_peak').length})
            </button>

            {/* Sold / Transactions Tab */}
            <button 
              className={`tab-btn ${filterMode === 'sold' ? 'active' : ''}`}
              style={{ background: filterMode === 'sold' ? 'var(--accent-primary)' : undefined }}
              onClick={() => setFilterMode('sold')}
            >
              <Receipt size={15} /> {t.soldTab} ({salesHistory.length})
            </button>
          </div>

          {/* Global Value Filter Toggle */}
          {filterMode !== 'sold' && (
            <button
              className={`tab-btn ${valueFilterEnabled ? 'active' : ''}`}
              onClick={() => onToggleValueFilter && onToggleValueFilter(!valueFilterEnabled)}
              style={{
                background: valueFilterEnabled ? 'linear-gradient(135deg, #d97706, #b45309)' : 'rgba(255, 255, 255, 0.05)',
                color: valueFilterEnabled ? 'white' : '#fbbf24',
                border: valueFilterEnabled ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                boxShadow: valueFilterEnabled ? '0 2px 12px rgba(245, 158, 11, 0.4)' : 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontFamily: 'var(--font-main)',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              title={t.valuableTab}
            >
              <Filter size={14} /> {t.valuableTab}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search Box */}
          <div className="search-box">
            <Search className="search-icon" />
            <input 
              type="text" 
              className="search-input"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filterMode !== 'sold' && (
            <>
              {/* Sort Select */}
              <select 
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="price_desc">{t.sortPriceDesc}</option>
                <option value="price_asc">{t.sortPriceAsc}</option>
                <option value="gainers">{t.sortGainers}</option>
                <option value="losers">{t.sortLosers}</option>
                <option value="purchase_gainers">{t.sortPurchaseGainers}</option>
                <option value="purchase_losers">{t.sortPurchaseLosers}</option>
                <option value="qty">{t.sortQuantity}</option>
                <option value="name">{t.sortName}</option>
              </select>

              {/* View Toggle */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button 
                  className={`tab-btn ${viewStyle === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewStyle('grid')}
                  style={{ padding: '6px 10px' }}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  className={`tab-btn ${viewStyle === 'table' ? 'active' : ''}`}
                  onClick={() => setViewStyle('table')}
                  style={{ padding: '6px 10px' }}
                >
                  <List size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SOLD / TRANSACTIONS TAB VIEW */}
      {filterMode === 'sold' && (
        <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={20} color="var(--accent-cyan)" />
              {t.salesHistoryTitle}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Totale vendite: <strong>{salesHistory.length}</strong>
            </span>
          </div>

          {filteredSales.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>{t.noSoldCards}</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>{t.thCard}</th>
                  <th style={{ padding: '12px 16px' }}>{t.thSet}</th>
                  <th style={{ padding: '12px 16px' }}>{t.thQuantity}</th>
                  <th style={{ padding: '12px 16px' }}>{t.thPurchasePrice}</th>
                  <th style={{ padding: '12px 16px' }}>{t.thSalePrice}</th>
                  <th style={{ padding: '12px 16px' }}>{t.thRealizedGain}</th>
                  <th style={{ padding: '12px 16px' }}>{t.thSaleDate}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t.thActions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const isGain = sale.realizedPnlTix >= 0;
                  return (
                    <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img 
                          src={sale.imageUri || 'https://svgs.scryfall.io/card-back.svg'} 
                          alt="" 
                          style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} 
                        />
                        <span>{sale.name}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'uppercase', fontWeight: '600', color: 'var(--accent-cyan)' }}>{sale.set}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '700' }}>x{sale.quantity}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>
                        {sale.purchasePriceTix ? `${sale.purchasePriceTix.toFixed(2)} TIX` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#fbbf24' }}>
                        {sale.salePriceTix.toFixed(2)} TIX
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`stat-badge ${isGain ? 'badge-gainer' : 'badge-loser'}`}>
                          {isGain ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {isGain ? '+' : ''}{sale.realizedPnlTix.toFixed(2)} TIX
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatSaleDate(sale.saleDate)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {undoConfirmId === sale.id ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleUndo(sale.id)}
                              style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--loser-color)' }}
                            >
                              Conferma Annulla
                            </button>
                            <button 
                              className="btn btn-secondary"
                              onClick={() => setUndoConfirmId(null)}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="btn btn-secondary"
                            onClick={() => setUndoConfirmId(sale.id)}
                            style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}
                            title={t.undoSale}
                          >
                            <RotateCcw size={13} /> {t.undoSale}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ACTIVE CARDS VIEW (ALL / GAINERS / LOSERS / SIGNALS) */}
      {filterMode !== 'sold' && (
        <>
          {/* Empty State */}
          {sortedCards.length === 0 && (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{t.emptyFilter}</p>
              <button className="btn btn-secondary" onClick={() => { setFilterMode('all'); setSearchQuery(''); if (valueFilterEnabled && onToggleValueFilter) onToggleValueFilter(false); }}>
                {t.resetFilters}
              </button>
            </div>
          )}

          {/* Grid View */}
          {viewStyle === 'grid' && sortedCards.length > 0 && (
            <div className="cards-grid">
              {sortedCards.map((card) => {
                const isGainer = card.deltaTix > 0;
                const isLoser = card.deltaTix < 0;
                let cardClass = 'card-item';
                if (isGainer) cardClass += ' gainer-card';
                if (isLoser) cardClass += ' loser-card';

                return (
                  <div 
                    key={card.catId} 
                    className={cardClass}
                    onClick={() => onSelectCard(card)}
                  >
                    <div className="card-art-wrap">
                      <img 
                        src={card.imageUri} 
                        alt={card.name} 
                        className="card-art" 
                        loading="lazy"
                        onError={(e) => { e.target.src = 'https://svgs.scryfall.io/card-back.svg'; }}
                      />
                      <div className="card-quantity-badge">
                        x{card.quantity}
                      </div>

                      {isGainer && (
                        <div className="card-badge-trend stat-badge badge-gainer">
                          <TrendingUp size={12} /> +{card.deltaPercent}%
                        </div>
                      )}

                      {isLoser && (
                        <div className="card-badge-trend stat-badge badge-loser">
                          <TrendingDown size={12} /> {card.deltaPercent}%
                        </div>
                      )}
                    </div>

                    <div className="card-body">
                      <div>
                        <h4 className="card-name" title={card.name}>{card.name}</h4>
                        <div className="card-set-info">
                          <span style={{ textTransform: 'uppercase', fontWeight: '700', color: 'var(--accent-cyan)' }}>{card.set}</span>
                          <span>•</span>
                          <span style={{ textTransform: 'capitalize' }}>{card.rarity}</span>
                        </div>
                      </div>

                      {renderSignalBadge(card) && (
                        <div style={{ marginTop: '6px', marginBottom: '8px' }}>
                          {renderSignalBadge(card)}
                        </div>
                      )}

                      <div className="card-price-row">
                        <div>
                          <div className="price-label">{t.thPriceTix}</div>
                          <div className="price-tix">{card.priceTix.toFixed(2)} TIX</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="price-label">{t.thTotalValue}</div>
                          <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                            {(card.priceTix * card.quantity).toFixed(2)} TIX
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {viewStyle === 'table' && sortedCards.length > 0 && (
            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '14px 18px' }}>{t.thCard}</th>
                    <th style={{ padding: '14px 18px' }}>{t.thCatId}</th>
                    <th style={{ padding: '14px 18px' }}>{t.thSet}</th>
                    <th style={{ padding: '14px 18px' }}>{t.thQuantity}</th>
                    <th style={{ padding: '14px 18px' }}>{t.thPurchasePrice}</th>
                    <th style={{ padding: '14px 18px' }}>{t.thPriceTix}</th>
                    <th style={{ padding: '14px 18px' }}>{t.thTotalValue}</th>
                    <th style={{ padding: '14px 18px' }}>{t.thMovement}</th>
                    <th style={{ padding: '14px 18px' }}>{t.thSignal}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCards.map((card) => (
                    <tr 
                      key={card.catId}
                      onClick={() => onSelectCard(card)}
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={card.artCrop || card.imageUri} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                        <span>{card.name}</span>
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{card.catId}</td>
                      <td style={{ padding: '12px 18px', textTransform: 'uppercase', fontWeight: '600', color: 'var(--accent-cyan)' }}>{card.set}</td>
                      <td style={{ padding: '12px 18px', fontWeight: '700' }}>x{card.quantity}</td>
                      <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {card.purchasePriceTix !== null ? `${card.purchasePriceTix.toFixed(2)} TIX` : '-'}
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{card.priceTix.toFixed(2)} TIX</td>
                      <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        {(card.priceTix * card.quantity).toFixed(2)} TIX
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {card.deltaTix > 0 && (
                          <span className="stat-badge badge-gainer">
                            <TrendingUp size={12} /> +{card.deltaPercent}% (+{card.deltaTix} TIX)
                          </span>
                        )}
                        {card.deltaTix < 0 && (
                          <span className="stat-badge badge-loser">
                            <TrendingDown size={12} /> {card.deltaPercent}% ({card.deltaTix} TIX)
                          </span>
                        )}
                        {card.deltaTix === 0 && (
                          <span className="stat-badge badge-neutral">{t.badgeStable}</span>
                        )}
                      </td>
                        <td style={{ padding: '12px 18px' }}>
                        {renderSignalBadge(card) || <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
