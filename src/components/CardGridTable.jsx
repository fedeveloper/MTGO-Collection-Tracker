import React, { useState } from 'react';
import { Search, TrendingUp, TrendingDown, LayoutGrid, List, Sparkles } from 'lucide-react';
import { translations } from '../i18n/translations';

export function CardGridTable({ cards = [], onSelectCard, lang = 'en' }) {
  const t = translations[lang] || translations.en;

  const [filterMode, setFilterMode] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('price_desc');
  const [viewStyle, setViewStyle] = useState('grid');

  const filteredCards = cards.filter((card) => {
    const matchesSearch = 
      card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.set && card.set.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === 'gainers') return card.trend === 'up';
    if (filterMode === 'losers') return card.trend === 'down';
    if (filterMode === 'valuable') return (card.priceTix || 0) >= 1.0;

    return true;
  });

  const sortedCards = [...filteredCards].sort((a, b) => {
    if (sortBy === 'price_desc') return (b.priceTix || 0) - (a.priceTix || 0);
    if (sortBy === 'price_asc') return (a.priceTix || 0) - (b.priceTix || 0);
    if (sortBy === 'gainers') return (b.deltaPercent || 0) - (a.deltaPercent || 0);
    if (sortBy === 'losers') return (a.deltaPercent || 0) - (b.deltaPercent || 0);
    if (sortBy === 'qty') return (b.quantity || 0) - (a.quantity || 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div>
      {/* Filter and Control Bar */}
      <div className="filter-bar glass-panel">
        <div className="filter-tabs">
          <button 
            className={`tab-btn ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            {t.allCards} ({cards.length})
          </button>
          <button 
            className={`tab-btn tab-gainer ${filterMode === 'gainers' ? 'active' : ''}`}
            onClick={() => setFilterMode('gainers')}
          >
            <TrendingUp size={15} /> {t.gainersTab} ({cards.filter(c => c.trend === 'up').length})
          </button>
          <button 
            className={`tab-btn tab-loser ${filterMode === 'losers' ? 'active' : ''}`}
            onClick={() => setFilterMode('losers')}
          >
            <TrendingDown size={15} /> {t.losersTab} ({cards.filter(c => c.trend === 'down').length})
          </button>
          <button 
            className={`tab-btn ${filterMode === 'valuable' ? 'active' : ''}`}
            onClick={() => setFilterMode('valuable')}
          >
            <Sparkles size={15} color="#fbbf24" /> {t.valuableTab}
          </button>
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
        </div>
      </div>

      {/* Empty State */}
      {sortedCards.length === 0 && (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{t.emptyFilter}</p>
          <button className="btn btn-secondary" onClick={() => { setFilterMode('all'); setSearchQuery(''); }}>
            {t.resetFilters}
          </button>
        </div>
      )}

      {/* Grid View */}
      {viewStyle === 'grid' && (
        <div className="cards-grid">
          {sortedCards.map((card) => {
            const isGainer = card.trend === 'up';
            const isLoser = card.trend === 'down';
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
                      <span>•</span>
                      <span>CatID: {card.catId}</span>
                    </div>
                  </div>

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
      {viewStyle === 'table' && (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 18px' }}>{t.thCard}</th>
                <th style={{ padding: '14px 18px' }}>{t.thCatId}</th>
                <th style={{ padding: '14px 18px' }}>{t.thSet}</th>
                <th style={{ padding: '14px 18px' }}>{t.thQuantity}</th>
                <th style={{ padding: '14px 18px' }}>{t.thPriceTix}</th>
                <th style={{ padding: '14px 18px' }}>{t.thTotalValue}</th>
                <th style={{ padding: '14px 18px' }}>{t.thMovement}</th>
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
                  <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{card.priceTix.toFixed(2)} TIX</td>
                  <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    {(card.priceTix * card.quantity).toFixed(2)} TIX
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    {card.trend === 'up' && (
                      <span className="stat-badge badge-gainer">
                        <TrendingUp size={12} /> +{card.deltaPercent}% (+{card.deltaTix} TIX)
                      </span>
                    )}
                    {card.trend === 'down' && (
                      <span className="stat-badge badge-loser">
                        <TrendingDown size={12} /> {card.deltaPercent}% ({card.deltaTix} TIX)
                      </span>
                    )}
                    {card.trend === 'stable' && (
                      <span className="stat-badge badge-neutral">{t.badgeStable}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
