import React, { useState } from 'react';
import { makeT } from '../i18n/useT';
import { Dialog } from './Dialog';

const INTERVALS = [
  [15, 'every15m'],
  [30, 'every30m'],
  [60, 'every1h'],
  [360, 'every6h'],
  [720, 'every12h'],
  [1440, 'every24h']
];

export function SchedulerModal({ settings, onClose, onSaveSettings, lang = 'en' }) {
  const t = makeT(lang);
  const [intervalMinutes, setIntervalMinutes] = useState(settings?.scheduleIntervalMinutes || 60);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(settings?.autoSyncEnabled ?? true);
  const [priceSource, setPriceSource] = useState(settings?.priceSource || 'scryfall');
  const [language, setLanguage] = useState(settings?.language || lang);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({ scheduleIntervalMinutes: Number(intervalMinutes), autoSyncEnabled, priceSource, language });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog title={t('settingsTitle')} onClose={onClose} closeLabel={t('close')}>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
        <label className="toggle" style={{ color: 'var(--text)' }}>
          <input type="checkbox" checked={autoSyncEnabled} onChange={(e) => setAutoSyncEnabled(e.target.checked)} />
          {t('autoSync')}
        </label>

        <label className="field">
          <span>{t('frequency')}</span>
          <select className="select" value={intervalMinutes} onChange={(e) => setIntervalMinutes(e.target.value)} disabled={!autoSyncEnabled}>
            {INTERVALS.map(([minutes, label]) => (
              <option key={minutes} value={minutes}>{t(label)}</option>
            ))}
          </select>
        </label>

        <div className="field">
          <span id="source-label">{t('priceSource')}</span>
          <div className="segmented" role="group" aria-labelledby="source-label">
            <button type="button" aria-pressed={priceSource === 'scryfall'} onClick={() => setPriceSource('scryfall')}>Scryfall</button>
            <button type="button" aria-pressed={priceSource === 'goatbots'} onClick={() => setPriceSource('goatbots')}>GoatBots</button>
          </div>
        </div>

        <div className="field">
          <span id="language-label">{t('language')}</span>
          <div className="segmented" role="group" aria-labelledby="language-label">
            <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')} lang="en">English</button>
            <button type="button" aria-pressed={language === 'it'} onClick={() => setLanguage('it')} lang="it">Italiano</button>
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? t('saving') : t('saveSettings')}</button>
        </div>
      </form>
    </Dialog>
  );
}
