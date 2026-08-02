import fs from 'fs';

/**
 * Parses MTGO .dek XML content and extracts all card entries
 * @param {string} xmlContent - Raw XML string content
 * @returns {Array<{catId: number, name: string, quantity: number, sideboard: boolean}>}
 */
export function parseDekContent(xmlContent) {
  if (!xmlContent || typeof xmlContent !== 'string') {
    return [];
  }

  // Fast and resilient regex parsing for MTGO <Cards /> XML tags
  // Example: <Cards CatID="149931" Quantity="4" Sideboard="false" Name="Pursue the Past" Annotation="0" />
  const cardRegex = /<Cards\s+CatID="(\d+)"\s+Quantity="(\d+)"\s+Sideboard="(true|false)"\s+Name="([^"]+)"/gi;
  
  const cardsMap = new Map();
  let match;

  while ((match = cardRegex.exec(xmlContent)) !== null) {
    const catId = parseInt(match[1], 10);
    const quantity = parseInt(match[2], 10);
    const sideboard = match[3].toLowerCase() === 'true';
    const name = match[4].trim();

    if (cardsMap.has(catId)) {
      const existing = cardsMap.get(catId);
      existing.quantity += quantity;
    } else {
      cardsMap.set(catId, {
        catId,
        name,
        quantity,
        sideboard
      });
    }
  }

  return Array.from(cardsMap.values());
}

/**
 * Parses MTGO .dek file from disk
 * @param {string} filePath - Path to the .dek file
 * @returns {Array<{catId: number, name: string, quantity: number, sideboard: boolean}>}
 */
export function parseDekFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const xmlContent = fs.readFileSync(filePath, 'utf-8');
  return parseDekContent(xmlContent);
}
