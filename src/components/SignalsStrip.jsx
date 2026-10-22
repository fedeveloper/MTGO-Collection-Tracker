import React from 'react';
import { makeT, countLabel } from '../i18n/useT';
import { formatTix, formatPercent, direction } from '../format';
import { CardThumb } from './CardThumb';

const SIGNAL_ORDER = { take_profit: 0, near_peak: 1, stop_loss: 2 };

// "Worth a look now": cards with a trading signal, sell candidates first, biggest moves first
export function SignalsStrip({ cards, onSelectCard, lang = 'en' }) {
  const t = makeT(lang);
  const flagged = cards
    .filter((c) => c.signal && c.signal !== 'neutral')
    .sort((a, b) => SIGNAL_ORDER[a.signal] - SIGNAL_ORDER[b.signal] || Math.abs(b.timeZeroDeltaPercent) - Math.abs(a.timeZeroDeltaPercent));

  return (
    <section aria-labelledby="signals-title">
      <div className="section-head">
        <h2 id="signals-title">{t('signalsTitle')}</h2>
        {flagged.length > 0 && <span className="muted">{countLabel(t, 'cardsCount', 'cardsCountOne', flagged.length)}</span>}
      </div>

      {flagged.length === 0 ? (
        <p className="signals-empty">{t('signalsEmpty')}</p>
      ) : (
        <div className="signals">
          {flagged.map((card) => (
            <button key={card.catId} type="button" className="signal" onClick={() => onSelectCard(card)}>
              <CardThumb card={card} />
              <div className="stack">
                <div className="signal-name">{card.name}</div>
                <div>
                  <span className={`tag tag-${card.signal}`}>{t(`signal_${card.signal}`)}</span>{' '}
                  <span className={`num ${direction(card.timeZeroDeltaTix)}`} style={{ fontSize: 13 }}>
                    {formatPercent(card.timeZeroDeltaPercent, lang, 0)}
                  </span>
                </div>
                <div className="signal-detail">
                  {formatTix(card.timeZeroPrice, lang)} → {formatTix(card.priceTix, lang)} TIX,{' '}
                  {countLabel(t, 'copies', 'copiesOne', card.quantity)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
