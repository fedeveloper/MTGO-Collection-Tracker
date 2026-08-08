import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { parseDekFile, parseDekContent } from './services/dekParser.js';
import { fetchCollectionPrices } from './services/priceFetcher.js';
import { getSettings, saveSettings, getHistory, addSnapshot, deleteSnapshot, calculateMovements, setCustomLink, clearHistory } from './services/storage.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ROOT_DEK = path.resolve(process.cwd(), 'Collection.dek');
const DATA_DEK = path.join(DATA_DIR, 'Collection.dek');

function getActiveDekPath() {
  if (fs.existsSync(DATA_DEK)) return DATA_DEK;
  if (fs.existsSync(ROOT_DEK)) return ROOT_DEK;
  return null;
}

let cachedEnrichedCards = [];
let cachedSummary = {};
let isSyncing = false;
let syncProgress = { current: 0, total: 0, status: 'idle' };
let syncIntervalTimer = null;

async function performPriceSync() {
  const activeDek = getActiveDekPath();
  if (!activeDek) {
    console.log('[Sync] No Collection.dek file found. Waiting for upload.');
    cachedEnrichedCards = [];
    cachedSummary = {};
    return { cards: [], summary: {} };
  }

  if (isSyncing) {
    console.log('[Sync] Price sync already in progress. Skipping...');
    return { cards: cachedEnrichedCards, summary: cachedSummary };
  }

  try {
    isSyncing = true;
    syncProgress = { current: 0, total: 0, status: 'starting' };
    const settings = getSettings();
    const priceSource = settings.priceSource || 'scryfall';
    const timeframe = settings.timeframe || 'time_zero';

    console.log(`[Sync] Starting MTGO collection price sync from ${activeDek} using source [${priceSource}]...`);

    const parsedCards = parseDekFile(activeDek);
    if (parsedCards.length === 0) {
      console.log('[Sync] Collection file is empty or invalid.');
      cachedEnrichedCards = [];
      cachedSummary = {};
      return { cards: [], summary: {} };
    }

    syncProgress.total = parsedCards.length;
    syncProgress.status = 'fetching_prices';

    const priceMap = await fetchCollectionPrices(parsedCards, priceSource);

    const merged = parsedCards.map((card) => {
      const details = priceMap.get(card.catId) || {};
      const priceTix = details.priceTix || 0;
      const totalValue = Math.round(priceTix * card.quantity * 100) / 100;

      return {
        ...card,
        ...details,
        priceTix,
        totalValue
      };
    });

    addSnapshot(merged, priceSource);
    const result = calculateMovements(merged, priceSource, timeframe);
    cachedEnrichedCards = result.cards;
    cachedSummary = result.summary;

    const now = new Date();
    const nextSync = new Date(now.getTime() + (settings.scheduleIntervalMinutes || 60) * 60 * 1000);
    
    settings.lastSyncTime = now.toISOString();
    settings.nextSyncTime = nextSync.toISOString();
    saveSettings(settings);

    syncProgress = { current: parsedCards.length, total: parsedCards.length, status: 'completed' };
    console.log(`[Sync] Price sync finished successfully for ${merged.length} MTGO cards using [${priceSource}].`);
    return result;
  } catch (error) {
    console.error('[Sync Error]', error);
    syncProgress.status = 'error';
    throw error;
  } finally {
    isSyncing = false;
  }
}

function setupScheduler() {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
  }

  const settings = getSettings();
  if (settings.autoSyncEnabled && settings.scheduleIntervalMinutes > 0) {
    const intervalMs = settings.scheduleIntervalMinutes * 60 * 1000;
    console.log(`[Scheduler] Active interval set to ${settings.scheduleIntervalMinutes} minutes.`);

    syncIntervalTimer = setInterval(() => {
      console.log('[Scheduler] Triggering scheduled price update...');
      performPriceSync().catch((err) => console.error('[Scheduler Error]', err));
    }, intervalMs);
  } else {
    console.log('[Scheduler] Automatic sync disabled.');
  }
}

// REST API Endpoints

