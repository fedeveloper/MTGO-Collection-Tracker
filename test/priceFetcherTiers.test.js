import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import axios from 'axios';

// priceFetcher reads custom links through storage.js (<cwd>/data), so run in a temporary directory.
// Scryfall is stubbed: axios.post answers like /cards/collection, rejecting out-of-range mtgo_id values.
const originalCwd = process.cwd();
const originalPost = axios.post;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtgo-fetcher-'));
const requests = [];
let fetcher;

const scryfallCard = (overrides) => ({ name: 'Thoughtseize', set: 'ima', collector_number: '93', prices: { tix: '6.25' }, ...overrides });

before(async () => {
  process.chdir(tmpDir);
  fetcher = await import('../services/priceFetcher.js');
  axios.post = async (url, { identifiers }) => {
    requests.push(identifiers);
    if (identifiers.some((i) => i.mtgo_id !== undefined && !/^\d{3,6}$/.test(String(i.mtgo_id)))) {
      throw new Error('Request failed with status code 400');
    }
    const data = identifiers.flatMap((i) => {
      if (i.mtgo_id === 66099 || i.mtgo_id === 66100) return [scryfallCard({ mtgo_id: 66099, mtgo_foil_id: 66100 })];
      if (i.name === 'Thoughtseize') return [scryfallCard({ set: '2xm', prices: { tix: '11.04' }, mtgo_id: 82252 })];
      return [];
    });
    return { data: { data } };
  };
});

after(() => {
  axios.post = originalPost;
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('accepts only the 3-6 digit ids Scryfall takes as mtgo_id', () => {
  assert.equal(fetcher.isScryfallMtgoId(66099), true);
  assert.equal(fetcher.isScryfallMtgoId(100), true);
  assert.equal(fetcher.isScryfallMtgoId(999999), true);
  assert.equal(fetcher.isScryfallMtgoId(99), false);
  assert.equal(fetcher.isScryfallMtgoId(1000000), false);
  assert.equal(fetcher.isScryfallMtgoId(12.5), false);
});

test('an out-of-range CatID does not push the rest of the batch to the name fallback', async () => {
  requests.length = 0;
  const prices = await fetcher.fetchCollectionPrices([
    { catId: 66099, name: 'Thoughtseize' },
    { catId: 66100, name: 'Thoughtseize' },
    { catId: 999999999, name: 'Unknown Card' }
  ]);

  assert.deepEqual(requests[0], [{ mtgo_id: 66099 }, { mtgo_id: 66100 }], 'invalid id is left out of the CatID batch');
  assert.equal(prices.get(66099).set, 'IMA');
  assert.equal(prices.get(66100).set, 'IMA', 'foil CatID maps to its own printing');
  assert.equal(prices.get(66099).priceTix, 6.25);
  assert.equal(prices.get(999999999).name, 'Unknown Card', 'invalid id still gets a fallback entry');
});
