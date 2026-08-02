import React, { useState } from 'react';
import { X, Clock, Save, Globe } from 'lucide-react';
import { translations } from '../i18n/translations';

export function SchedulerModal({ settings, onClose, onSaveSettings, lang = 'en' }) {
  const t = translations[lang] || translations.en;

  const [intervalMinutes, setIntervalMinutes] = useState(settings?.scheduleIntervalMinutes || 60);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(settings?.autoSyncEnabled ?? true);
  const [priceSource, setPriceSource] = useState(settings?.priceSource || 'scryfall');
  const [language, setLanguage] = useState(settings?.language || lang || 'en');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        scheduleIntervalMinutes: Number(intervalMinutes),
        autoSyncEnabled,
        priceSource,
        language
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ padding: '10px', background: 'rgba(99,102,241,0.15)', borderRadius: '10px', color: 'var(--accent-primary)' }}>
            <Clock size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>{t.schedulerTitle}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.schedulerSubtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Toggle Auto Sync */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>{t.autoSyncTitle}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.autoSyncSub}</div>
            </div>
            <input 
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={(e) => setAutoSyncEnabled(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
          </div>

          {/* Interval selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              {t.updateFrequency}
            </label>
            <select 
              className="sort-select" 
              style={{ width: '100%', padding: '12px' }}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)}
              disabled={!autoSyncEnabled}
            >
              <option value={15}>{t.every15m}</option>
              <option value={30}>{t.every30m}</option>
              <option value={60}>{t.every1h}</option>
              <option value={360}>{t.every6h}</option>
              <option value={720}>{t.every12h}</option>
              <option value={1440}>{t.every24h}</option>
            </select>
          </div>

          {/* Price source selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              {t.priceSource}
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                className={`btn ${priceSource === 'scryfall' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                onClick={() => setPriceSource('scryfall')}
              >
                Scryfall API (TIX)
              </button>
              <button 
                type="button"
                className={`btn ${priceSource === 'goatbots' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                onClick={() => setPriceSource('goatbots')}
              >
                GoatBots Market
              </button>
            </div>
          </div>

          {/* Interface Language selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <Globe size={15} color="var(--accent-cyan)" />
              <span>{t.interfaceLanguage}</span>
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.88rem' }}
                onClick={() => setLanguage('en')}
              >
                English (Default)
              </button>
              <button 
                type="button"
                className={`btn ${language === 'it' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.88rem' }}
                onClick={() => setLanguage('it')}
              >
                Italiano
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t.cancel}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={16} />
              <span>{isSaving ? t.saving : t.saveSettings}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
