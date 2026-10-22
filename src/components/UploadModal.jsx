import React, { useRef, useState } from 'react';
import { makeT } from '../i18n/useT';
import { Dialog } from './Dialog';

const isDekFile = (file) => /\.(dek|xml)$/i.test(file.name);

export function UploadModal({ onClose, onUploadSuccess, lang = 'en' }) {
  const t = makeT(lang);
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const pick = (candidate) => {
    if (!candidate) return;
    if (!isDekFile(candidate)) {
      setError(t('invalidFile'));
      return;
    }
    setFile(candidate);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      await onUploadSuccess(await file.text(), file.name);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog title={t('uploadTitle')} onClose={onClose} closeLabel={t('close')}>
      <p className="dialog-help">{t('uploadHelp')}</p>

      <label
        className={`dropzone${isDragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
      >
        <input ref={inputRef} type="file" accept=".dek,.xml" className="visually-hidden" onChange={(e) => pick(e.target.files?.[0])} />
        {file ? <strong>{file.name}</strong> : <span>{t('dropzone')}</span>}
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="dialog-actions">
        <button type="button" className="btn btn-outline" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={!file || isUploading}>
          {isUploading ? t('uploading') : t('uploadSubmit')}
        </button>
      </div>
    </Dialog>
  );
}
