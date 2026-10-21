import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDekContent } from '../services/dekParser.js';

test('parses cards with attributes in any order', () => {
  const xml = `<?xml version="1.0"?>
<Deck>
  <Cards CatID="123" Quantity="4" Sideboard="false" Name="Lightning Bolt" />
  <Cards Name="Island" Sideboard="true" CatID="456" Quantity="2"/>
</Deck>`;
  assert.deepEqual(parseDekContent(xml), [
    { catId: 123, name: 'Lightning Bolt', quantity: 4, sideboard: false },
    { catId: 456, name: 'Island', quantity: 2, sideboard: true }
  ]);
});

test('sums quantities of the same CatID', () => {
  const xml = '<Cards CatID="7" Quantity="1" Name="Opt" /><Cards CatID="7" Quantity="3" Name="Opt" />';
  assert.deepEqual(parseDekContent(xml), [{ catId: 7, name: 'Opt', quantity: 4, sideboard: false }]);
});

test('defaults quantity to 1 and unescapes XML entities in names', () => {
  const xml = '<Cards CatID="9" Name="Jace, the Mind&apos;s &quot;Sculptor&quot; &amp; Co" />';
  assert.deepEqual(parseDekContent(xml), [
    { catId: 9, name: 'Jace, the Mind\'s "Sculptor" & Co', quantity: 1, sideboard: false }
  ]);
});

test('skips entries without a valid CatID or name', () => {
  const xml = '<Cards CatID="0" Name="Zero" /><Cards CatID="abc" Name="Bad" /><Cards CatID="5" Name="" /><Cards Name="NoId" />';
  assert.deepEqual(parseDekContent(xml), []);
});

test('returns an empty list for empty or non-string input', () => {
  assert.deepEqual(parseDekContent(''), []);
  assert.deepEqual(parseDekContent(null), []);
  assert.deepEqual(parseDekContent(42), []);
});
