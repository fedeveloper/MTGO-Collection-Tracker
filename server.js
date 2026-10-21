import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { parseDekFile, parseDekContent } from './services/dekParser.js';
import { fetchCollectionPrices } from './services/priceFetcher.js';
import { 
  getSettings, 
  saveSettings, 
  getHistory, 
  addSnapshot, 
  deleteSnapshot, 
  calculateMovements, 
  setCustomLink, 
  clearHistory,
  getPurchases,
  savePurchase,
  getSalesHistory,
  recordSale,
  undoSale,
  getManualCards,
  addManualCard,
  deleteManualCard
} from './services/storage.js';

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

// Merged .dek + manual cards with prices, before sold quantities are applied.
// Always recalculate from this list: cachedEnrichedCards already has sales subtracted.
let cachedRawCards = [];
let cachedEnrichedCards = [];
let cachedSummary = {};
let syncPromise = null;
let syncProgress = { current: 0, total: 0, status: 'idle' };
let syncIntervalTimer = null;

function recalculate(priceSource, timeframe) {
  const result = calculateMovements(cachedRawCards, priceSource || 'scryfall', timeframe || 'time_zero');
  cachedEnrichedCards = result.cards;
  cachedSummary = result.summary;
  return result;
}

async function waitForIdleSync() {
  while (syncPromise) {
    await syncPromise.catch(() => {});
  }
}

/**
 * Run a price sync. Concurrent callers share the sync already in progress; pass force=true
 * when the inputs changed (collection, custom links, price source) so a fresh sync runs after it.
 */
async function performPriceSync({ force = false } = {}) {
  while (syncPromise) {
    if (!force) {
      console.log('[Sync] Price sync already in progress. Waiting for it...');
      return syncPromise;
    }
    await syncPromise.catch(() => {});
  }
  syncPromise = runPriceSync().finally(() => {
    syncPromise = null;
  });
  return syncPromise;
}

