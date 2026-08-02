import React, { useState } from 'react';
import { X, UploadCloud, FileText, AlertCircle } from 'lucide-react';
import { translations } from '../i18n/translations';

export function UploadModal({ onClose, onUploadSuccess, lang = 'en' }) {
  const t = translations[lang] || translations.en;

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile.name.endsWith('.dek') && !droppedFile.name.endsWith('.xml')) {
        setError(t.invalidFileError);
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const text = await file.text();
      await onUploadSuccess(text, file.name);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error uploading file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '50px', height: '50px', background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <UploadCloud size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{t.uploadTitle}</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t.uploadSubtitle}
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--loser-bg)', border: '1px solid var(--loser-border)', color: 'var(--loser-color)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            background: isDragging ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            padding: '30px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '20px'
          }}
          onClick={() => document.getElementById('dek-file-input').click()}
        >
          <input 
            type="file" 
            id="dek-file-input" 
            accept=".dek,.xml" 
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <FileText size={36} color={file ? 'var(--accent-cyan)' : 'var(--text-muted)'} style={{ marginBottom: '8px' }} />
          
          {file ? (
            <div>
              <p style={{ fontWeight: '700', color: 'white', fontSize: '0.95rem' }}>{file.name}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>{t.dropzoneText}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.supportedFormats}</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
          <button 
            className="btn btn-primary" 
            onClick={handleUpload} 
            disabled={!file || isUploading}
          >
            {isUploading ? t.analyzing : t.uploadButton}
          </button>
        </div>
      </div>
    </div>
  );
}
