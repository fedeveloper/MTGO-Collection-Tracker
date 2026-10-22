import React, { useState } from 'react';
import { Search, Table2, LayoutGrid } from 'lucide-react';
import { makeT, countLabel } from '../i18n/useT';
import { formatTix, formatSigned, formatPercent, formatDate, direction } from '../format';
import { CardThumb } from './CardThumb';

const SORTS = {
  value: ['sortValue', (a, b) => b.priceTix * b.quantity - a.priceTix * a.quantity],
  price_desc: ['sortPriceDesc', (a, b) => b.priceTix - a.priceTix],
  price_asc: ['sortPriceAsc', (a, b) => a.priceTix - b.priceTix],
  gain: ['sortGain', (a, b) => b.deltaPercent - a.deltaPercent],
  drop: ['sortDrop', (a, b) => a.deltaPercent - b.deltaPercent],
  purchase_gain: ['sortPurchaseGain', (a, b) => (b.purchaseDeltaPercent ?? -Infinity) - (a.purchaseDeltaPercent ?? -Infinity)],
  qty: ['sortQty', (a, b) => b.quantity - a.quantity],
  name: ['sortName', (a, b) => a.name.localeCompare(b.name)]
};

const TABS = [
  ['all', 'tabAll', () => true],
  ['rising', 'tabRising', (c) => c.deltaTix > 0],
  ['falling', 'tabFalling', (c) => c.deltaTix < 0],
  ['signals', 'tabSignals', (c) => c.signal && c.signal !== 'neutral'],
  ['sold', 'tabSold', null]
];

const VIEW_KEY = 'mtgo-tracker:view';
function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'table';
  } catch {
    return 'table';
  }
}

