import axios from 'axios';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { getCustomLinks } from './storage.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const GOATBOTS_ZIP = path.join(DATA_DIR, 'price-history.zip');
const GOATBOTS_CACHE_JSON = path.join(DATA_DIR, 'goatbots_prices_cache.json');
const GOATBOTS_META_JSON = path.join(DATA_DIR, 'goatbots_meta.json');

// Local cache for card metadata (images, sets, mana costs, prices) to prevent redundant lookups
const cardMetadataCache = new Map();

/**
 * Pure Node.js zero-dependency ZIP archive extractor using zlib
 * @param {Buffer} zipBuffer 
 * @returns {{ fileName: string, content: string }}
 */
function unzipBuffer(zipBuffer) {
  let offset = 0;
  while (offset < zipBuffer.length - 30) {
    // Check for Local File Header signature 0x04034b50 ("PK\x03\x04")
    if (zipBuffer.readUInt32LE(offset) === 0x04034b50) {
      const compMethod = zipBuffer.readUInt16LE(offset + 8);
      const compSize = zipBuffer.readUInt32LE(offset + 18);
      const fnLen = zipBuffer.readUInt16LE(offset + 26);
      const extraLen = zipBuffer.readUInt16LE(offset + 28);

      const fileName = zipBuffer.toString('utf-8', offset + 30, offset + 30 + fnLen);
      const dataStart = offset + 30 + fnLen + extraLen;
      const dataEnd = dataStart + compSize;
      const compData = zipBuffer.subarray(dataStart, dataEnd);

      let decompressed;
      if (compMethod === 8) { // Deflate
        decompressed = zlib.inflateRawSync(compData);
      } else if (compMethod === 0) { // Stored
        decompressed = compData;
      } else {
        throw new Error(`Unsupported ZIP compression method: ${compMethod}`);
      }

      return { fileName, content: decompressed.toString('utf-8') };
    }
    offset++;
  }
  throw new Error('No valid ZIP local file header found');
}

/**
 * Delay execution for ms milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SCRYFALL_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'MTGOCollectionTracker/1.0 (https://github.com/mtgo-tracker)'
};

/**
 * Fetch and extract daily GoatBots price file (updated daily at 5:30 AM CET)
 * Checks HTTP HEAD response (Last-Modified / ETag) to prevent re-downloading identical files.
 * @returns {Promise<Record<string, number>>} Map of CatID -> GoatBots TIX price
 */
export async function fetchGoatbotsPrices() {
  let cachedMeta = {};
  if (fs.existsSync(GOATBOTS_META_JSON)) {
    try {
      cachedMeta = JSON.parse(fs.readFileSync(GOATBOTS_META_JSON, 'utf-8'));
    } catch {
      cachedMeta = {};
    }
  }

  const hasCache = fs.existsSync(GOATBOTS_CACHE_JSON);

  try {
    // Check HTTP HEAD headers first to see if a newer version is available
    const headRes = await axios.head('https://www.goatbots.com/download/prices/price-history.zip', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 8000
    });

    const serverLastModified = headRes.headers['last-modified'];
    const serverEtag = headRes.headers['etag'];

    if (hasCache && cachedMeta.lastModified && serverLastModified === cachedMeta.lastModified) {
      console.log(`[GoatBots] Daily price archive has not changed (${serverLastModified}). Reusing local cache.`);
      return JSON.parse(fs.readFileSync(GOATBOTS_CACHE_JSON, 'utf-8'));
    }

    console.log(`[GoatBots] New daily price file detected (Last-Modified: ${serverLastModified || 'New'}). Downloading price-history.zip...`);

    const response = await axios.get('https://www.goatbots.com/download/prices/price-history.zip', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      responseType: 'arraybuffer',
      timeout: 15000
    });

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const zipBuffer = Buffer.from(response.data);
    const unzipped = unzipBuffer(zipBuffer);
    const priceMap = JSON.parse(unzipped.content);

    fs.writeFileSync(GOATBOTS_CACHE_JSON, JSON.stringify(priceMap), 'utf-8');
    fs.writeFileSync(GOATBOTS_META_JSON, JSON.stringify({
      lastModified: serverLastModified,
      etag: serverEtag,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf-8');

    console.log(`[GoatBots] Successfully updated GoatBots price map from ${unzipped.fileName} (${Object.keys(priceMap).length} cards).`);
    return priceMap;
  } catch (err) {
    console.error('[GoatBots Check/Download Error]', err.message);
  }

  if (hasCache) {
    try {
      console.log('[GoatBots] Reusing existing local GoatBots price cache.');
      return JSON.parse(fs.readFileSync(GOATBOTS_CACHE_JSON, 'utf-8'));
    } catch {
      return {};
    }
  }

  return {};
}

/**
 * Parse a Scryfall card URL (e.g. https://scryfall.com/card/inr/120/invasion-of-innistrad-deluge-of-the-dead)
 * @param {string} url 
 * @returns {{setCode: string, collectorNum: string} | null}
 */
export function parseScryfallUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/card\/([a-z0-9]+)\/([a-z0-9-]+)/i);
  if (match) {
    return { setCode: match[1].toLowerCase(), collectorNum: match[2].toLowerCase() };
  }
  return null;
}