app.get('/api/collection', async (req, res) => {
  try {
    const dekPath = getActiveDekPath();
    const hasCollection = !!dekPath;
    const settings = getSettings();
    const currentSource = settings.priceSource || 'scryfall';
    const reqTimeframe = req.query.timeframe || settings.timeframe || 'time_zero';

    if (hasCollection && cachedEnrichedCards.length === 0 && !isSyncing) {
      const syncResult = await performPriceSync();
      cachedEnrichedCards = syncResult.cards;
      cachedSummary = syncResult.summary;
    } else if (hasCollection && cachedEnrichedCards.length > 0 && cachedSummary.timeframe !== reqTimeframe) {
      // Re-calculate movements only when requested timeframe differs from cached summary
      const result = calculateMovements(cachedEnrichedCards, currentSource, reqTimeframe);
      cachedEnrichedCards = result.cards;
      cachedSummary = result.summary;
    }

    res.json({
      hasCollection,
      cards: cachedEnrichedCards,
      summary: cachedSummary,
      isSyncing,
      syncProgress
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload-dek', async (req, res) => {
  try {
    const { xmlContent, filename } = req.body;
    if (!xmlContent || typeof xmlContent !== 'string') {
      return res.status(400).json({ error: 'No valid XML content provided.' });
    }

    const parsed = parseDekContent(xmlContent);
    if (parsed.length === 0) {
      return res.status(400).json({ error: 'The uploaded file does not contain MTGO cards in <Cards CatID="..." /> format.' });
    }

    // Save newly uploaded collection file
    fs.writeFileSync(DATA_DEK, xmlContent, 'utf-8');
    console.log(`[Upload] New MTGO collection file uploaded: ${filename || 'Collection.dek'} (${parsed.length} cards).`);

    // Reset history baseline so new collection P&L is clean
    clearHistory();
    cachedEnrichedCards = [];
    
    const result = await performPriceSync();

    res.json({
      success: true,
      cardCount: parsed.length,
      cards: result.cards,
      summary: result.summary
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/csv', (req, res) => {
  try {
    if (cachedEnrichedCards.length === 0) {
      return res.status(400).send('No cards in the collection.');
    }

    const settings = getSettings();
    const lang = settings.language || 'en';

    const csvHeaders = {
      en: ['CatID', 'Name', 'Set', 'Rarity', 'Quantity', 'Price TIX', 'Time 0 Price TIX', 'Peak Price TIX', 'Total Value TIX', 'Change %', 'Trading Signal', 'Trend'],
      it: ['CatID', 'Nome', 'Set', 'Rarita', 'Quantita', 'Prezzo TIX', 'Prezzo Tempo 0 TIX', 'Prezzo Massimo TIX', 'Valore Totale TIX', 'Variazione %', 'Segnale Trading', 'Trend']
    };

    const headers = csvHeaders[lang] || csvHeaders.en;
    const rows = cachedEnrichedCards.map((c) => [
      c.catId,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.set || ''}"`,
      `"${c.rarity || ''}"`,
      c.quantity || 1,
      (c.priceTix || 0).toFixed(2),
      (c.timeZeroPrice || 0).toFixed(2),
      (c.peakPrice || 0).toFixed(2),
      ((c.priceTix || 0) * (c.quantity || 1)).toFixed(2),
      `${(c.deltaPercent || 0)}%`,
      `"${c.signal || 'neutral'}"`,
      c.trend || 'stable'
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="MTGO_Collection_Report.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/sync', async (req, res) => {
  try {
    const result = await performPriceSync();
    res.json({ success: true, cards: result.cards, summary: result.summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', (req, res) => {
  const settings = getSettings();
  const source = req.query.source || settings.priceSource || 'scryfall';
  res.json(getHistory(source));
});

app.delete('/api/history', (req, res) => {
  try {
    const { timestamp } = req.body;
    if (!timestamp) {
      return res.status(400).json({ error: 'No timestamp specified.' });
    }
    deleteSnapshot(timestamp);
    const settings = getSettings();
    const source = settings.priceSource || 'scryfall';
    const timeframe = settings.timeframe || 'time_zero';
    
    let result = { cards: cachedEnrichedCards, summary: cachedSummary };
    if (cachedEnrichedCards.length > 0) {
      result = calculateMovements(cachedEnrichedCards, source, timeframe);
      cachedEnrichedCards = result.cards;
      cachedSummary = result.summary;
    }
    
    res.json({ success: true, history: getHistory(source), cards: result.cards, summary: result.summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/card/custom-link', async (req, res) => {
  try {
    const { catId, scryfallUrl } = req.body;
    if (!catId) {
      return res.status(400).json({ error: 'Missing CatID.' });
    }

    setCustomLink(catId, scryfallUrl);
    console.log(`[CustomLink] Set custom Scryfall URL for CatID ${catId}: ${scryfallUrl || 'REMOVED'}`);

    cachedEnrichedCards = [];
    const result = await performPriceSync();
    res.json({ success: true, cards: result.cards, summary: result.summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

app.post('/api/settings', async (req, res) => {
  try {
    const current = getSettings();
    const sourceChanged = req.body.priceSource && req.body.priceSource !== current.priceSource;
    const updated = { ...current, ...req.body };
    
    saveSettings(updated);
    setupScheduler();

    let cards = cachedEnrichedCards;
    let summary = cachedSummary;
    if (sourceChanged) {
      console.log(`[Settings] Price source changed to [${updated.priceSource}]. Triggering sync...`);
      const result = await performPriceSync();
      cards = result.cards;
      summary = result.summary;
    } else {
      const result = calculateMovements(cachedEnrichedCards, updated.priceSource, updated.timeframe);
      cards = result.cards;
      summary = result.summary;
      cachedEnrichedCards = cards;
      cachedSummary = summary;
    }

    res.json({ success: true, settings: updated, cards, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[MTGO Tracker Backend] Running on http://localhost:${PORT}`);
  setupScheduler();
  if (getActiveDekPath()) {
    performPriceSync().catch((err) => console.error('[Initial Sync Error]', err));
  }
});
