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

/**
 * Get custom Scryfall links overrides map (catId -> scryfallUrl)
 */
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

/**
 * Save custom Scryfall link for a CatID
 * @param {number|string} catId 
 * @param {string} scryfallUrl 
 */
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

/**
 * Read history snapshots
 */
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

/**
 * Save a new price snapshot into history
 */
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

/**
 * Delete a snapshot by timestamp
 */
export function deleteSnapshot(timestamp) {
  const allHistory = getHistory();
  const filtered = allHistory.filter((s) => s.timestamp !== timestamp);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return filtered;
}

/**
 * Calculate price movements comparing current prices to previous snapshots of THE SAME price source
 */
export function calculateMovements(cards, priceSource = 'scryfall') {
  const sourceHistory = getHistory(priceSource);

  if (sourceHistory.length <= 1) {
    return cards.map((card) => ({
      ...card,
      previousPriceTix: card.priceTix,
      deltaTix: 0,
      deltaPercent: 0,
      trend: 'stable'
    }));
  }

  const prevSnapshot = sourceHistory[sourceHistory.length - 2];
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
