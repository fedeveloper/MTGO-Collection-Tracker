import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CUSTOM_LINKS_FILE = path.join(DATA_DIR, 'custom_links.json');
const CARD_PURCHASES_FILE = path.join(DATA_DIR, 'card_purchases.json');
const SALES_HISTORY_FILE = path.join(DATA_DIR, 'sales_history.json');
const MANUAL_CARDS_FILE = path.join(DATA_DIR, 'manual_cards.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Safely write JSON data to file using atomic tmp-file rename to prevent corrupted 0-byte files
 * @param {string} filePath 
 * @param {object} data 
 */
function writeJsonAtomic(filePath, data) {
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
  jsonCache.delete(filePath);
}

// Parsed JSON files keyed by path, revalidated by mtime/size so manual edits on disk are still picked up.
// Cached values are shared: callers must copy before mutating and persist via writeJsonAtomic.
const jsonCache = new Map();

/**
 * Read and parse a JSON file through the in-memory cache
 * @param {string} filePath 
 * @param {*} fallback Returned when the file is missing or invalid
 */
function readJsonCached(filePath, fallback) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    jsonCache.delete(filePath);
    return fallback;
  }
  const cached = jsonCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.value;
  }
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    jsonCache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, value });
    return value;
  } catch {
    return fallback;
  }
}

const PRICE_SOURCES = ['scryfall', 'goatbots'];

const DEFAULT_SETTINGS = {
  scheduleIntervalMinutes: 60,
  autoSyncEnabled: true,
  priceSource: 'scryfall',
  language: 'en',
  timeframe: 'time_zero', // 'time_zero' (default) | 'last_check'
  lastSyncTime: null,
  nextSyncTime: null
};

export function getSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    saveSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }
  const settings = { ...DEFAULT_SETTINGS, ...readJsonCached(SETTINGS_FILE, {}) };
  // Retired sources (e.g. the old 'cardhoarder' estimate) fall back to Scryfall
  if (!PRICE_SOURCES.includes(settings.priceSource)) {
    settings.priceSource = DEFAULT_SETTINGS.priceSource;
  }
  return settings;
}

export function saveSettings(settings) {
  writeJsonAtomic(SETTINGS_FILE, settings);
}

export function getCustomLinks() {
  return readJsonCached(CUSTOM_LINKS_FILE, {});
}

export function setCustomLink(catId, scryfallUrl) {
  const links = { ...getCustomLinks() };
  if (scryfallUrl && scryfallUrl.trim().length > 0) {
    links[String(catId)] = scryfallUrl.trim();
  } else {
    delete links[String(catId)];
  }
  writeJsonAtomic(CUSTOM_LINKS_FILE, links);
  return links;
}

// --- Card Purchase Prices ---
export function getPurchases() {
  return readJsonCached(CARD_PURCHASES_FILE, {});
}

export function savePurchase(catId, purchasePriceTix) {
  const purchases = { ...getPurchases() };
  const catKey = String(catId);
  if (purchasePriceTix !== null && purchasePriceTix !== undefined && purchasePriceTix !== '' && !isNaN(parseFloat(purchasePriceTix))) {
    purchases[catKey] = {
      purchasePriceTix: parseFloat(purchasePriceTix),
      updatedAt: new Date().toISOString()
    };
  } else {
    delete purchases[catKey];
  }
  writeJsonAtomic(CARD_PURCHASES_FILE, purchases);
  return purchases;
}

// --- Sales History ---
export function getSalesHistory() {
  return readJsonCached(SALES_HISTORY_FILE, []);
}

