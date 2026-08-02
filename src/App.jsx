import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { PortfolioChart } from './components/PortfolioChart';
import { CardGridTable } from './components/CardGridTable';
import { CardDetailModal } from './components/CardDetailModal';
import { SchedulerModal } from './components/SchedulerModal';
import { UploadModal } from './components/UploadModal';
import { OnboardingView } from './components/OnboardingView';
import { translations } from './i18n/translations';

export function App() {
  const [cards, setCards] = useState([]);
  const [hasCollection, setHasCollection] = useState(true);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedCard, setSelectedCard] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const currentLang = settings?.language || 'en';
  const currentSource = settings?.priceSource || 'scryfall';
  const t = translations[currentLang] || translations.en;

  const fetchData = async () => {
    try {
      const setRes = await axios.get('/api/settings');
      const currentSettings = setRes.data || {};
      setSettings(currentSettings);

      const sourceParam = currentSettings.priceSource || 'scryfall';
      const [colRes, histRes] = await Promise.all([
        axios.get('/api/collection'),
        axios.get(`/api/history?source=${sourceParam}`)
      ]);

      setHasCollection(colRes.data.hasCollection ?? true);
      setCards(colRes.data.cards || []);
      setIsSyncing(colRes.data.isSyncing || false);
      setHistory(histRes.data || []);
    } catch (err) {
      console.error('Error fetching collection data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await axios.post('/api/sync');
      if (res.data && res.data.cards) {
        setCards(res.data.cards);
        const [histRes, setRes] = await Promise.all([
          axios.get(`/api/history?source=${currentSource}`),
          axios.get('/api/settings')
        ]);
        setHistory(histRes.data || []);
        setSettings(setRes.data || {});
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await axios.post('/api/settings', newSettings);
      if (res.data && res.data.settings) {
        setSettings(res.data.settings);
        if (res.data.cards) setCards(res.data.cards);

        const newSource = res.data.settings.priceSource || 'scryfall';
        const histRes = await axios.get(`/api/history?source=${newSource}`);
        setHistory(histRes.data || []);
      }
    } catch (err) {
      console.error('Save settings failed:', err);
    }
  };

  const handleToggleLang = (newLang) => {
    handleSaveSettings({ ...settings, language: newLang });
  };

  const handleDeleteSnapshot = async (timestamp) => {
    try {
      const res = await axios.delete('/api/history', { data: { timestamp } });
      if (res.data) {
        if (res.data.history) setHistory(res.data.history);
        if (res.data.cards) setCards(res.data.cards);
      }
    } catch (err) {
      console.error('Delete snapshot failed:', err);
    }
  };

  const handleUploadSuccess = async (xmlContent, filename) => {
    setIsSyncing(true);
    try {
      const res = await axios.post('/api/upload-dek', { xmlContent, filename });
      if (res.data && res.data.cards) {
        setCards(res.data.cards);
        setHasCollection(true);
        const [histRes, setRes] = await Promise.all([
          axios.get(`/api/history?source=${currentSource}`),
          axios.get('/api/settings')
        ]);
        setHistory(histRes.data || []);
        setSettings(setRes.data || {});
      }
    } catch (err) {
      console.error('Upload failed:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'white', flexDirection: 'column', gap: '16px' }}>
        <div className="brand-icon spin" style={{ width: '48px', height: '48px' }}>
          ✨
        </div>
        <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>{t.loadingCollection}</p>
      </div>
    );
  }

  if (!hasCollection && cards.length === 0) {
    return <OnboardingView onUploadSuccess={handleUploadSuccess} lang={currentLang} />;
  }

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar 
        lastSyncTime={settings?.lastSyncTime}
        nextSyncTime={settings?.nextSyncTime}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenUpload={() => setShowUploadModal(true)}
        lang={currentLang}
        onToggleLang={handleToggleLang}
      />

      {/* Metric Cards */}
      <DashboardStats cards={cards} lang={currentLang} />

      {/* Portfolio History Line Chart with click-to-delete support */}
      <PortfolioChart 
        history={history} 
        lang={currentLang} 
        priceSource={currentSource} 
        onDeleteSnapshot={handleDeleteSnapshot}
      />

      {/* Cards Table & Grid View with Gainers/Losers Highlights */}
      <CardGridTable 
        cards={cards} 
        onSelectCard={(card) => setSelectedCard(card)}
        lang={currentLang}
      />

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal 
          card={selectedCard} 
          onClose={() => setSelectedCard(null)} 
          lang={currentLang}
        />
      )}

      {/* Settings & Scheduler Modal */}
      {showSettingsModal && (
        <SchedulerModal 
          settings={settings} 
          onClose={() => setShowSettingsModal(false)}
          onSaveSettings={handleSaveSettings}
          lang={currentLang}
        />
      )}

      {/* Upload .dek Modal */}
      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
          lang={currentLang}
        />
      )}
    </div>
  );
}
