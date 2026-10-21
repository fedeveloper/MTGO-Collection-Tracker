import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// storage.js keeps its files in <cwd>/data, so run it in a temporary directory
// to leave the real collection data untouched.
const originalCwd = process.cwd();
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtgo-storage-'));
let storage;

before(async () => {
  process.chdir(tmpDir);
  storage = await import('../services/storage.js');
});

after(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const card = (catId, priceTix, quantity = 1) => ({ catId, name: `Card ${catId}`, quantity, priceTix });

test('purchase prices are saved and removed', () => {
  storage.savePurchase(1, '2.5');
  assert.equal(storage.getPurchases()['1'].purchasePriceTix, 2.5);
  storage.savePurchase(1, '');
  assert.equal(storage.getPurchases()['1'], undefined);
});

test('a sale records realized P&L and can be undone', () => {
  const [sale] = storage.recordSale({ catId: 2, name: 'Card 2', quantity: 2, purchasePriceTix: 1, salePriceTix: 1.75 });
  assert.equal(sale.realizedPnlTix, 1.5);
  assert.equal(sale.quantity, 2);
  storage.undoSale(sale.id);
  assert.deepEqual(storage.getSalesHistory(), []);
});

test('movements compare current prices with the Time 0 snapshot and emit signals', () => {
  storage.clearHistory();
  storage.addSnapshot([card(10, 1), card(11, 1), card(12, 1)]);
  const { cards, summary } = storage.calculateMovements([card(10, 1.5), card(11, 0.6), card(12, 1)]);
  const byId = Object.fromEntries(cards.map((c) => [c.catId, c]));

  assert.equal(byId[10].timeZeroDeltaPercent, 50);
  assert.equal(byId[10].signal, 'take_profit');
  assert.equal(byId[11].timeZeroDeltaPercent, -40);
  assert.equal(byId[11].signal, 'stop_loss');
  assert.equal(byId[12].signal, 'neutral');
  assert.equal(byId[12].trend, 'stable');
  assert.equal(summary.initialPortfolioValue, 3);
  assert.equal(summary.currentPortfolioValue, 3.1);
});

test('sold quantities leave the active portfolio', () => {
  storage.clearHistory();
  const [sale] = storage.recordSale({ catId: 20, quantity: 1, purchasePriceTix: 0, salePriceTix: 3 });
  storage.recordSale({ catId: 21, quantity: 2, purchasePriceTix: 0, salePriceTix: 1 });
  const { cards, summary } = storage.calculateMovements([card(20, 3, 3), card(21, 1, 2)]);

  assert.deepEqual(cards.map((c) => [c.catId, c.quantity, c.soldQuantity]), [[20, 2, 1]]);
  assert.equal(summary.totalRealizedPnlTix, 5);
  assert.equal(summary.totalSalesCount, 2);
  storage.undoSale(sale.id);
});

test('purchase price drives the P&L on cost', () => {
  storage.clearHistory();
  for (const s of storage.getSalesHistory()) storage.undoSale(s.id);
  storage.savePurchase(30, 2);
  const { cards, summary } = storage.calculateMovements([card(30, 3, 2)]);

  assert.equal(cards[0].purchaseDeltaTix, 1);
  assert.equal(cards[0].purchaseDeltaPercent, 50);
  assert.equal(summary.totalPurchaseCostTix, 4);
  assert.equal(summary.unrealizedPnlOnCostTix, 2);
});