export function recordSale({ catId, name, set, quantity, purchasePriceTix = 0, salePriceTix = 0, imageUri = '' }) {
  const sales = getSalesHistory();
  const q = Math.max(1, parseInt(quantity) || 1);
  const pPrice = parseFloat(purchasePriceTix) || 0;
  const sPrice = parseFloat(salePriceTix) || 0;
  const realizedPnlTix = Math.round((sPrice - pPrice) * q * 100) / 100;

  const saleRecord = {
    id: `sale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    catId: parseInt(catId),
    name: name || 'MTG Card',
    set: set || 'MTG',
    quantity: q,
    purchasePriceTix: pPrice,
    salePriceTix: sPrice,
    realizedPnlTix,
    imageUri,
    saleDate: new Date().toISOString()
  };

  const updatedSales = [saleRecord, ...sales];
  writeJsonAtomic(SALES_HISTORY_FILE, updatedSales);
  return updatedSales;
}

export function undoSale(saleId) {
  const sales = getSalesHistory();
  const filtered = sales.filter((s) => s.id !== saleId);
  writeJsonAtomic(SALES_HISTORY_FILE, filtered);
  return filtered;
}

// --- Manual Cards ---
export function getManualCards() {
  return readJsonCached(MANUAL_CARDS_FILE, []);
}

export function addManualCard({ catId, name, quantity = 1, purchasePriceTix = null }) {
  const manual = [...getManualCards()];
  const existingIdx = manual.findIndex((c) => String(c.catId) === String(catId));
  const parsedCatId = parseInt(catId);
  const cardObj = {
    catId: parsedCatId,
    name: name.trim(),
    quantity: Math.max(1, parseInt(quantity) || 1),
    purchasePriceTix: purchasePriceTix !== null && !isNaN(parseFloat(purchasePriceTix)) ? parseFloat(purchasePriceTix) : null,
    isManual: true,
    addedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    manual[existingIdx] = cardObj;
  } else {
    manual.push(cardObj);
  }

  if (purchasePriceTix !== null && !isNaN(parseFloat(purchasePriceTix))) {
    savePurchase(parsedCatId, purchasePriceTix);
  }

  writeJsonAtomic(MANUAL_CARDS_FILE, manual);
  return manual;
}

export function deleteManualCard(catId) {
  const manual = getManualCards();
  const filtered = manual.filter((c) => String(c.catId) !== String(catId));
  writeJsonAtomic(MANUAL_CARDS_FILE, filtered);
  return filtered;
}

export function getHistory(priceSource) {
  const allHistory = readJsonCached(HISTORY_FILE, []);
  if (priceSource) {
    return allHistory.filter((s) => s.priceSource === priceSource || (!s.priceSource && priceSource === 'scryfall'));
  }
  return allHistory;
}

export function clearHistory() {
  writeJsonAtomic(HISTORY_FILE, []);
  return [];
}

export function addSnapshot(cardsWithPrices, priceSource = 'scryfall') {
  const allHistory = getHistory();
  const timestamp = new Date().toISOString();

  let totalValueTix = 0;
  const cardPrices = {};

  cardsWithPrices.forEach((c) => {
    const cardVal = (c.priceTix || 0) * c.quantity;
    totalValueTix += cardVal;
    cardPrices[c.catId] = c.priceTix || 0;
  });

  const newSnapshot = {
    timestamp,
    priceSource,
    totalValueTix: Math.round(totalValueTix * 100) / 100,
    cardPrices
  };

  const maxHistory = 500;
  const trimmedHistory = [...allHistory, newSnapshot].slice(-maxHistory);

  writeJsonAtomic(HISTORY_FILE, trimmedHistory);
  return newSnapshot;
}

export function deleteSnapshot(timestamp) {
  const allHistory = getHistory();
  const filtered = allHistory.filter((s) => s.timestamp !== timestamp);
  writeJsonAtomic(HISTORY_FILE, filtered);
  return filtered;
}

/**
 * Calculate price movements and trading signals comparing current prices to baseline or last check
 * @param {Array<object>} cards Current cards list with prices
 * @param {string} priceSource Current price source
 * @param {string} timeframe - 'time_zero' (Time 0 / Initial snapshot) | 'last_check' (Previous snapshot)
 * @returns {{ cards: Array<object>, summary: object, salesHistory: Array<object> }} Cards enriched with movements & decision signals + summary
 */
export function calculateMovements(cards, priceSource = 'scryfall', timeframe = 'time_zero') {
  const sourceHistory = getHistory(priceSource);
  const purchases = getPurchases();
  const sales = getSalesHistory();

  // Sum total sold quantity per catId
  const soldQuantities = {};
  sales.forEach((s) => {
    const k = String(s.catId);
    soldQuantities[k] = (soldQuantities[k] || 0) + (s.quantity || 1);
  });

  // Determine reference snapshot based on timeframe
  let referenceSnapshot = null;
  let timeZeroSnapshot = sourceHistory.length > 0 ? sourceHistory[0] : null;

  if (sourceHistory.length > 0) {
    if (timeframe === 'time_zero') {
      referenceSnapshot = timeZeroSnapshot;
    } else if (timeframe === 'last_check') {
      referenceSnapshot = sourceHistory.length > 1 ? sourceHistory[sourceHistory.length - 2] : sourceHistory[0];
    }
  }

  const refPrices = referenceSnapshot?.cardPrices || {};
  const timeZeroPrices = timeZeroSnapshot?.cardPrices || {};

  // Build map of peak (All-Time High) prices for each card across history
  const peakPrices = {};
  sourceHistory.forEach((snap) => {
    if (snap.cardPrices) {
      Object.entries(snap.cardPrices).forEach(([catId, price]) => {
        if (peakPrices[catId] === undefined || price > peakPrices[catId]) {
          peakPrices[catId] = price;
        }
      });
    }
  });

  let initialPortfolioValue = 0;
  let currentPortfolioValue = 0;
  let totalPurchaseCostTix = 0;
  let totalPurchasedCardsValue = 0;

  const activeCards = [];

  cards.forEach((card) => {
    const catKey = String(card.catId);
    const totalQty = card.quantity || 1;
    const soldQty = soldQuantities[catKey] || 0;
    const activeQty = Math.max(0, totalQty - soldQty);

    if (activeQty <= 0) return; // Completely sold out, excluded from active portfolio

    const savedPurchase = purchases[catKey]?.purchasePriceTix;
    const purchasePriceTix = savedPurchase !== undefined ? savedPurchase : null;

    const currPrice = card.priceTix || 0;
    const timeZeroPrice = timeZeroPrices[card.catId] !== undefined ? timeZeroPrices[card.catId] : currPrice;
    const peakPrice = peakPrices[card.catId] !== undefined ? peakPrices[card.catId] : currPrice;

    // Calculate P&L vs Purchase Price (if purchase price is set)
    let purchaseDeltaTix = null;
    let purchaseDeltaPercent = null;
    if (purchasePriceTix !== null) {
      purchaseDeltaTix = Math.round((currPrice - purchasePriceTix) * 100) / 100;
      if (purchasePriceTix > 0) {
        purchaseDeltaPercent = Math.round(((currPrice - purchasePriceTix) / purchasePriceTix) * 1000) / 10;
      } else if (currPrice > 0) {
        purchaseDeltaPercent = 100;
      }
      totalPurchaseCostTix += purchasePriceTix * activeQty;
      totalPurchasedCardsValue += currPrice * activeQty;
    }

    // Determine reference price based on timeframe ('time_zero' | 'last_check' | 'purchase_price')
    let refPrice = currPrice;
    if (timeframe === 'purchase_price' && purchasePriceTix !== null) {
      refPrice = purchasePriceTix;
    } else if (timeframe === 'last_check') {
      refPrice = refPrices[card.catId] !== undefined ? refPrices[card.catId] : currPrice;
    } else {
      refPrice = timeZeroPrice;
    }

    initialPortfolioValue += timeZeroPrice * activeQty;
    currentPortfolioValue += currPrice * activeQty;

    const deltaTix = Math.round((currPrice - refPrice) * 100) / 100;
    let deltaPercent = 0;
    if (refPrice > 0) {
      deltaPercent = Math.round(((currPrice - refPrice) / refPrice) * 1000) / 10;
    } else if (currPrice > 0) {
      deltaPercent = 100;
    }

    const timeZeroDeltaTix = Math.round((currPrice - timeZeroPrice) * 100) / 100;
    let timeZeroDeltaPercent = 0;
    if (timeZeroPrice > 0) {
      timeZeroDeltaPercent = Math.round(((currPrice - timeZeroPrice) / timeZeroPrice) * 1000) / 10;
    } else if (currPrice > 0) {
      timeZeroDeltaPercent = 100;
    }

    let trend = 'stable';
    if (deltaTix > 0.001) trend = 'up';
    else if (deltaTix < -0.001) trend = 'down';

    // --- Trading Decision Signals ---
    let signal = 'neutral';
    if (timeZeroDeltaPercent >= 35 || (timeZeroDeltaTix >= 0.75 && timeZeroDeltaPercent >= 20)) {
      signal = 'take_profit';
    } else if (currPrice > 0 && peakPrice > 0 && currPrice >= peakPrice * 0.95 && timeZeroDeltaPercent > 10) {
      signal = 'near_peak';
    } else if (timeZeroDeltaPercent <= -30) {
      signal = 'stop_loss';
    }

    activeCards.push({
      ...card,
      quantity: activeQty,
      totalValue: Math.round(currPrice * activeQty * 100) / 100,
      originalQuantity: totalQty,
      soldQuantity: soldQty,
      purchasePriceTix,
      purchaseDeltaTix,
      purchaseDeltaPercent,
      hasPurchasePrice: purchasePriceTix !== null,
      previousPriceTix: refPrice,
      timeZeroPrice,
      peakPrice,
      deltaTix,
      deltaPercent,
      timeZeroDeltaTix,
      timeZeroDeltaPercent,
      trend,
      signal
    });
  });

  // Calculate Realized P&L summary
  let totalRealizedPnlTix = 0;
  let totalRealizedSalesTix = 0;
  let totalRealizedCostTix = 0;
  sales.forEach((s) => {
    totalRealizedPnlTix += s.realizedPnlTix || 0;
    totalRealizedSalesTix += (s.salePriceTix || 0) * (s.quantity || 1);
    totalRealizedCostTix += (s.purchasePriceTix || 0) * (s.quantity || 1);
  });

  totalRealizedPnlTix = Math.round(totalRealizedPnlTix * 100) / 100;
  totalRealizedSalesTix = Math.round(totalRealizedSalesTix * 100) / 100;
  totalRealizedCostTix = Math.round(totalRealizedCostTix * 100) / 100;
  totalPurchaseCostTix = Math.round(totalPurchaseCostTix * 100) / 100;
  totalPurchasedCardsValue = Math.round(totalPurchasedCardsValue * 100) / 100;

  const unrealizedPnlOnCostTix = Math.round((totalPurchasedCardsValue - totalPurchaseCostTix) * 100) / 100;
  let unrealizedPnlOnCostPercent = 0;
  if (totalPurchaseCostTix > 0) {
    unrealizedPnlOnCostPercent = Math.round(((totalPurchasedCardsValue - totalPurchaseCostTix) / totalPurchaseCostTix) * 1000) / 10;
  }

  const netProfitTix = Math.round((currentPortfolioValue - initialPortfolioValue) * 100) / 100;
  let netProfitPercent = 0;
  if (initialPortfolioValue > 0) {
    netProfitPercent = Math.round(((currentPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 1000) / 10;
  }

  const summary = {
    timeframe,
    initialPortfolioValue: Math.round(initialPortfolioValue * 100) / 100,
    currentPortfolioValue: Math.round(currentPortfolioValue * 100) / 100,
    netProfitTix,
    netProfitPercent,
    totalPurchaseCostTix,
    totalPurchasedCardsValue,
    unrealizedPnlOnCostTix,
    unrealizedPnlOnCostPercent,
    totalRealizedPnlTix,
    totalRealizedSalesTix,
    totalRealizedCostTix,
    totalSalesCount: sales.length,
    timeZeroTimestamp: timeZeroSnapshot?.timestamp || null,
    totalSnapshots: sourceHistory.length
  };

  return { cards: activeCards, summary, salesHistory: sales };
}