async function runPriceSync() {
  const activeDek = getActiveDekPath();
  const manualCards = getManualCards();

  if (!activeDek && manualCards.length === 0) {
    console.log('[Sync] No Collection.dek file or manual cards found. Waiting for upload.');
    cachedRawCards = [];
    cachedEnrichedCards = [];
    cachedSummary = {};
    return { cards: [], summary: {}, salesHistory: getSalesHistory() };
  }

  try {
    syncProgress = { current: 0, total: 0, status: 'starting' };
    const settings = getSettings();
    const priceSource = settings.priceSource || 'scryfall';
    const timeframe = settings.timeframe || 'time_zero';

    console.log(`[Sync] Starting MTGO collection price sync using source [${priceSource}]...`);

    const parsedDek = activeDek ? parseDekFile(activeDek) : [];
    
    // Merge .dek cards with manual cards
    const cardMap = new Map();
    parsedDek.forEach((c) => cardMap.set(c.catId, { ...c }));
    manualCards.forEach((m) => {
      if (cardMap.has(m.catId)) {
        const existing = cardMap.get(m.catId);
        cardMap.set(m.catId, { ...existing, quantity: Math.max(existing.quantity, m.quantity), isManual: true });
      } else {
        cardMap.set(m.catId, { catId: m.catId, name: m.name, quantity: m.quantity, isManual: true });
      }
    });

    const parsedCards = Array.from(cardMap.values());

    if (parsedCards.length === 0) {
      console.log('[Sync] Collection is empty.');
      cachedRawCards = [];
      cachedEnrichedCards = [];
      cachedSummary = {};
      return { cards: [], summary: {}, salesHistory: getSalesHistory() };
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
    cachedRawCards = merged;
    const result = recalculate(priceSource, timeframe);

    // Re-read settings: they may have been changed while prices were being fetched
    const latestSettings = getSettings();
    const now = new Date();
    const nextSync = new Date(now.getTime() + (latestSettings.scheduleIntervalMinutes || 60) * 60 * 1000);
    saveSettings({ ...latestSettings, lastSyncTime: now.toISOString(), nextSyncTime: nextSync.toISOString() });

    syncProgress = { current: parsedCards.length, total: parsedCards.length, status: 'completed' };
    console.log(`[Sync] Price sync finished successfully for ${merged.length} MTGO cards using [${priceSource}].`);
    return result;
  } catch (error) {
    console.error('[Sync Error]', error);
    syncProgress.status = 'error';
    throw error;
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
    const manualCards = getManualCards();
    const hasCollection = !!dekPath || manualCards.length > 0;
    const settings = getSettings();
    const currentSource = settings.priceSource || 'scryfall';
    const reqTimeframe = req.query.timeframe || settings.timeframe || 'time_zero';

    if (hasCollection && cachedRawCards.length === 0 && !syncPromise) {
      await performPriceSync();
    } else if (hasCollection && cachedRawCards.length > 0 && cachedSummary.timeframe !== reqTimeframe) {
      recalculate(currentSource, reqTimeframe);
    }

    res.json({
      hasCollection,
      cards: cachedEnrichedCards,
      summary: cachedSummary,
      salesHistory: getSalesHistory(),
      isSyncing: !!syncPromise,
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

    // Let a running sync finish first, otherwise it would add an old-collection snapshot after the reset
    await waitForIdleSync();

    fs.writeFileSync(DATA_DEK, xmlContent, 'utf-8');
    console.log(`[Upload] New MTGO collection file uploaded: ${filename || 'Collection.dek'} (${parsed.length} cards).`);

    clearHistory();
    cachedRawCards = [];

    const result = await performPriceSync({ force: true });

    res.json({
      success: true,
      cardCount: parsed.length,
      cards: result.cards,
      summary: result.summary,
      salesHistory: getSalesHistory()
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Quote a text value for CSV. Values starting with a formula trigger (= + - @ tab CR) are prefixed
 * with an apostrophe so spreadsheet apps don't execute them. Only for text: numbers are written raw.
 */
function csvText(value) {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

app.get('/api/export/csv', (req, res) => {
  try {
    if (cachedEnrichedCards.length === 0) {
      return res.status(400).send('No cards in the collection.');
    }

    const settings = getSettings();
    const lang = settings.language || 'en';

    const csvHeaders = {
      en: ['CatID', 'Name', 'Set', 'Rarity', 'Quantity', 'Purchase Price TIX', 'Current Price TIX', 'Time 0 Price TIX', 'Peak Price TIX', 'Total Value TIX', 'Unrealized P&L TIX', 'Change %', 'Trading Signal', 'Trend'],
      it: ['CatID', 'Nome', 'Set', 'Rarita', 'Quantita', 'Prezzo Acquisto TIX', 'Prezzo Attuale TIX', 'Prezzo Tempo 0 TIX', 'Prezzo Massimo TIX', 'Valore Totale TIX', 'P&L Non Realizzato TIX', 'Variazione %', 'Segnale Trading', 'Trend']
    };

    const headers = csvHeaders[lang] || csvHeaders.en;
    const rows = cachedEnrichedCards.map((c) => [
      c.catId,
      csvText(c.name),
      csvText(c.set),
      csvText(c.rarity),
      c.quantity || 1,
      c.purchasePriceTix !== null ? c.purchasePriceTix.toFixed(2) : '-',
      (c.priceTix || 0).toFixed(2),
      (c.timeZeroPrice || 0).toFixed(2),
      (c.peakPrice || 0).toFixed(2),
      ((c.priceTix || 0) * (c.quantity || 1)).toFixed(2),
      c.purchaseDeltaTix !== null ? (c.purchaseDeltaTix * c.quantity).toFixed(2) : '-',
      `${(c.deltaPercent || 0)}%`,
      csvText(c.signal || 'neutral'),
      csvText(c.trend || 'stable')
    ]);

    // UTF-8 BOM so Excel detects the encoding (accented headers and card names); CRLF per RFC 4180
    const csvContent = '\uFEFF' + [headers.map(csvText).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

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
    res.json({ success: true, cards: result.cards, summary: result.summary, salesHistory: result.salesHistory });
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
    
    let result = { cards: cachedEnrichedCards, summary: cachedSummary, salesHistory: getSalesHistory() };
    if (cachedRawCards.length > 0) {
      result = recalculate(source, timeframe);
    }
    
    res.json({ success: true, history: getHistory(source), cards: result.cards, summary: result.summary, salesHistory: result.salesHistory });
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

    const result = await performPriceSync({ force: true });
    res.json({ success: true, cards: result.cards, summary: result.summary, salesHistory: result.salesHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- New Endpoints: Purchase Price, Sales, Manual Cards ---

app.post('/api/card/purchase', (req, res) => {
  try {
    const { catId, purchasePriceTix } = req.body;
    if (!catId) {
      return res.status(400).json({ error: 'Missing CatID.' });
    }

    savePurchase(catId, purchasePriceTix);
    const settings = getSettings();
    const result = recalculate(settings.priceSource, settings.timeframe);

    res.json({ success: true, cards: result.cards, summary: result.summary, salesHistory: result.salesHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/card/sell', (req, res) => {
  try {
    const { catId, name, set, quantity, purchasePriceTix, salePriceTix, imageUri } = req.body;
    if (!catId) {
      return res.status(400).json({ error: 'Missing CatID.' });
    }

    const salesHistory = recordSale({ catId, name, set, quantity, purchasePriceTix, salePriceTix, imageUri });
    const settings = getSettings();
    const result = recalculate(settings.priceSource, settings.timeframe);

    res.json({ success: true, cards: result.cards, summary: result.summary, salesHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sales', (req, res) => {
  try {
    res.json({ salesHistory: getSalesHistory() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing Sale ID.' });
    }

    const salesHistory = undoSale(id);
    const settings = getSettings();
    const result = recalculate(settings.priceSource, settings.timeframe);

    res.json({ success: true, cards: result.cards, summary: result.summary, salesHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/card/manual', async (req, res) => {
  try {
    const { catId, name, quantity, purchasePriceTix } = req.body;
    if (!catId || !name) {
      return res.status(400).json({ error: 'Missing CatID or Card Name.' });
    }

    addManualCard({ catId, name, quantity, purchasePriceTix });
    const result = await performPriceSync({ force: true });

    res.json({ success: true, cards: result.cards, summary: result.summary, salesHistory: result.salesHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/card/manual/:catId', async (req, res) => {
  try {
    const { catId } = req.params;
    if (!catId) {
      return res.status(400).json({ error: 'Missing CatID.' });
    }

    deleteManualCard(catId);
    const result = await performPriceSync({ force: true });

    res.json({ success: true, cards: result.cards, summary: result.summary, salesHistory: result.salesHistory });
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
    // Sync timestamps are server-owned; the client echoes back its (possibly stale) copy
    const { lastSyncTime, nextSyncTime, ...changes } = req.body || {};
    const sourceChanged = changes.priceSource && changes.priceSource !== current.priceSource;
    const updated = { ...current, ...changes };
    
    saveSettings(updated);
    setupScheduler();

    let cards = cachedEnrichedCards;
    let summary = cachedSummary;
    let salesHistory = getSalesHistory();
    if (sourceChanged) {
      console.log(`[Settings] Price source changed to [${updated.priceSource}]. Triggering sync...`);
      const result = await performPriceSync({ force: true });
      cards = result.cards;
      summary = result.summary;
      salesHistory = result.salesHistory;
    } else {
      const result = recalculate(updated.priceSource, updated.timeframe);
      cards = result.cards;
      summary = result.summary;
      salesHistory = result.salesHistory;
    }

    res.json({ success: true, settings: updated, cards, summary, salesHistory });
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
  if (getActiveDekPath() || getManualCards().length > 0) {
    performPriceSync().catch((err) => console.error('[Initial Sync Error]', err));
  }
});
