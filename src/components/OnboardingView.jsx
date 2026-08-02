import React, { useState } from 'react';
import { UploadCloud, Sparkles, ArrowRight } from 'lucide-react';
import { UploadModal } from './UploadModal';
import { translations } from '../i18n/translations';

export function OnboardingView({ onUploadSuccess, lang = 'en' }) {
  const t = translations[lang] || translations.en;
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
      <div className="glass-panel" style={{ padding: '48px 36px', borderRadius: '24px' }}>
        <div className="brand-icon" style={{ width: '64px', height: '64px', margin: '0 auto 20px auto', borderRadius: '16px' }}>
          <Sparkles size={32} />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '12px' }}>
          {t.welcomeTitle}
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 36px auto', lineHeight: '1.6' }}>
          {t.welcomeSubtitle}
        </p>

        {/* Action Button */}
        <button 
          className="btn btn-primary" 
          style={{ fontSize: '1.1rem', padding: '14px 28px', borderRadius: '12px', marginBottom: '40px' }}
          onClick={() => setShowModal(true)}
        >
          <UploadCloud size={22} />
          <span>{t.uploadCollectionBtn}</span>
          <ArrowRight size={18} />
        </button>

        {/* Step by step guide */}
        <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.25)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--accent-cyan)' }}>
            {t.howToExport}
          </h3>
          <ol style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li>{t.step1}</li>
            <li>{t.step2}</li>
            <li>{t.step3}</li>
            <li>{t.step4}</li>
          </ol>
        </div>
      </div>

      {showModal && (
        <UploadModal 
          onClose={() => setShowModal(false)}
          onUploadSuccess={onUploadSuccess}
          lang={lang}
        />
      )}
    </div>
  );
}
