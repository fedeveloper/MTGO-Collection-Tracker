import React from 'react';
import { makeT } from '../i18n/useT';
import { formatTix, formatSigned, formatPercent, formatDate, direction } from '../format';
import { PortfolioChart } from './PortfolioChart';

const BENCHMARKS = [
  ['time_zero', 'benchmarkTimeZero'],
  ['last_check', 'benchmarkLastCheck'],
  ['purchase_price', 'benchmarkPurchase']
];

export function Overview({ summary = {}, history, timeframe, onChangeTimeframe, onDeleteSnapshot, priceSource, lang = 'en' }) {
  const t = makeT(lang);
  const value = summary.currentPortfolioValue ?? 0;
  const pnl = summary.netProfitTix ?? 0;
  const pnlPercent = summary.netProfitPercent ?? 0;

  return (
    <section className="overview">
      <div>
        <div className="value-label">{t('collectionValue')}</div>
        <div className="value">
          {formatTix(value, lang)}
          <small>TIX</small>
        </div>
        <div className="pnl">
          <span>
            <strong className={direction(pnl)}>
              {formatSigned(pnl, lang)} TIX ({formatPercent(pnlPercent, lang)})
            </strong>{' '}
            {summary.timeZeroTimestamp && (
              <span className="muted">{t('sinceFirstImport', { date: formatDate(summary.timeZeroTimestamp, lang) })}</span>
            )}
          </span>
          {summary.totalPurchaseCostTix > 0 && (
            <span className="muted">
              {t('onPurchaseCost')}:{' '}
              <strong className={direction(summary.unrealizedPnlOnCostTix)}>
                {formatSigned(summary.unrealizedPnlOnCostTix, lang)} TIX ({formatPercent(summary.unrealizedPnlOnCostPercent, lang)})
              </strong>
            </span>
          )}
          {summary.totalSalesCount > 0 && (
            <span className="muted">
              {t('realizedFromSales')}:{' '}
              <strong className={direction(summary.totalRealizedPnlTix)}>{formatSigned(summary.totalRealizedPnlTix, lang)} TIX</strong>
            </span>
          )}
        </div>

        <div className="benchmark">
          <span className="benchmark-label" id="benchmark-label">{t('compareWith')}</span>
          <div className="segmented" role="group" aria-labelledby="benchmark-label">
            {BENCHMARKS.map(([key, label]) => (
              <button key={key} type="button" aria-pressed={timeframe === key} onClick={() => onChangeTimeframe(key)}>
                {t(label)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <PortfolioChart history={history} lang={lang} priceSource={priceSource} onDeleteSnapshot={onDeleteSnapshot} />
    </section>
  );
}
