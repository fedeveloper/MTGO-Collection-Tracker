import axios from 'axios';

// Local cache for card metadata (images, sets, mana costs) to prevent redundant lookups
const cardMetadataCache = new Map();

/**
 * Delay execution for ms milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch card prices and metadata from Scryfall API using batched MTGO CatID lookups
 * @param {Array<{catId: number, name: string}>} cards List of cards with catId
 * @returns {Promise<Map<number, object>>} Map of catId -> card details + price
 */
export async function fetchScryfallPrices(cards) {
  const resultMap = new Map();
  const catIdsToFetch = [];

  // Use cached metadata if available, only fetch missing ones or refresh prices
  cards.forEach((card) => {
    catIdsToFetch.push(card.catId);
  });

  // Scryfall allows max 75 cards per POST collection request
  const BATCH_SIZE = 75;
  for (let i = 0; i < catIdsToFetch.length; i += BATCH_SIZE) {
    const batchCatIds = catIdsToFetch.slice(i, i + BATCH_SIZE);
    const identifiers = batchCatIds.map((id) => ({ mtgo_id: id }));

    try {
      const response = await axios.post(
        'https://api.scryfall.com/cards/collection',
        { identifiers },
        { headers: { 'Content-Type': 'application/json', 'User-Agent': 'MTGOTracker/1.0' } }
      );

      if (response.data && response.data.data) {
        response.data.data.forEach((scryfallCard) => {
          const mtgoId = scryfallCard.mtgo_id || scryfallCard.mtgo_foil_id;
          if (!mtgoId) return;

          // Parse TIX price (MTGO ticket value)
          const tixPrice = parseFloat(scryfallCard.prices?.tix || scryfallCard.prices?.tix_foil || '0');
          
          const cardInfo = {
            catId: mtgoId,
            name: scryfallCard.name,
            set: scryfallCard.set?.toUpperCase() || 'MTG',
            setName: scryfallCard.set_name || '',
            rarity: scryfallCard.rarity || 'common',
            manaCost: scryfallCard.mana_cost || '',
            typeLine: scryfallCard.type_line || '',
            priceTix: isNaN(tixPrice) ? 0 : tixPrice,
            imageUri: scryfallCard.image_uris?.normal || 
                      scryfallCard.card_faces?.[0]?.image_uris?.normal || 
                      'https://svgs.scryfall.io/card-back.svg',
            artCrop: scryfallCard.image_uris?.art_crop || 
                     scryfallCard.card_faces?.[0]?.image_uris?.art_crop || '',
            scryfallUri: scryfallCard.scryfall_uri || `https://scryfall.com/card/${scryfallCard.set}/${scryfallCard.collector_number}`,
            updatedAt: new Date().toISOString()
          };

          cardMetadataCache.set(mtgoId, cardInfo);
          resultMap.set(mtgoId, cardInfo);
        });
      }
    } catch (err) {
      console.error(`Error fetching batch starting at ${i}:`, err.message);
    }

    // Respect Scryfall API rate limits (100ms pause between batch calls)
    if (i + BATCH_SIZE < catIdsToFetch.length) {
      await sleep(120);
    }
  }

  // For any cards not found in Scryfall collection endpoint, fill defaults
  cards.forEach((card) => {
    if (!resultMap.has(card.catId)) {
      const cached = cardMetadataCache.get(card.catId);
      if (cached) {
        resultMap.set(card.catId, cached);
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
          imageUri: 'https://svgs.scryfall.io/card-back.svg',
          artCrop: '',
          scryfallUri: `https://scryfall.com/search?q=${encodeURIComponent(card.name)}`,
          updatedAt: new Date().toISOString()
        });
      }
    }
  });

  return resultMap;
}
