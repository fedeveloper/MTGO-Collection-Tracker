import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { parseDekFile, parseDekContent } from './services/dekParser.js';
import { fetchCollectionPrices } from './services/priceFetcher.js';
import { getSettings, saveSettings, getHistory, addSnapshot, calculateMovements } from './services/storage.js';

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
let isSyncing = false;
let syncProgress = { current: 0, total: 0, status: 'idle' };
let syncIntervalTimer = null;

/**
 * Perform a full price check and update snapshots according to the selected priceSource
 */
async function performPriceSync() {
  const activeDek = getActiveDekPath();
  if (!activeDek) {
    console.log('[Sync] No Collection.dek file found. Waiting for upload.');
    cachedEnrichedCards = [];
    return [];
  }

  if (isSyncing) {
    console.log('[Sync] Price sync already in progress. Skipping...');
    return cachedEnrichedCards;
  }

  try {
    isSyncing = true;
    syncProgress = { current: 0, total: 0, status: 'starting' };
    const settings = getSettings();
    const priceSource = settings.priceSource || 'scryfall';

    console.log(`[Sync] Starting MTGO collection price sync from ${activeDek} using source [${priceSource}]...`);

    const parsedCards = parseDekFile(activeDek);
    if (parsedCards.length === 0) {
      console.log('[Sync] Collection file is empty or invalid.');
      cachedEnrichedCards = [];
      return [];
    }

    syncProgress.total = parsedCards.length;
    syncProgress.status = 'fetching_prices';

    // Fetch prices for selected source (Scryfall vs GoatBots vs Cardhoarder)
    const priceMap = await fetchCollectionPrices(parsedCards, priceSource);

    // Merge parsed cards with fetched details
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

    // Add snapshot tagged with priceSource
    addSnapshot(merged, priceSource);

    // Calculate price movements compared to previous snapshots of the SAME source
    cachedEnrichedCards = calculateMovements(merged, priceSource);

    const now = new Date();
    const nextSync = new Date(now.getTime() + (settings.scheduleIntervalMinutes || 60) * 60 * 1000);
    
    settings.lastSyncTime = now.toISOString();
    settings.nextSyncTime = nextSync.toISOString();
    saveSettings(settings);

    syncProgress = { current: parsedCards.length, total: parsedCards.length, status: 'completed' };
    console.log(`[Sync] Price sync finished successfully for ${merged.length} MTGO cards using [${priceSource}].`);
    return cachedEnrichedCards;
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

// GET /api/collection
app.get('/api/collection', async (req, res) => {
  try {
    const dekPath = getActiveDekPath();
    const hasCollection = !!dekPath;
    const settings = getSettings();
    const currentSource = settings.priceSource || 'scryfall';

    if (hasCollection && cachedEnrichedCards.length === 0 && !isSyncing) {
      await performPriceSync();
    } else if (hasCollection && cachedEnrichedCards.length > 0) {
      cachedEnrichedCards = calculateMovements(cachedEnrichedCards, currentSource);
    }

    res.json({
      hasCollection,
      cards: cachedEnrichedCards,
      isSyncing,
      syncProgress
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload-dek
app.post('/api/upload-dek', async (req, res) => {
  try {
    const { xmlContent, filename } = req.body;
    if (!xmlContent || typeof xmlContent !== 'string') {
      return res.status(400).json({ error: 'Nessun contenuto XML valido fornito.' });
    }

    const parsed = parseDekContent(xmlContent);
    if (parsed.length === 0) {
      return res.status(400).json({ error: 'Il file caricato non contiene carte MTGO nel formato <Cards CatID="..." />.' });
    }

    fs.writeFileSync(DATA_DEK, xmlContent, 'utf-8');
    console.log(`[Upload] New MTGO collection file uploaded: ${filename || 'Collection.dek'} (${parsed.length} cards).`);

    cachedEnrichedCards = [];
    const cards = await performPriceSync();

    res.json({
      success: true,
      cardCount: parsed.length,
      cards
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/csv
app.get('/api/export/csv', (req, res) => {
  try {
    if (cachedEnrichedCards.length === 0) {
      return res.status(400).send('Nessuna carta presente nella collezione.');
    }

    const headers = ['CatID', 'Nome', 'Set', 'Rarita', 'Quantita', 'Fonte Prezzo', 'Prezzo TIX', 'Valore Totale TIX', 'Variazione %', 'Trend'];
    const rows = cachedEnrichedCards.map((c) => [
      c.catId,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.set || ''}"`,
      `"${c.rarity || ''}"`,
      c.quantity || 1,
      `"${c.priceSource || 'scryfall'}"`,
      (c.priceTix || 0).toFixed(2),
      ((c.priceTix || 0) * (c.quantity || 1)).toFixed(2),
      `${(c.deltaPercent || 0)}%`,
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

// POST /api/sync
app.post('/api/sync', async (req, res) => {
  try {
    const cards = await performPriceSync();
    res.json({ success: true, cards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history
app.get('/api/history', (req, res) => {
  const settings = getSettings();
  const source = req.query.source || settings.priceSource || 'scryfall';
  res.json(getHistory(source));
});

// GET /api/settings
app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

// POST /api/settings
app.post('/api/settings', async (req, res) => {
  try {
    const current = getSettings();
    const sourceChanged = req.body.priceSource && req.body.priceSource !== current.priceSource;
    const updated = { ...current, ...req.body };
    
    saveSettings(updated);
    setupScheduler();

    let cards = cachedEnrichedCards;
    if (sourceChanged) {
      console.log(`[Settings] Price source changed to [${updated.priceSource}]. Triggering sync...`);
      cards = await performPriceSync();
    }

    res.json({ success: true, settings: updated, cards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Vite frontend in production if built
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`[MTGO Tracker Backend] Running on http://localhost:${PORT}`);
  setupScheduler();
  if (getActiveDekPath()) {
    performPriceSync().catch((err) => console.error('[Initial Sync Error]', err));
  }
});
