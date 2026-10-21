import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScryfallUrl } from '../services/priceFetcher.js';

test('extracts set code and collector number from a Scryfall card URL', () => {
  assert.deepEqual(parseScryfallUrl('https://scryfall.com/card/inr/120/invasion-of-innistrad-deluge-of-the-dead'), {
    setCode: 'inr',
    collectorNum: '120'
  });
});

test('lowercases set code and collector number', () => {
  assert.deepEqual(parseScryfallUrl('https://scryfall.com/card/MH3/12A/some-card'), { setCode: 'mh3', collectorNum: '12a' });
});

test('returns null for URLs that are not card pages and for invalid input', () => {
  assert.equal(parseScryfallUrl('https://scryfall.com/sets/inr'), null);
  assert.equal(parseScryfallUrl(''), null);
  assert.equal(parseScryfallUrl(undefined), null);
});
