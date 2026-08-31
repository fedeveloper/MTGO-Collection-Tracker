import React from 'react';
import { Layers, RefreshCw, Clock, Settings, TrendingUp, UploadCloud, Download, Globe, PlusCircle } from 'lucide-react';
import { translations } from '../i18n/translations';

export function Navbar({ lastSyncTime, isSyncing, onSyncNow, onOpenSettings, onOpenUpload, onOpenAddCard, lang = 'en', onToggleLang }) {
  const t = translations[lang] || translations.en;

  const formatTime = (isoString) => {
    if (!isoString) return t.never;
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return t.never;
    }
  };

  const handleExportCsv = () => {
    window.open('/api/export/csv', '_blank');
  };

  return (
    <header className="navbar glass-panel">
      <div className="brand">
        <div className="brand-icon">
          <TrendingUp size={24} />
        </div>
        <div>
          <h1 className="brand-title">{t.brandTitle}</h1>
          <p className="brand-subtitle">{t.brandSubtitle}</p>
        </div>
      </div>

      <div className="nav-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <Clock size={14} color="var(--accent-cyan)" />
          <span>{t.lastSync} <strong style={{ color: 'white' }}>{formatTime(lastSyncTime)}</strong></span>
        </div>

        {/* Language Switcher Toggle */}
        <button 
          className="btn btn-secondary"
          onClick={() => onToggleLang(lang === 'en' ? 'it' : 'en')}
          title="Switch Language / Cambia Lingua"
          style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: '700' }}
        >
          <Globe size={15} color="var(--accent-cyan)" />
          <span>{lang === 'en' ? 'EN' : 'IT'}</span>
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={onOpenAddCard}
          title={t.addCard}
        >
          <PlusCircle size={16} color="var(--accent-cyan)" />
          <span>{t.addCard}</span>
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={onOpenUpload}
          title={t.uploadDek}
        >
          <UploadCloud size={16} />
          <span>{t.uploadDek}</span>
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={handleExportCsv}
          title={t.exportCsv}
        >
          <Download size={16} />
          <span>{t.exportCsv}</span>
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={onOpenSettings}
          title={t.scheduler}
        >
          <Settings size={16} />
          <span>{t.scheduler}</span>
        </button>

        <button 
          className="btn btn-primary" 
          onClick={onSyncNow} 
          disabled={isSyncing}
        >
          <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
          <span>{isSyncing ? t.updating : t.syncNow}</span>
        </button>
      </div>
    </header>
  );
}
