import assert from 'node:assert/strict';
import { createEmailService } from '../server/emailService.js';
import { buildStockAlertEmail } from '../server/emailTemplates.js';
import { createDemoSales, demoProducts } from '../src/data/demo.js';
import { officialSlogan, translate } from '../src/i18n/translations.js';
import { chartData, getInsights, money, summarize } from '../src/utils/analytics.js';
import { configureRecognition, getSpeechRecognitionConstructor, microphoneErrorKey, recognitionErrorKey, recognitionLanguage, requestMicrophonePermission, shouldFallbackRecognitionLanguage } from '../src/utils/speechRecognition.js';
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

const exactDemo = parseVoiceCommand('Maile 20 ma kineko Chau Chau 25 ma beche.', demoProducts);
assert.equal(exactDemo.product?.id, 'p4');
assert.equal(exactDemo.quantity, 1);
assert.equal(exactDemo.purchasePrice, 20);
assert.equal(exactDemo.sellingPrice, 25);
assert.deepEqual(calculateVoiceSale(exactDemo), { cost: 20, revenue: 25, profit: 5, profitPerUnit: 5, margin: 20 });

const nepali = parseVoiceCommand('मैले ५ वटा साबुन ३० मा किनेँ र ४५ मा बेचेँ।', demoProducts);
assert.equal(nepali.product?.id, 'p6');
assert.equal(nepali.quantity, 5);
assert.equal(nepali.purchasePrice, 30);
assert.equal(nepali.sellingPrice, 45);

const incomplete = parseVoiceCommand('Chau Chau 25 ma beche.', demoProducts);
assert.ok(incomplete.missing.includes('purchasePrice'));
assert.equal(parseVoiceCommand('Aaja ko sales kati cha?', demoProducts).question, 'sales');
assert.equal(parseVoiceCommand('Aaja kati bechiyo?', demoProducts).question, 'sales');
assert.equal(parseVoiceCommand('Aaja kati profit bhayo?', demoProducts).question, 'profit');
assert.equal(parseVoiceCommand('Kun saman dherai bikyo?', demoProducts).question, 'best');
assert.equal(parseVoiceCommand('K ko stock kam cha?', demoProducts).question, 'stock');
assert.match(answerVoiceQuestion('profit', sales, demoProducts, 'en').value, /^Rs\./);

class StandardRecognition {}
class WebkitRecognition {}
assert.equal(getSpeechRecognitionConstructor({ SpeechRecognition: StandardRecognition, webkitSpeechRecognition: WebkitRecognition }), StandardRecognition);
assert.equal(getSpeechRecognitionConstructor({ webkitSpeechRecognition: WebkitRecognition }), WebkitRecognition);
assert.equal(getSpeechRecognitionConstructor({}), null);
assert.equal(recognitionLanguage('ne'), 'ne-NP');
assert.equal(recognitionLanguage('en'), 'en-US');
const configuredRecognition = configureRecognition({}, 'ne-NP');
assert.deepEqual(configuredRecognition, { lang: 'ne-NP', continuous: false, interimResults: true, maxAlternatives: 3 });
assert.equal(shouldFallbackRecognitionLanguage('language-not-supported', 'ne', false), true);
assert.equal(shouldFallbackRecognitionLanguage('language-not-supported', 'ne', true), false);
assert.equal(recognitionErrorKey('not-allowed'), 'voicePermissionDenied');
assert.equal(recognitionErrorKey('no-speech'), 'voiceNoSpeech');
assert.equal(recognitionErrorKey('network'), 'voiceNetworkError');
assert.equal(microphoneErrorKey({ name: 'NotAllowedError' }), 'voicePermissionDenied');
assert.equal(microphoneErrorKey({ name: 'PermissionTimeoutError' }), 'voicePermissionTimeout');
let microphoneStopped = false;
await requestMicrophonePermission({ getUserMedia: async (constraints) => {
  assert.deepEqual(constraints, { audio: true });
  return { getTracks: () => [{ stop: () => { microphoneStopped = true; } }] };
} });
assert.equal(microphoneStopped, true);
await assert.rejects(
  requestMicrophonePermission({ getUserMedia: () => new Promise(() => undefined) }, 5),
  (permissionError) => permissionError.name === 'PermissionTimeoutError',
);

const lowStockEmail = buildStockAlertEmail({
  alertType: 'low_stock', product: { id: 'p-test', name: 'Coca-Cola', category: 'Beverage', stock: 4, lowStock: 5 }, shop: { name: 'Asha Kirana Pasal' }, manageUrl: 'http://localhost:4173#inventory',
});
assert.match(lowStockEmail.subject, /Low Stock Alert - Coca-Cola/);
assert.match(lowStockEmail.html, /Current stock/);
assert.match(lowStockEmail.html, /4 units/);
assert.match(lowStockEmail.text, /Minimum Stock: 5 units/);
const outOfStockEmail = buildStockAlertEmail({
  alertType: 'out_of_stock', product: { id: 'p-test', name: 'Coca-Cola', category: 'Beverage', stock: 0, lowStock: 5 }, shop: { name: 'Asha Kirana Pasal' },
});
assert.match(outOfStockEmail.subject, /Out of Stock - Coca-Cola/);
assert.match(outOfStockEmail.text, /currently out of stock/);

const sentMessages = [];
const emailService = createEmailService(
  { EMAIL_USER: 'sender@example.com', EMAIL_APP_PASSWORD: 'test-only-placeholder', ALERT_EMAIL: 'hbyapar@gmail.com' },
  () => ({ sendMail: async (message) => { sentMessages.push(message); return { messageId: 'test-message-id' }; } }),
);
const stockAlertPayload = { alertId: 'alert-test-123', alertType: 'low_stock', product: { id: 'p-test', name: 'Coca-Cola', category: 'Beverage', stock: 4, lowStock: 5 }, shop: { name: 'Asha Kirana Pasal' } };
assert.equal((await emailService.sendStockAlert(stockAlertPayload)).delivered, true);
assert.equal((await emailService.sendStockAlert(stockAlertPayload)).duplicate, true);
assert.equal(sentMessages.length, 1);
assert.equal(sentMessages[0].to, 'hbyapar@gmail.com');
const unconfiguredEmail = createEmailService({}, () => { throw new Error('Transport should not be created.'); });
assert.deepEqual(await unconfiguredEmail.sendStockAlert(stockAlertPayload), { delivered: false, reason: 'not_configured' });

console.log('Hamro Byapar smoke tests passed.');
