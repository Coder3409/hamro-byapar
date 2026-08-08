import assert from 'node:assert/strict';
import { createEmailService } from '../server/emailService.js';
import { buildStockAlertEmail } from '../server/emailTemplates.js';
import { createDemoSales, demoProducts } from '../src/data/demo.js';
import { officialSlogan, translate } from '../src/i18n/translations.js';
import { sendStockAlertEmail } from '../src/services/notifications.js';
import { chartData, getInsights, money, summarize } from '../src/utils/analytics.js';
import { configureRecognition, getSpeechRecognitionConstructor, microphoneErrorKey, recognitionErrorKey, recognitionLanguage, requestMicrophonePermission, shouldFallbackRecognitionLanguage } from '../src/utils/speechRecognition.js';
import { createStockAlertBaseline, evaluateStockAlerts, resolveNotifications, stockAlertLevel, updateNotificationEmailStatus } from '../src/utils/stockAlerts.js';
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

const stockedProduct = { id: 'stock-test', name: 'Test Rice', nameNe: 'परीक्षण चामल', category: 'Grocery', stock: 12, lowStock: 5 };
assert.equal(stockAlertLevel(stockedProduct), 'normal');
assert.equal(stockAlertLevel({ ...stockedProduct, stock: 5 }), 'low_stock');
assert.equal(stockAlertLevel({ ...stockedProduct, stock: 0 }), 'out_of_stock');
let stockStates = createStockAlertBaseline([stockedProduct]);
let stockResult = evaluateStockAlerts([stockedProduct], stockStates, '2026-08-08T01:00:00.000Z');
assert.equal(stockResult.alerts.length, 0, 'unchanged healthy stock must not create an alert');
stockResult = evaluateStockAlerts([{ ...stockedProduct, stock: 4 }], stockResult.states, '2026-08-08T01:01:00.000Z');
assert.equal(stockResult.alerts.length, 1);
assert.equal(stockResult.alerts[0].alertType, 'low_stock');
const firstLowStockAlert = stockResult.alerts[0];
stockResult = evaluateStockAlerts([{ ...stockedProduct, stock: 4 }], stockResult.states, '2026-08-08T01:02:00.000Z');
assert.equal(stockResult.alerts.length, 0, 'unchanged low stock must not send a duplicate');
stockResult = evaluateStockAlerts([{ ...stockedProduct, stock: 0 }], stockResult.states, '2026-08-08T01:03:00.000Z');
assert.equal(stockResult.alerts[0].alertType, 'out_of_stock');
assert.deepEqual(stockResult.resolvedAlertIds, [firstLowStockAlert.id]);
const outOfStockAlert = stockResult.alerts[0];
stockResult = evaluateStockAlerts([{ ...stockedProduct, stock: 0 }], stockResult.states, '2026-08-08T01:04:00.000Z');
assert.equal(stockResult.alerts.length, 0, 'unchanged zero stock must not send a duplicate');
stockResult = evaluateStockAlerts([{ ...stockedProduct, stock: 20 }], stockResult.states, '2026-08-08T01:05:00.000Z');
assert.equal(stockResult.alerts.length, 0);
assert.deepEqual(stockResult.resolvedAlertIds, [outOfStockAlert.id]);
stockResult = evaluateStockAlerts([{ ...stockedProduct, stock: 3 }], stockResult.states, '2026-08-08T01:06:00.000Z');
assert.equal(stockResult.alerts.length, 1, 'restocking must reset the alert cycle');
assert.notEqual(stockResult.alerts[0].id, firstLowStockAlert.id);
const secondLowStockAlert = stockResult.alerts[0];
assert.equal(resolveNotifications([firstLowStockAlert], [firstLowStockAlert.id], '2026-08-08T01:07:00.000Z')[0].isResolved, true);
assert.equal(updateNotificationEmailStatus([secondLowStockAlert], secondLowStockAlert.id, 'sent')[0].emailSent, true);
stockResult = evaluateStockAlerts([], stockResult.states, '2026-08-08T01:08:00.000Z');
assert.deepEqual(stockResult.resolvedAlertIds, [secondLowStockAlert.id], 'removing a product must resolve its active notification');

let postedAlert;
const delivered = await sendStockAlertEmail(secondLowStockAlert, { ...stockedProduct, stock: 3 }, { shopName: 'Asha Kirana Pasal', ownerName: 'Asha Shrestha' }, async (url, options) => {
  postedAlert = { url, options, body: JSON.parse(options.body) };
  return { ok: true, json: async () => ({ ok: true, delivered: true }) };
});
assert.equal(delivered.delivered, true);
assert.equal(postedAlert.url, '/api/alerts/stock');
assert.equal(postedAlert.body.product.stock, 3);
assert.equal('EMAIL_APP_PASSWORD' in postedAlert.body, false, 'email credentials must never enter the browser payload');
await assert.rejects(
  sendStockAlertEmail(secondLowStockAlert, { ...stockedProduct, stock: 3 }, { shopName: 'Asha Kirana Pasal', ownerName: 'Asha Shrestha' }, async () => ({ ok: false, json: async () => ({ error: 'SMTP unavailable' }) })),
  /SMTP unavailable/,
);

console.log('Hamro Byapar smoke tests passed.');
