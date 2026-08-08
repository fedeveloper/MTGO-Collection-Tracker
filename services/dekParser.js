import fs from 'fs';

/**
 * Unescape standard XML entities in string values
 * @param {string} str 
 * @returns {string}
 */
function unescapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Parses MTGO .dek XML content and extracts all card entries with order-independent attribute parsing
 * @param {string} xmlContent - Raw XML string content
 * @returns {Array<{catId: number, name: string, quantity: number, sideboard: boolean}>}
 */
export function parseDekContent(xmlContent) {
  if (!xmlContent || typeof xmlContent !== 'string') {
    return [];
  }

  // Matches any <Cards ... /> tag
  const tagRegex = /<Cards\s+([^/>]+)\/?>/gi;
  const attrRegex = /(\w+)="([^"]*)"/g;

  const cardsMap = new Map();
  let tagMatch;

  while ((tagMatch = tagRegex.exec(xmlContent)) !== null) {
    const attrString = tagMatch[1];
    const attrs = {};
    let attrMatch;

    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    if (attrs.CatID && attrs.Name) {
      const catId = parseInt(attrs.CatID, 10);
      const quantity = parseInt(attrs.Quantity || '1', 10);
      const sideboard = (attrs.Sideboard || 'false').toLowerCase() === 'true';
      const name = unescapeXml(attrs.Name).trim();

      if (!isNaN(catId) && catId > 0 && name) {
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
