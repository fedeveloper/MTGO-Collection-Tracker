import React, { useState } from 'react';
import { makeT } from '../i18n/useT';
import { formatTix, formatSigned, formatPercent, direction } from '../format';
import { Dialog } from './Dialog';
import { CardThumb } from './CardThumb';

export function CardDetailModal({ card, timeframe = 'time_zero', onClose, onSaveCustomLink, onSavePurchase, onRecordSale, lang = 'en' }) {
  const t = makeT(lang);
  const [customUrl, setCustomUrl] = useState(card.customUrl || '');
  const [purchaseInput, setPurchaseInput] = useState(card.purchasePriceTix ?? '');
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [purchaseSaved, setPurchaseSaved] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [saleQty, setSaleQty] = useState(1);
  const [salePrice, setSalePrice] = useState(card.priceTix || '');
  const [savingSale, setSavingSale] = useState(false);

  const hasPurchase = card.purchasePriceTix !== null && card.purchasePriceTix !== undefined;
  const goatbotsUrl = `https://www.goatbots.com/card/${encodeURIComponent(card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`;
  const cardhoarderUrl = card.cardhoarderUri || `https://www.cardhoarder.com/cards/id/${card.catId}`;

  const submitPurchase = async (e) => {
    e.preventDefault();
    setSavingPurchase(true);
    try {
      await onSavePurchase(card.catId, purchaseInput);
      setPurchaseSaved(true);
      setTimeout(() => setPurchaseSaved(false), 2500);
    } finally {
      setSavingPurchase(false);
    }
  };

  const saveLink = async (url) => {
    setSavingLink(true);
    try {
      await onSaveCustomLink(card.catId, url);
      if (!url) setCustomUrl('');
    } finally {
      setSavingLink(false);
    }
  };

  const submitSale = async (e) => {
    e.preventDefault();
    setSavingSale(true);
    try {
      await onRecordSale({
        catId: card.catId,
        name: card.name,
        set: card.set,
        quantity: Math.min(card.quantity, Math.max(1, parseInt(saleQty, 10) || 1)),
        purchasePriceTix: card.purchasePriceTix || 0,
        salePriceTix: parseFloat(salePrice) || 0,
        imageUri: card.imageUri
      });
      onClose();
    } finally {
      setSavingSale(false);
    }
  };

  return (
    <Dialog title={card.name} onClose={onClose} closeLabel={t('close')} wide>
      <div className="detail">
        <CardThumb card={card} className="detail-image" full />

        <div className="detail-info">
          <div className="detail-meta">
            {card.setName || card.set}, {card.rarity}
            {card.signal && card.signal !== 'neutral' && (
              <>
                {' '}
                <span className={`tag tag-${card.signal}`}>{t(`signal_${card.signal}`)}</span>
              </>
            )}
          </div>

          <dl className="facts">
            <dt>{t('price')}</dt>
            <dd><strong>{formatTix(card.priceTix, lang)} TIX</strong></dd>
            <dt>{t(`ref_${timeframe}`)}</dt>
            <dd>{formatTix(card.previousPriceTix, lang)} TIX</dd>
            <dt>{t('change')}</dt>
            <dd className={direction(card.deltaTix)}>
              {formatSigned(card.deltaTix, lang)} TIX ({formatPercent(card.deltaPercent, lang)})
            </dd>
            {timeframe !== 'time_zero' && (
              <>
                <dt>{t('atFirstImport')}</dt>
                <dd>{formatTix(card.timeZeroPrice, lang)} TIX</dd>
              </>
            )}
            <dt>{t('peak')}</dt>
            <dd>{formatTix(card.peakPrice, lang)} TIX</dd>
            <dt>{t('owned')}</dt>
            <dd>{card.quantity}</dd>
            <dt>{t('value')}</dt>
            <dd>{formatTix(card.priceTix * card.quantity, lang)} TIX</dd>
            {hasPurchase && (
              <>
                <dt>{t('gainOnPurchase')}</dt>
                <dd className={direction(card.purchaseDeltaTix)}>
                  {formatSigned(card.purchaseDeltaTix, lang)} TIX
                  {card.purchaseDeltaPercent !== null && ` (${formatPercent(card.purchaseDeltaPercent, lang)})`}
                </dd>
              </>
            )}
          </dl>

          {showSale ? (
            <form className="detail-section" onSubmit={submitSale}>
              <h3>{t('recordSale')}</h3>
              <div className="field-row">
                <label className="field">
                  <span>{t('saleQty')}</span>
                  <input className="input" type="number" min="1" max={card.quantity} value={saleQty} onChange={(e) => setSaleQty(e.target.value)} required />
                </label>
                <label className="field">
                  <span>{t('salePrice')}</span>
                  <input className="input" type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required />
                </label>
              </div>
              <div className="dialog-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowSale(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={savingSale}>{savingSale ? t('saving') : t('recordSale')}</button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setShowSale(true)} style={{ justifySelf: 'start' }}>
              {t('recordSale')}
            </button>
          )}

          <form className="detail-section" onSubmit={submitPurchase}>
            <h3>
              {t('purchasePrice')} {purchaseSaved && <span className="success">{t('saved')}</span>}
            </h3>
            <div className="inline-form">
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder={t('purchasePriceHint')}
                aria-label={t('purchasePriceHint')}
                value={purchaseInput}
                onChange={(e) => setPurchaseInput(e.target.value)}
              />
              <button type="submit" className="btn btn-outline" disabled={savingPurchase}>{t('save')}</button>
            </div>
          </form>

          <form className="detail-section" onSubmit={(e) => { e.preventDefault(); saveLink(customUrl); }}>
            <h3>{t('printingTitle')}</h3>
            <p className="dialog-help">{card.isCustomLinked ? t('linkedPrinting') : t('printingHelp')}</p>
            <div className="inline-form">
              <input
                className="input"
                type="url"
                placeholder={t('printingPlaceholder')}
                aria-label={t('printingTitle')}
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <button type="submit" className="btn btn-outline" disabled={savingLink || !customUrl.trim()}>{t('usePrinting')}</button>
            </div>
            {card.isCustomLinked && (
              <button type="button" className="btn btn-quiet" onClick={() => saveLink('')} disabled={savingLink} style={{ justifySelf: 'start', paddingLeft: 0 }}>
                {t('removePrinting')}
              </button>
            )}
          </form>

          <div className="links detail-section">
            <a href={card.scryfallUri} target="_blank" rel="noopener noreferrer">Scryfall</a>
            <a href={goatbotsUrl} target="_blank" rel="noopener noreferrer">GoatBots</a>
            <a href={cardhoarderUrl} target="_blank" rel="noopener noreferrer">Cardhoarder</a>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
