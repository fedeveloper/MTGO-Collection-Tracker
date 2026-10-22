import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { makeT, countLabel } from '../i18n/useT';
import { formatTix, formatDate } from '../format';
import { Dialog } from './Dialog';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// Colours mirror the tokens in index.css (Chart.js draws on canvas, so CSS variables can't be used directly)
const ACCENT = '#e0a23c';
const LINE = '#2a303b';
const MUTED = '#8a93a3';
const SURFACE = '#232934';

export function PortfolioChart({ history = [], lang = 'en', priceSource = 'scryfall', onDeleteSnapshot }) {
  const t = makeT(lang);
  const [snapshotToDelete, setSnapshotToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const sourceName = priceSource === 'goatbots' ? 'GoatBots' : 'Scryfall';

  const header = (
    <div className="chart-head">
      <h2>{t('chartTitle')}</h2>
      <span>
        {sourceName}
        {history.length > 0 && `, ${countLabel(t, 'snapshots', 'snapshotsOne', history.length)}`}
      </span>
    </div>
  );

  if (history.length === 0) {
    return (
      <div className="chart">
        {header}
        <p className="chart-empty">{t('chartEmpty')}</p>
      </div>
    );
  }

  const data = {
    labels: history.map((snap) => formatDate(snap.timestamp, lang)),
    datasets: [
      {
        data: history.map((snap) => snap.totalValueTix || 0),
        borderColor: ACCENT,
        borderWidth: 2,
        backgroundColor: 'rgba(224, 162, 60, 0.05)',
        fill: true,
        tension: 0.25,
        pointRadius: history.length > 40 ? 0 : 2.5,
        pointBackgroundColor: ACCENT,
        pointHoverRadius: 5,
        pointHitRadius: 12
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    // Only a click on an actual point selects a snapshot (the tooltip follows the cursor anywhere)
    onClick: (event, elements, chart) => {
      const hits = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
      const snap = hits.length ? history[hits[0].index] : null;
      if (snap && onDeleteSnapshot) setSnapshotToDelete(snap);
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: SURFACE,
        borderColor: LINE,
        borderWidth: 1,
        titleColor: MUTED,
        bodyColor: '#e4e7ec',
        padding: 10,
        displayColors: false,
        titleFont: { family: 'Archivo', weight: '400' },
        bodyFont: { family: 'Archivo', weight: '600' },
        callbacks: {
          title: (items) => formatDate(history[items[0].dataIndex].timestamp, lang, true),
          label: (ctx) => `${formatTix(ctx.parsed.y, lang)} TIX`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: LINE },
        ticks: { color: MUTED, maxTicksLimit: 5, maxRotation: 0, font: { family: 'Archivo', size: 11 } }
      },
      y: {
        position: 'right',
        grid: { color: LINE },
        border: { display: false },
        ticks: { color: MUTED, maxTicksLimit: 5, font: { family: 'Archivo', size: 11 }, callback: (v) => formatTix(v, lang, 0) }
      }
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteSnapshot(snapshotToDelete.timestamp);
      setSnapshotToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="chart">
      {header}
      <div className="chart-canvas">
        <Line data={data} options={options} aria-label={t('chartTitle')} role="img" />
      </div>
      {onDeleteSnapshot && <p className="chart-hint">{t('chartHint')}</p>}

      {snapshotToDelete && (
        <Dialog title={t('deleteSnapshotTitle')} onClose={() => setSnapshotToDelete(null)} closeLabel={t('close')}>
          <p className="dialog-help">
            {t('deleteSnapshotBody', {
              date: formatDate(snapshotToDelete.timestamp, lang, true),
              value: formatTix(snapshotToDelete.totalValueTix, lang)
            })}
          </p>
          <div className="dialog-actions">
            <button type="button" className="btn btn-outline" onClick={() => setSnapshotToDelete(null)}>
              {t('cancel')}
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? t('deleting') : t('deleteSnapshot')}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
