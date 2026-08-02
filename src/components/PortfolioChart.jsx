import React from 'react';
import { Line } from 'react-chartjs-2';
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

export function PortfolioChart({ history = [], lang = 'en', priceSource = 'scryfall' }) {
  const t = translations[lang] || translations.en;

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
        pointRadius: 4,
        pointBackgroundColor: '#06b6d4',
        pointHoverRadius: 7
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(18, 24, 36, 0.95)',
        titleColor: '#fff',
        bodyColor: '#6366f1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => ` ${t.totalValue}: ${context.parsed.y.toFixed(2)} TIX (${sourceName})`
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
          callback: (value) => `${value} TIX`
        }
      }
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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
      <div style={{ height: '220px', width: '100%' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