/**
 * Helper to build card object from Scryfall API response and apply target price source
 */
function buildCardInfo(scryfallCard, catId, priceSource, goatbotsPricesMap = {}) {
  const baseTix = parseFloat(scryfallCard.prices?.tix || scryfallCard.prices?.tix_foil || '0');
  const validBaseTix = isNaN(baseTix) ? 0 : baseTix;

  let calculatedPriceTix = validBaseTix;
  if (priceSource === 'goatbots') {
    const gbPrice = goatbotsPricesMap[String(catId)];
    if (gbPrice !== undefined && !isNaN(parseFloat(gbPrice))) {
      calculatedPriceTix = parseFloat(gbPrice);
    } else if (validBaseTix > 0) {
      calculatedPriceTix = validBaseTix;
    }
  }

  const imageUri = scryfallCard.image_uris?.normal || 
                   scryfallCard.card_faces?.[0]?.image_uris?.normal || 
                   'https://svgs.scryfall.io/card-back.svg';

  const artCrop = scryfallCard.image_uris?.art_crop || 
                  scryfallCard.card_faces?.[0]?.image_uris?.art_crop || '';

  return {
    catId,
    name: scryfallCard.name,
    set: scryfallCard.set?.toUpperCase() || 'MTG',
    setName: scryfallCard.set_name || '',
    rarity: scryfallCard.rarity || 'common',
    manaCost: scryfallCard.mana_cost || scryfallCard.card_faces?.[0]?.mana_cost || '',
    typeLine: scryfallCard.type_line || scryfallCard.card_faces?.[0]?.type_line || '',
    priceTix: calculatedPriceTix,
    baseTix: validBaseTix,
    priceSource,
    imageUri,
    artCrop,
    scryfallUri: scryfallCard.scryfall_uri || `https://scryfall.com/card/${scryfallCard.set}/${scryfallCard.collector_number}`,
    cardhoarderUri: scryfallCard.purchase_uris?.cardhoarder || `https://www.cardhoarder.com/cards/id/${catId}`,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Fetch card prices and metadata with 3-tier resolution engine (Custom URL -> CatID -> Card Name)
 * @param {Array<{catId: number, name: string}>} cards List of cards from .dek
 * @param {string} priceSource - 'scryfall' | 'goatbots'
 * @returns {Promise<Map<number, object>>} Map of catId -> card details + price
 */
export async function fetchCollectionPrices(cards, priceSource = 'scryfall') {
  const resultMap = new Map();
  const customLinksMap = getCustomLinks();
  const unmappedCards = [];

  let goatbotsPricesMap = {};
  if (priceSource === 'goatbots') {
    goatbotsPricesMap = await fetchGoatbotsPrices();
  }

  // --- TIER 0: Resolve Custom User Scryfall URLs ---
  for (const card of cards) {
    const customUrl = customLinksMap[String(card.catId)];
    if (customUrl) {
      const parsedUrl = parseScryfallUrl(customUrl);
      if (parsedUrl) {
        try {
          const apiUrl = `https://api.scryfall.com/cards/${parsedUrl.setCode}/${parsedUrl.collectorNum}`;
          const response = await axios.get(apiUrl, { headers: SCRYFALL_HEADERS });
          if (response.data) {
            const cardInfo = buildCardInfo(response.data, card.catId, priceSource, goatbotsPricesMap);
            cardInfo.isCustomLinked = true;
            cardInfo.customUrl = customUrl;
            cardMetadataCache.set(card.catId, cardInfo);
            resultMap.set(card.catId, cardInfo);
          }
        } catch (err) {
          console.error(`[PriceFetcher] Tier 0 Error resolving custom URL for CatID ${card.catId}:`, err.message);
        }
        await sleep(100);
      }
    }
  }

  // Filter out cards already resolved by Tier 0
  const remainingCards = cards.filter((c) => !resultMap.has(c.catId));

  const BATCH_SIZE = 75;

  // --- TIER 1: Batch lookup by MTGO CatID ---
  for (let i = 0; i < remainingCards.length; i += BATCH_SIZE) {
    const batch = remainingCards.slice(i, i + BATCH_SIZE);
    const identifiers = batch.map((c) => ({ mtgo_id: c.catId }));
    const requestedIds = new Set(batch.map((c) => c.catId));

    try {
      const response = await axios.post(
        'https://api.scryfall.com/cards/collection',
        { identifiers },
        { headers: SCRYFALL_HEADERS }
      );

      if (response.data && response.data.data) {
        response.data.data.forEach((scryfallCard) => {
          // A foil CatID resolves to the same Scryfall card as its non-foil twin,
          // so map the result to whichever of the two ids was actually requested
          [scryfallCard.mtgo_id, scryfallCard.mtgo_foil_id].forEach((mtgoId) => {
            if (!mtgoId || !requestedIds.has(mtgoId)) return;
            const cardInfo = buildCardInfo(scryfallCard, mtgoId, priceSource, goatbotsPricesMap);
            cardMetadataCache.set(mtgoId, cardInfo);
            resultMap.set(mtgoId, cardInfo);
          });
        });
      }
    } catch (err) {
      console.error(`[PriceFetcher] Error in CatID batch ${i}:`, err.message);
    }

    if (i + BATCH_SIZE < remainingCards.length) {
      await sleep(100);
    }
  }

  // Find any cards not resolved by Tier 0 or Tier 1
  cards.forEach((card) => {
    if (!resultMap.has(card.catId)) {
      unmappedCards.push(card);
    }
  });

  // --- TIER 2: Fallback batch lookup by Card Name ---
  if (unmappedCards.length > 0) {
    console.log(`[PriceFetcher] Tier 2 Fallback: Resolving ${unmappedCards.length} unmapped cards by Name...`);

    for (let j = 0; j < unmappedCards.length; j += BATCH_SIZE) {
      const nameBatch = unmappedCards.slice(j, j + BATCH_SIZE);
      const identifiers = nameBatch.map((c) => ({ name: c.name }));

      try {
        const response = await axios.post(
          'https://api.scryfall.com/cards/collection',
          { identifiers },
          { headers: SCRYFALL_HEADERS }
        );

        if (response.data && response.data.data) {
          response.data.data.forEach((scryfallCard) => {
            // Several unmapped CatIDs (e.g. different printings) can share the same name
            const matchingOriginals = nameBatch.filter(
              (orig) => 
                orig.name.toLowerCase() === scryfallCard.name.toLowerCase() ||
                scryfallCard.name.toLowerCase().startsWith(orig.name.toLowerCase() + ' //')
            );

            matchingOriginals.forEach((matchingOriginal) => {
              const cardInfo = buildCardInfo(scryfallCard, matchingOriginal.catId, priceSource, goatbotsPricesMap);
              cardMetadataCache.set(matchingOriginal.catId, cardInfo);
              resultMap.set(matchingOriginal.catId, cardInfo);
            });
          });
        }
      } catch (err) {
        console.error(`[PriceFetcher] Error in Name batch ${j}:`, err.message);
      }

      if (j + BATCH_SIZE < unmappedCards.length) {
        await sleep(100);
      }
    }
  }

  // --- TIER 3: Absolute fallback for any remaining unresolvable items ---
  cards.forEach((card) => {
    if (!resultMap.has(card.catId)) {
      const cached = cardMetadataCache.get(card.catId);
      let priceTix = 0;
      if (priceSource === 'goatbots' && goatbotsPricesMap[String(card.catId)] !== undefined) {
        priceTix = parseFloat(goatbotsPricesMap[String(card.catId)]);
      }
      if (cached) {
        resultMap.set(card.catId, { ...cached, priceSource, priceTix: priceTix || cached.priceTix });
      } else {
        resultMap.set(card.catId, {
          catId: card.catId,
          name: card.name,
          set: 'MTGO',
          setName: 'Magic Online',
          rarity: 'common',
          manaCost: '',
          typeLine: '',
          priceTix,
          baseTix: 0,
          priceSource,
          imageUri: 'https://svgs.scryfall.io/card-back.svg',
          artCrop: '',
          scryfallUri: `https://scryfall.com/search?q=${encodeURIComponent(card.name)}`,
          cardhoarderUri: `https://www.cardhoarder.com/cards/id/${card.catId}`,
          updatedAt: new Date().toISOString()
        });
      }
    }
  });

  return resultMap;
}
