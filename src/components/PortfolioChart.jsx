import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { translations } from '../i18n/translations';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function PortfolioChart({ history = [], lang = 'en', priceSource = 'scryfall', onDeleteSnapshot }) {
  const t = translations[lang] || translations.en;
  const [snapshotToDelete, setSnapshotToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sourceName = priceSource === 'goatbots' ? 'GoatBots Market' : 'Scryfall TIX';

  if (!history || history.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>{t.chartPlaceholder}</p>
        <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', marginTop: '6px', display: 'inline-block' }}>
          Source: {sourceName}
        </span>
      </div>
    );
  }

  const labels = history.map((snap) => {
    try {
      const d = new Date(snap.timestamp);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  });

  const dataValues = history.map((snap) => snap.totalValueTix || 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: `${t.totalValue} (${sourceName})`,
        data: dataValues,
        borderColor: '#6366f1',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.35,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverBackgroundColor: '#ef4444',
        pointHoverBorderColor: '#ffffff'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const clickedSnap = history[index];
        if (clickedSnap) {
          setSnapshotToDelete(clickedSnap);
        }
      }
    },
    onHover: (event, chartElement) => {
      if (event.native && event.native.target) {
        event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: true,
        backgroundColor: 'rgba(18, 24, 36, 0.95)',
        titleColor: '#fff',
        bodyColor: '#6366f1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => ` ${t.totalValue}: ${context.parsed.y.toFixed(2)} TIX`,
          footer: () => `\n${t.clickPointHint}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', maxTicksLimit: 8 }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { 
          color: '#64748b',
          callback: (value) => `${parseFloat(Number(value).toFixed(2))} TIX`
        }
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!snapshotToDelete) return;
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

  const formatSnapshotDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{t.chartTitle}</h3>
          <span style={{ fontSize: '0.75rem', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
            {sourceName}
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {t.savedSnapshots} {history.length}
        </span>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        {t.clickPointHint}
      </div>

      <div style={{ height: '230px', width: '100%' }}>
        <Line data={chartData} options={options} />
      </div>

      {/* Confirmation Modal to delete clicked snapshot */}
      {snapshotToDelete && (
        <div className="modal-overlay" onClick={() => setSnapshotToDelete(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <button className="modal-close" onClick={() => setSnapshotToDelete(null)}>
              <X size={20} />
            </button>

            <div style={{ width: '48px', height: '48px', background: 'var(--loser-bg)', color: 'var(--loser-color)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px' }}>{t.deleteSnapshotTitle}</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {t.deleteSnapshotConfirm}
            </p>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--border-color)', textAlign: 'left', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Data & Ora:</span>
                <span style={{ fontWeight: '700', color: 'white' }}>{formatSnapshotDate(snapshotToDelete.timestamp)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Valore Collezione:</span>
                <span style={{ fontWeight: '800', color: 'var(--accent-cyan)' }}>{snapshotToDelete.totalValueTix.toFixed(2)} TIX</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSnapshotToDelete(null)}>
                {t.cancel}
              </button>
              <button 
                className="btn" 
                style={{ background: '#dc2626', color: 'white', border: 'none' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                <Trash2 size={16} />
                <span>{isDeleting ? t.updating : 'Elimina Snapshot'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
