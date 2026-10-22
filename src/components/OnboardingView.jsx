import React, { useState } from 'react';
import { makeT } from '../i18n/useT';
import { UploadModal } from './UploadModal';

export function OnboardingView({ onUploadSuccess, lang = 'en' }) {
  const t = makeT(lang);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <main className="onboarding">
      <span className="wordmark">{t('appName')}</span>
      <h1>{t('welcomeTitle')}</h1>
      <p>{t('welcomeBody')}</p>
      <button type="button" className="btn btn-primary" onClick={() => setShowUpload(true)} style={{ justifySelf: 'start', minHeight: 44 }}>
        {t('uploadCollection')}
      </button>

      <h2>{t('howToExport')}</h2>
      <ol>
        <li>{t('step1')}</li>
        <li>{t('step2')}</li>
        <li>{t('step3')}</li>
        <li>{t('step4')}</li>
      </ol>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploadSuccess={onUploadSuccess} lang={lang} />}
    </main>
  );
}
