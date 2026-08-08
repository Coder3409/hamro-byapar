import assert from 'node:assert/strict';
import { createDemoSales, demoProducts } from '../src/data/demo.js';
import { officialSlogan, translate } from '../src/i18n/translations.js';
import { chartData, getInsights, money, summarize } from '../src/utils/analytics.js';
import { answerVoiceQuestion, calculateVoiceSale, parseVoiceCommand } from '../src/utils/voiceParser.js';

const sales = createDemoSales();
const summary = summarize(sales, demoProducts);

assert.equal(officialSlogan, 'Hamro Byapar — व्यापार बुझौं, व्यवसाय बढाऔं');
assert.equal(demoProducts.length, 12);
assert.equal(sales.length, 157);
assert.equal(summary.transactions, 12);
assert.equal(summary.lowStock, 3);
assert.ok(summary.revenue > 0);
assert.equal(chartData(sales, 'revenue', 7).length, 7);
assert.equal(getInsights(sales, demoProducts, 'en').cards.length, 3);
assert.match(getInsights(sales, demoProducts, 'ne').cards[1].action, /स्टक/);
assert.equal(translate('ne', 'dashboard'), 'ड्यासबोर्ड');
assert.match(money(12450, 'en'), /12,450/);

const romanized = parseVoiceCommand('Maile noodles 18 ma kine ani 25 ma beche.', demoProducts);
assert.equal(romanized.kind, 'sale');
assert.equal(romanized.product?.id, 'p4');
assert.equal(romanized.purchasePrice, 18);
assert.equal(romanized.sellingPrice, 25);
assert.equal(romanized.quantity, 1);

const mixed = parseVoiceCommand('Aaja 10 packet noodles 20 ma kineko, 25 ma beche.', demoProducts);
assert.equal(mixed.quantity, 10);
assert.deepEqual(calculateVoiceSale(mixed), { cost: 200, revenue: 250, profit: 50, profitPerUnit: 5, margin: 20 });

const nepali = parseVoiceCommand('मैले ५ वटा साबुन ३० मा किनेँ र ४५ मा बेचेँ।', demoProducts);
assert.equal(nepali.product?.id, 'p6');
assert.equal(nepali.quantity, 5);
assert.equal(nepali.purchasePrice, 30);
assert.equal(nepali.sellingPrice, 45);

const incomplete = parseVoiceCommand('Chau Chau 25 ma beche.', demoProducts);
assert.ok(incomplete.missing.includes('purchasePrice'));
assert.equal(parseVoiceCommand('Aaja ko sales kati cha?', demoProducts).question, 'sales');
assert.match(answerVoiceQuestion('profit', sales, demoProducts, 'en').value, /^Rs\./);

console.log('Hamro Byapar smoke tests passed.');
