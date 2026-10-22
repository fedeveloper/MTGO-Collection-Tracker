import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar } from './components/Navbar';
import { Overview } from './components/Overview';
import { SignalsStrip } from './components/SignalsStrip';
import { Holdings } from './components/Holdings';
import { CardDetailModal } from './components/CardDetailModal';
import { SchedulerModal } from './components/SchedulerModal';
import { UploadModal } from './components/UploadModal';
import { AddCardModal } from './components/AddCardModal';
import { OnboardingView } from './components/OnboardingView';
import { makeT } from './i18n/useT';

const SYNCING_POLL_MS = 5000;
const IDLE_POLL_MS = 60000;

export function App() {
  const [cards, setCards] = useState([]);
  const [summary, setSummary] = useState({});
  const [salesHistory, setSalesHistory] = useState([]);
  const [hasCollection, setHasCollection] = useState(true);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedCard, setSelectedCard] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [valueFilterEnabled, setValueFilterEnabled] = useState(false);

  const currentLang = settings?.language || 'en';
  const currentSource = settings?.priceSource || 'scryfall';
  const currentTimeframe = settings?.timeframe || 'time_zero';
  const t = makeT(currentLang);

  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

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
      setSalesHistory(colRes.data.salesHistory || []);
      setIsSyncing(colRes.data.isSyncing || false);
      setHistory(histRes.data || []);
      return !!colRes.data.isSyncing;
    } catch (err) {
      console.error('Error fetching collection data:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Poll quickly only while the server is syncing; otherwise a slow poll picks up scheduled syncs.
  // Polling pauses while the tab is hidden and refreshes as soon as it becomes visible again.
  useEffect(() => {
    let timer = null;
    let cancelled = false;
    let inFlight = false;

    const poll = async () => {
      if (inFlight) return;
      clearTimeout(timer);
      if (document.hidden) return;
      inFlight = true;
      const serverSyncing = await fetchData();
      inFlight = false;
      if (!cancelled) {
        timer = setTimeout(poll, serverSyncing ? SYNCING_POLL_MS : IDLE_POLL_MS);
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) poll();
    };

    poll();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await axios.post('/api/sync');
      if (res.data && res.data.cards) {
        setCards(res.data.cards);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.salesHistory) setSalesHistory(res.data.salesHistory);
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
        if (res.data.salesHistory) setSalesHistory(res.data.salesHistory);

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

  const handleSavePurchase = async (catId, purchasePriceTix) => {
    try {
      const res = await axios.post('/api/card/purchase', { catId, purchasePriceTix });
      if (res.data && res.data.cards) {
        setCards(res.data.cards);
        if (res.data.summary) setSummary(res.data.summary);
        const updated = res.data.cards.find((c) => c.catId === catId);
        if (updated) setSelectedCard(updated);
      }
    } catch (err) {
      console.error('Save purchase price failed:', err);
    }
  };

  const handleRecordSale = async (saleData) => {
    try {
      const res = await axios.post('/api/card/sell', saleData);
      if (res.data) {
        if (res.data.cards) setCards(res.data.cards);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.salesHistory) setSalesHistory(res.data.salesHistory);
      }
    } catch (err) {
      console.error('Record sale failed:', err);
    }
  };

  const handleUndoSale = async (saleId) => {
    try {
      const res = await axios.delete(`/api/sales/${saleId}`);
      if (res.data) {
        if (res.data.cards) setCards(res.data.cards);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.salesHistory) setSalesHistory(res.data.salesHistory);
      }
    } catch (err) {
      console.error('Undo sale failed:', err);
    }
  };

  const handleAddManualCard = async (cardData) => {
    setIsSyncing(true);
    try {
      const res = await axios.post('/api/card/manual', cardData);
      if (res.data && res.data.cards) {
        setCards(res.data.cards);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.salesHistory) setSalesHistory(res.data.salesHistory);
        setHasCollection(true);
      }
    } catch (err) {
      console.error('Add manual card failed:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUploadSuccess = async (xmlContent, filename) => {
    setIsSyncing(true);
    try {
      const res = await axios.post('/api/upload-dek', { xmlContent, filename });
      if (res.data && res.data.cards) {
        setCards(res.data.cards);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.salesHistory) setSalesHistory(res.data.salesHistory);
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
    return <p className="loading">{t('loading')}</p>;
  }

  if (!hasCollection && cards.length === 0) {
    return <OnboardingView onUploadSuccess={handleUploadSuccess} lang={currentLang} />;
  }

  const valuableCards = valueFilterEnabled ? cards.filter((c) => c.priceTix >= 1) : cards;

  return (
    <>
      <Navbar
        lastSyncTime={settings?.lastSyncTime}
        nextSyncTime={settings?.autoSyncEnabled ? settings?.nextSyncTime : null}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenAddCard={() => setShowAddCardModal(true)}
        lang={currentLang}
        onToggleLang={handleToggleLang}
      />

      <main>
        <Overview
          summary={summary}
          history={history}
          timeframe={currentTimeframe}
          onChangeTimeframe={handleChangeTimeframe}
          onDeleteSnapshot={handleDeleteSnapshot}
          priceSource={currentSource}
          lang={currentLang}
        />

        <SignalsStrip cards={valuableCards} onSelectCard={setSelectedCard} lang={currentLang} />

        <Holdings
          cards={cards}
          salesHistory={salesHistory}
          timeframe={currentTimeframe}
          onSelectCard={setSelectedCard}
          onUndoSale={handleUndoSale}
          lang={currentLang}
          valueFilterEnabled={valueFilterEnabled}
          onToggleValueFilter={setValueFilterEnabled}
        />
      </main>

      {selectedCard && (
        <CardDetailModal
          key={selectedCard.catId}
          card={selectedCard}
          timeframe={currentTimeframe}
          onClose={() => setSelectedCard(null)}
          onSaveCustomLink={handleSaveCustomLink}
          onSavePurchase={handleSavePurchase}
          onRecordSale={handleRecordSale}
          lang={currentLang}
        />
      )}

      {showAddCardModal && (
        <AddCardModal onClose={() => setShowAddCardModal(false)} onAddCard={handleAddManualCard} lang={currentLang} />
      )}

      {showSettingsModal && (
        <SchedulerModal settings={settings} onClose={() => setShowSettingsModal(false)} onSaveSettings={handleSaveSettings} lang={currentLang} />
      )}

      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} onUploadSuccess={handleUploadSuccess} lang={currentLang} />
      )}
    </>
  );
}
