import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default settings (English by default)
const DEFAULT_SETTINGS = {
  scheduleIntervalMinutes: 60, // Default 60 minutes
  autoSyncEnabled: true,
  priceSource: 'scryfall', // 'scryfall' | 'goatbots'
  language: 'en', // 'en' (default) | 'it'
  lastSyncTime: null,
  nextSyncTime: null
};

/**
 * Read settings from disk
 */
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

/**
 * Save settings to disk
 */
export function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * Read history snapshots
 */
export function getHistory() {
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save a new price snapshot into history
 */
export function addSnapshot(cardsWithPrices) {
  const history = getHistory();
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
    totalValueTix: Math.round(totalValueTix * 100) / 100,
    cardPrices
  };

  history.push(newSnapshot);

  // Keep up to 500 recent snapshots
  const maxHistory = 500;
  const trimmedHistory = history.slice(-maxHistory);

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmedHistory, null, 2), 'utf-8');
  return newSnapshot;
}

/**
 * Calculate price movements comparing current prices to previous snapshots
 */
export function calculateMovements(cards) {
  const history = getHistory();

  if (history.length <= 1) {
    return cards.map((card) => ({
      ...card,
      previousPriceTix: card.priceTix,
      deltaTix: 0,
      deltaPercent: 0,
      trend: 'stable'
    }));
  }

  const prevSnapshot = history[history.length - 2];
  const prevPrices = prevSnapshot.cardPrices || {};

  return cards.map((card) => {
    const currPrice = card.priceTix || 0;
    const prevPrice = prevPrices[card.catId] !== undefined ? prevPrices[card.catId] : currPrice;

    const deltaTix = Math.round((currPrice - prevPrice) * 100) / 100;
    
    let deltaPercent = 0;
    if (prevPrice > 0) {
      deltaPercent = Math.round(((currPrice - prevPrice) / prevPrice) * 1000) / 10;
    } else if (currPrice > 0) {
      deltaPercent = 100;
    }

    let trend = 'stable';
    if (deltaTix > 0.001) trend = 'up';
    else if (deltaTix < -0.001) trend = 'down';

    return {
      ...card,
      previousPriceTix: prevPrice,
      deltaTix,
      deltaPercent,
      trend
    };
  });
}
