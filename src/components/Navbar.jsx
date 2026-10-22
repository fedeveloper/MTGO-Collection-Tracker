import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, MoreHorizontal } from 'lucide-react';
import { makeT } from '../i18n/useT';
import { formatTime } from '../format';

export function Navbar({ lastSyncTime, nextSyncTime, isSyncing, onSyncNow, onOpenSettings, onOpenUpload, onOpenAddCard, lang = 'en', onToggleLang }) {
  const t = makeT(lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !moreRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const exportCsv = () => window.open('/api/export/csv', '_blank');

  const actions = [
    { label: t('addCard'), run: onOpenAddCard },
    { label: t('uploadDek'), run: onOpenUpload },
    { label: t('exportCsv'), run: exportCsv },
    { label: t('settings'), run: onOpenSettings, separated: true },
    { label: t('otherLanguage'), run: () => onToggleLang(lang === 'en' ? 'it' : 'en'), lang: lang === 'en' ? 'it' : 'en' }
  ];

  let status = t('notSynced');
  if (isSyncing) status = t('syncing');
  else if (lastSyncTime) {
    status = t('updatedAt', { time: formatTime(lastSyncTime, lang) });
    if (nextSyncTime) status += `, ${t('nextAt', { time: formatTime(nextSyncTime, lang) })}`;
  }

  return (
    <header className="topbar">
      <span className="wordmark">{t('appName')}</span>
      <span className="sync-status" aria-live="polite">{status}</span>

      <nav className="topbar-actions" aria-label={t('moreActions')}>
        {actions.map((a) => (
          <button key={a.label} type="button" className="btn btn-quiet" onClick={a.run} lang={a.lang}>
            {a.label}
          </button>
        ))}
      </nav>

      <button type="button" className="btn btn-primary sync-btn" onClick={onSyncNow} disabled={isSyncing} aria-label={t('syncPrices')}>
        <RefreshCw size={16} strokeWidth={2.2} className={isSyncing ? 'spin' : ''} />
        <span className="label">{isSyncing ? t('syncing') : t('syncPrices')}</span>
      </button>

      <div className="more" ref={moreRef}>
        <button
          type="button"
          className="btn btn-outline icon-btn"
          aria-label={t('moreActions')}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div className="menu" role="menu">
            {actions.map((a) => (
              <React.Fragment key={a.label}>
                {a.separated && <hr />}
                <button
                  type="button"
                  role="menuitem"
                  lang={a.lang}
                  onClick={() => {
                    setMenuOpen(false);
                    a.run();
                  }}
                >
                  {a.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
