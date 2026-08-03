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
  const [summary, setSummary] = useState({});
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
  const currentTimeframe = settings?.timeframe || 'time_zero';
  const t = translations[currentLang] || translations.en;

  const fetchData = async () => {
    try {
      const setRes = await axios.get('/api/settings');
      const currentSettings = setRes.data || {};
      setSettings(currentSettings);

      const sourceParam = currentSettings.priceSource || 'scryfall';
      const timeframeParam = currentSettings.timeframe || 'time_zero';

      const [colRes, histRes] = await Promise.all([
        axios.get(`/api/collection?timeframe=${timeframeParam}`),
        axios.get(`/api/history?source=${sourceParam}`)
      ]);

      setHasCollection(colRes.data.hasCollection ?? true);
      setCards(colRes.data.cards || []);
      setSummary(colRes.data.summary || {});
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
        if (res.data.summary) setSummary(res.data.summary);
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
        if (res.data.summary) setSummary(res.data.summary);

        const newSource = res.data.settings.priceSource || 'scryfall';
        const histRes = await axios.get(`/api/history?source=${newSource}`);
        setHistory(histRes.data || []);
      }
    } catch (err) {
      console.error('Save settings failed:', err);
    }
  };

  const handleChangeTimeframe = (newTimeframe) => {
    handleSaveSettings({ ...settings, timeframe: newTimeframe });
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
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Delete snapshot failed:', err);
    }
  };

  const handleSaveCustomLink = async (catId, scryfallUrl) => {
    try {
      const res = await axios.post('/api/card/custom-link', { catId, scryfallUrl });
      if (res.data && res.data.cards) {
        setCards(res.data.cards);
        if (res.data.summary) setSummary(res.data.summary);
        const updated = res.data.cards.find((c) => c.catId === catId);
        if (updated) setSelectedCard(updated);
      }
    } catch (err) {
      console.error('Save custom link failed:', err);
    }
  };

  const handleUploadSuccess = async (xmlContent, filename) => {
    setIsSyncing(true);
    try {
      const res = await axios.post('/api/upload-dek', { xmlContent, filename });
      if (res.data && res.data.cards) {
        setCards(res.data.cards);
        if (res.data.summary) setSummary(res.data.summary);
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

      {/* Metric Cards & P&L Summary */}
      <DashboardStats cards={cards} summary={summary} lang={currentLang} />

      {/* Portfolio History Line Chart */}
      <PortfolioChart 
        history={history} 
        lang={currentLang} 
        priceSource={currentSource} 
        onDeleteSnapshot={handleDeleteSnapshot}
      />

      {/* Cards Table & Grid View with Timeframe selector & Trading Signals */}
      <CardGridTable 
        cards={cards} 
        onSelectCard={(card) => setSelectedCard(card)}
        timeframe={currentTimeframe}
        onChangeTimeframe={handleChangeTimeframe}
        lang={currentLang}
      />

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal 
          card={selectedCard} 
          onClose={() => setSelectedCard(null)} 
          onSaveCustomLink={handleSaveCustomLink}
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
