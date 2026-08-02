import axios from 'axios';
import { getCustomLinks } from './storage.js';

// Local cache for card metadata (images, sets, mana costs, prices) to prevent redundant lookups
const cardMetadataCache = new Map();

/**
 * Delay execution for ms milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SCRYFALL_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'MTGOCollectionTracker/1.0 (https://github.com/mtgo-tracker)'
};

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
 * Helper to build card object from Scryfall API response
 */
function buildCardInfo(scryfallCard, catId, priceSource) {
  const baseTix = parseFloat(scryfallCard.prices?.tix || scryfallCard.prices?.tix_foil || '0');
  const validBaseTix = isNaN(baseTix) ? 0 : baseTix;

  let calculatedPriceTix = validBaseTix;
  if (priceSource === 'goatbots') {
    if (validBaseTix > 0) {
      const rarityMultiplier = scryfallCard.rarity === 'mythic' ? 0.97 : scryfallCard.rarity === 'rare' ? 0.95 : 0.90;
      calculatedPriceTix = Math.round(validBaseTix * rarityMultiplier * 100) / 100;
    }
  } else if (priceSource === 'cardhoarder') {
    if (validBaseTix > 0) {
      calculatedPriceTix = Math.round(validBaseTix * 0.96 * 100) / 100;
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
 * @param {string} priceSource - 'scryfall' | 'goatbots' | 'cardhoarder'
 * @returns {Promise<Map<number, object>>} Map of catId -> card details + price
 */
export async function fetchCollectionPrices(cards, priceSource = 'scryfall') {
  const resultMap = new Map();
  const customLinksMap = getCustomLinks();
  const unmappedCards = [];

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
            const cardInfo = buildCardInfo(response.data, card.catId, priceSource);
            cardInfo.isCustomLinked = true;
            cardInfo.customUrl = customUrl;
            cardMetadataCache.set(card.catId, cardInfo);
            resultMap.set(card.catId, cardInfo);
          }
        } catch (err) {
          console.error(`[PriceFetcher] Tier 0 Error resolving custom URL for CatID ${card.catId}:`, err.message);
        }
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

    try {
      const response = await axios.post(
        'https://api.scryfall.com/cards/collection',
        { identifiers },
        { headers: SCRYFALL_HEADERS }
      );

      if (response.data && response.data.data) {
        response.data.data.forEach((scryfallCard) => {
          const mtgoId = scryfallCard.mtgo_id || scryfallCard.mtgo_foil_id;
          if (!mtgoId) return;

          const cardInfo = buildCardInfo(scryfallCard, mtgoId, priceSource);
          cardMetadataCache.set(mtgoId, cardInfo);
          resultMap.set(mtgoId, cardInfo);
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
            const matchingOriginal = nameBatch.find(
              (orig) => 
                orig.name.toLowerCase() === scryfallCard.name.toLowerCase() ||
                scryfallCard.name.toLowerCase().startsWith(orig.name.toLowerCase() + ' //')
            );

            if (!matchingOriginal) return;

            const cardInfo = buildCardInfo(scryfallCard, matchingOriginal.catId, priceSource);
            cardMetadataCache.set(matchingOriginal.catId, cardInfo);
            resultMap.set(matchingOriginal.catId, cardInfo);
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
      if (cached) {
        resultMap.set(card.catId, { ...cached, priceSource });
      } else {
        resultMap.set(card.catId, {
          catId: card.catId,
          name: card.name,
          set: 'MTGO',
          setName: 'Magic Online',
          rarity: 'common',
          manaCost: '',
          typeLine: '',
          priceTix: 0,
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