export function Holdings({ cards = [], salesHistory = [], timeframe = 'time_zero', onSelectCard, onUndoSale, lang = 'en', valueFilterEnabled, onToggleValueFilter }) {
  const t = makeT(lang);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('value');
  const [view, setView] = useState(readView);
  const [undoId, setUndoId] = useState(null);

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Storage unavailable (private mode): the choice just isn't remembered
    }
  };

  let baseCards = valueFilterEnabled ? cards.filter((c) => c.priceTix >= 1) : cards;
  if (timeframe === 'purchase_price') baseCards = baseCards.filter((c) => c.purchasePriceTix !== null && c.purchasePriceTix !== undefined);

  const q = query.trim().toLowerCase();
  const matches = (name, set) => !q || name.toLowerCase().includes(q) || (set || '').toLowerCase().includes(q);
  const tabFilter = TABS.find(([key]) => key === tab)[2];
  const visible = tab === 'sold' ? [] : baseCards.filter((c) => tabFilter(c) && matches(c.name, c.set)).sort(SORTS[sort][1]);
  const sales = salesHistory.filter((s) => matches(s.name, s.set));

  const counts = Object.fromEntries(TABS.map(([key, , fn]) => [key, fn ? baseCards.filter(fn).length : salesHistory.length]));
  const refLabel = t(`ref_${timeframe}`);
  const signalTag = (card) =>
    card.signal && card.signal !== 'neutral' ? <span className={`tag tag-${card.signal}`}>{t(`signal_${card.signal}`)}</span> : null;

  const clearFilters = () => {
    setTab('all');
    setQuery('');
    if (valueFilterEnabled) onToggleValueFilter(false);
  };

  return (
    <section aria-labelledby="collection-title">
      <div className="section-head">
        <h2 id="collection-title">{t('collectionTitle')}</h2>
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-labelledby="collection-title">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
              {t(label)}
              <span className="count">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-controls">
          <label className="search">
            <span className="visually-hidden">{t('search')}</span>
            <Search size={15} aria-hidden="true" />
            <input
              className="input"
              type="search"
              placeholder={t('search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          {tab !== 'sold' && (
            <>
              <label className="toggle">
                <input type="checkbox" checked={valueFilterEnabled} onChange={(e) => onToggleValueFilter(e.target.checked)} />
                {t('minValueFilter')}
              </label>
              <label className="sort">
                <span className="visually-hidden">{t('sortBy')}</span>
                <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
                  {Object.entries(SORTS).map(([key, [label]]) => (
                    <option key={key} value={key}>
                      {t(label)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="segmented view-toggle" role="group" aria-label={t('view')}>
                <button type="button" aria-pressed={view === 'table'} onClick={() => changeView('table')} aria-label={t('viewTable')} title={t('viewTable')}>
                  <Table2 size={16} />
                </button>
                <button type="button" aria-pressed={view === 'grid'} onClick={() => changeView('grid')} aria-label={t('viewGrid')} title={t('viewGrid')}>
                  <LayoutGrid size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {tab === 'sold' ? (
        <SoldLedger sales={sales} cards={cards} lang={lang} t={t} undoId={undoId} setUndoId={setUndoId} onUndoSale={onUndoSale} />
      ) : visible.length === 0 ? (
        <div className="empty">
          <p>{t('emptyFilter')}</p>
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            {t('clearFilters')}
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid">
          {visible.map((card) => (
            <button key={card.catId} type="button" className="grid-card" onClick={() => onSelectCard(card)}>
              <CardThumb card={card} className="" full />
              <div className="card-name">{card.name}</div>
              <div className="grid-line">
                <span>
                  {formatTix(card.priceTix, lang)} TIX <span className="muted">×{card.quantity}</span>
                </span>
                <span className={direction(card.deltaTix)}>{formatPercent(card.deltaPercent, lang)}</span>
              </div>
              {signalTag(card)}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('colCard')}</th>
                  <th scope="col" className="col-set">{t('colSet')}</th>
                  <th scope="col">{t('colQty')}</th>
                  <th scope="col" className="col-ref">{refLabel}</th>
                  <th scope="col">{t('colPrice')}</th>
                  <th scope="col">{t('colChange')}</th>
                  <th scope="col">{t('colValue')}</th>
                  <th scope="col">{t('colSignal')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((card) => (
                  <tr key={card.catId} className="clickable" onClick={() => onSelectCard(card)}>
                    <td>
                      <button type="button" className="card-cell" onClick={(e) => { e.stopPropagation(); onSelectCard(card); }}>
                        <CardThumb card={card} />
                        <span className="card-name">{card.name}</span>
                      </button>
                    </td>
                    <td className="num col-set set-code">{card.set}</td>
                    <td className="num">{card.quantity}</td>
                    <td className="num col-ref muted">{formatTix(card.previousPriceTix, lang)}</td>
                    <td className="num">{formatTix(card.priceTix, lang)}</td>
                    <td className={`num ${direction(card.deltaTix)}`}>{formatPercent(card.deltaPercent, lang)}</td>
                    <td className="num">{formatTix(card.priceTix * card.quantity, lang)}</td>
                    <td className="num">{signalTag(card)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="rows">
            {visible.map((card) => (
              <li key={card.catId}>
                <button type="button" className="row" onClick={() => onSelectCard(card)}>
                  <CardThumb card={card} />
                  <div className="stack">
                    <div className="card-name">{card.name}</div>
                    <div className="row-meta">
                      {card.set}, {countLabel(t, 'copies', 'copiesOne', card.quantity)} {signalTag(card)}
                    </div>
                  </div>
                  <div className="row-right">
                    <div className="main">{formatTix(card.priceTix, lang)}</div>
                    <div className={`sub ${direction(card.deltaTix)}`}>{formatPercent(card.deltaPercent, lang)}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function SoldLedger({ sales, cards, lang, t, undoId, setUndoId, onUndoSale }) {
  if (sales.length === 0) {
    return (
      <div className="empty">
        <p>{t('noSales')}</p>
      </div>
    );
  }

  // Sale records keep only the full card image; prefer the art crop of the card still in the collection
  const artFor = (sale) => {
    const card = cards.find((c) => c.catId === sale.catId);
    return { artCrop: card?.artCrop, imageUri: sale.imageUri || card?.imageUri };
  };

  const undoButton = (sale) =>
    undoId === sale.id ? (
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <button type="button" className="btn btn-danger" onClick={() => onUndoSale(sale.id).then(() => setUndoId(null))}>
          {t('confirmUndo')}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setUndoId(null)}>
          {t('cancel')}
        </button>
      </span>
    ) : (
      <button type="button" className="btn btn-quiet" onClick={() => setUndoId(sale.id)}>
        {t('undoSale')}
      </button>
    );

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{t('colCard')}</th>
              <th scope="col" className="col-set">{t('colSet')}</th>
              <th scope="col">{t('colQty')}</th>
              <th scope="col">{t('colBought')}</th>
              <th scope="col">{t('colSold')}</th>
              <th scope="col">{t('colRealized')}</th>
              <th scope="col">{t('colDate')}</th>
              <th scope="col"><span className="visually-hidden">{t('undoSale')}</span></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>
                  <div className="card-cell">
                    <CardThumb card={artFor(sale)} />
                    <span className="card-name">{sale.name}</span>
                  </div>
                </td>
                <td className="num col-set set-code">{sale.set}</td>
                <td className="num">{sale.quantity}</td>
                <td className="num muted">{sale.purchasePriceTix ? formatTix(sale.purchasePriceTix, lang) : '–'}</td>
                <td className="num">{formatTix(sale.salePriceTix, lang)}</td>
                <td className={`num ${direction(sale.realizedPnlTix)}`}>{formatSigned(sale.realizedPnlTix, lang)}</td>
                <td className="num muted">{formatDate(sale.saleDate, lang)}</td>
                <td className="num">{undoButton(sale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="rows">
        {sales.map((sale) => (
          <li key={sale.id} className="row">
            <CardThumb card={artFor(sale)} />
            <div className="stack">
              <div className="card-name">{sale.name}</div>
              <div className="row-meta">
                {countLabel(t, 'copies', 'copiesOne', sale.quantity)}, {formatTix(sale.salePriceTix, lang)} TIX, {formatDate(sale.saleDate, lang)}
              </div>
              {undoButton(sale)}
            </div>
            <div className="row-right">
              <div className={`main ${direction(sale.realizedPnlTix)}`}>{formatSigned(sale.realizedPnlTix, lang)}</div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
