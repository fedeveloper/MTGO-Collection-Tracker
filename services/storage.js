import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CUSTOM_LINKS_FILE = path.join(DATA_DIR, 'custom_links.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

export function getCustomLinks() {
  if (!fs.existsSync(CUSTOM_LINKS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(CUSTOM_LINKS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function setCustomLink(catId, scryfallUrl) {
  const links = getCustomLinks();
  if (scryfallUrl && scryfallUrl.trim().length > 0) {
    links[String(catId)] = scryfallUrl.trim();
  } else {
    delete links[String(catId)];
  }
  fs.writeFileSync(CUSTOM_LINKS_FILE, JSON.stringify(links, null, 2), 'utf-8');
  return links;
}

export function getHistory(priceSource) {
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const allHistory = JSON.parse(raw);
    
    if (priceSource) {
      return allHistory.filter((s) => s.priceSource === priceSource || (!s.priceSource && priceSource === 'scryfall'));
    }
    return allHistory;
  } catch {
    return [];
  }
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

  allHistory.push(newSnapshot);

  const maxHistory = 500;
  const trimmedHistory = allHistory.slice(-maxHistory);

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmedHistory, null, 2), 'utf-8');
  return newSnapshot;
}

export function deleteSnapshot(timestamp) {
  const allHistory = getHistory();
  const filtered = allHistory.filter((s) => s.timestamp !== timestamp);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return filtered;
}

/**
 * Calculate price movements and trading signals comparing current prices to baseline or last check
 * @param {Array<object>} cards Current cards list with prices
 * @param {string} priceSource Current price source
 * @param {string} timeframe - 'time_zero' (Time 0 / Initial snapshot) | 'last_check' (Previous snapshot)
 * @returns {{ cards: Array<object>, summary: object }} Cards enriched with movements & decision signals + summary
 */
export function calculateMovements(cards, priceSource = 'scryfall', timeframe = 'time_zero') {
  const sourceHistory = getHistory(priceSource);

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

  const enrichedCards = cards.map((card) => {
    const currPrice = card.priceTix || 0;
    const refPrice = refPrices[card.catId] !== undefined ? refPrices[card.catId] : currPrice;
    const timeZeroPrice = timeZeroPrices[card.catId] !== undefined ? timeZeroPrices[card.catId] : currPrice;
    const peakPrice = peakPrices[card.catId] !== undefined ? peakPrices[card.catId] : currPrice;

    initialPortfolioValue += timeZeroPrice * (card.quantity || 1);
    currentPortfolioValue += currPrice * (card.quantity || 1);

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
    // 1. Take Profit (Vendi): Gain from Time 0 is >= 35% or >= +0.75 TIX net
    // 2. Near Peak (Prezzo Massimo): Within 5% of all-time high
    // 3. Stop Loss / Loss: Loss from Time 0 is <= -30%
    let signal = 'neutral';
    if (timeZeroDeltaPercent >= 35 || (timeZeroDeltaTix >= 0.75 && timeZeroDeltaPercent >= 20)) {
      signal = 'take_profit';
    } else if (currPrice > 0 && peakPrice > 0 && currPrice >= peakPrice * 0.95 && timeZeroDeltaPercent > 10) {
      signal = 'near_peak';
    } else if (timeZeroDeltaPercent <= -30) {
      signal = 'stop_loss';
    }

    return {
      ...card,
      previousPriceTix: refPrice,
      timeZeroPrice,
      peakPrice,
      deltaTix,
      deltaPercent,
      timeZeroDeltaTix,
      timeZeroDeltaPercent,
      trend,
      signal
    };
  });

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
    timeZeroTimestamp: timeZeroSnapshot?.timestamp || null,
    totalSnapshots: sourceHistory.length
  };

  return { cards: enrichedCards, summary };
}
