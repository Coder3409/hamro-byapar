import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEmailService } from '../server/emailService.js';
import { buildStockAlertEmail } from '../server/emailTemplates.js';
import { createDemoSales, demoProducts } from '../src/data/demo.js';
import { officialSlogan, translate } from '../src/i18n/translations.js';
import { sendStockAlertEmail } from '../src/services/notifications.js';
import { chartData, getInsights, money, summarize } from '../src/utils/analytics.js';
import { configureRecognition, getSpeechRecognitionConstructor, microphoneErrorKey, recognitionErrorKey, recognitionLanguage, requestMicrophonePermission, shouldFallbackRecognitionLanguage } from '../src/utils/speechRecognition.js';
import { createStockAlertBaseline, evaluateStockAlerts, resolveNotifications, stockAlertLevel, updateNotificationEmailStatus } from '../src/utils/stockAlerts.js';
import { calculateVat, normalizeVatProfile, normalizeVatRate, summarizeVat, vatFromSale } from '../src/utils/vat.js';
import { answerVoiceQuestion, calculateVoiceSale, parseVoiceCommand } from '../src/utils/voiceParser.js';

const sales = createDemoSales();
const summary = summarize(sales, demoProducts);

assert.equal(officialSlogan, 'व्यापार बुझौं | व्यवसाय बढाऔं');
assert.equal(demoProducts.length, 12);
assert.equal(sales.length, 157);
assert.equal(summary.transactions, 12);
assert.equal(summary.lowStock, 3);
assert.ok(summary.revenue > 0);
assert.equal(chartData(sales, 'revenue', 7).length, 7);
assert.equal(getInsights(sales, demoProducts, 'en').cards.length, 3);
assert.match(getInsights(sales, demoProducts, 'ne').cards[1].action, /स्टक/);
assert.equal(translate('ne', 'dashboard'), 'ड्यासबोर्ड');
assert.equal(translate('en', 'customers'), 'Customers');
assert.equal(translate('ne', 'reports'), 'रिपोर्ट');
assert.match(translate('ne', 'aiCompanion'), /व्यवसायिक साथी/);
assert.match(money(12450, 'en'), /12,450/);

const exclusiveVat = calculateVat({ amount: 1000, rate: 13, inclusive: false, applicable: true });
assert.deepEqual(exclusiveVat, { applicable: true, rate: 13, inclusive: false, taxableAmount: 1000, vatAmount: 130, total: 1130 });
const inclusiveVat = calculateVat({ amount: 1130, rate: 13, inclusive: true, applicable: true });
assert.deepEqual(inclusiveVat, { applicable: true, rate: 13, inclusive: true, taxableAmount: 1000, vatAmount: 130, total: 1130 });
assert.equal(normalizeVatRate(-5), 0);
assert.equal(normalizeVatRate(150), 100);
assert.deepEqual(normalizeVatProfile({ shopName: 'Test Shop' }), { shopName: 'Test Shop', vatEnabled: false, vatRegistrationNumber: '', vatRate: 13, pricesIncludeVat: true });
const vatSale = { id: 'vat-1', total: 1130, vatApplicable: true, vatRate: 13, vatInclusive: true, taxableAmount: 1000, vatAmount: 130 };
assert.equal(vatFromSale(vatSale).vatAmount, 130);
const vatSummary = summarizeVat([vatSale, { id: 'non-vat-1', total: 500, vatApplicable: false }]);
assert.equal(vatSummary.taxableSales, 1000);
assert.equal(vatSummary.outputVat, 130);
assert.equal(vatSummary.vatableTransactions, 1);
assert.equal(vatSummary.nonVatTransactions, 1);
assert.equal(vatSummary.inputVat, null);
assert.equal(vatSummary.netVat, null);

const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
assert.equal(manifest.theme_color, '#061b3a');
assert.equal(manifest.icons[0].src, '/assets/hamro-byapar-logo.jpeg');
assert.ok((await readFile(new URL('../public/assets/hamro-byapar-logo.jpeg', import.meta.url))).byteLength > 100_000);

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

// --- Subscription system assertions ---
const { SUBSCRIPTION_PLANS, planById, PLAN_RANK, planMeets, CAPABILITY_MIN_PLAN, PAYMENT_MODE, CYCLE_DAYS } = await import('../src/subscription/plans.js');
const { canAccess, planCanAccess, missingPlanFor } = await import('../src/subscription/access.js');
const { createSubscription, legacySubscription, normalizeSubscription, refreshStatus, NEXT_PERIOD_MS, completeRenewal } = await import('../src/subscription/store.js');
const { newUsage, monthRollover, recordAiUsage, remainingAi, canUseAi, usageSummary } = await import('../src/subscription/usage.js');
const { nextInvoiceId, generateInvoice, billingHistorySeed } = await import('../src/subscription/invoices.js');
const { requirePlan } = await import('../server/authorization.js');

// Plans config
assert.equal(SUBSCRIPTION_PLANS.length, 3);
assert.equal(planById('FREE').price, 0);
assert.equal(planById('PRO').price, 499);
assert.equal(planById('BUSINESS').price, 999);
assert.equal(planById('FREE').aiQuota, 10);
assert.equal(planById('PRO').aiQuota, 100);
assert.equal(planById('BUSINESS').aiQuota, 500);
assert.equal(planMeets('PRO', 'FREE'), true);
assert.equal(planMeets('FREE', 'PRO'), false);
assert.equal(planMeets('BUSINESS', 'PRO'), true);
assert.equal(CAPABILITY_MIN_PLAN.dashboard, 'FREE');
assert.equal(CAPABILITY_MIN_PLAN.emailAlerts, 'PRO');
assert.equal(CAPABILITY_MIN_PLAN.multiStaff, 'BUSINESS');

// Access system
assert.equal(canAccess('dashboard', { plan: 'FREE', status: 'active' }), true);
assert.equal(canAccess('emailAlerts', { plan: 'FREE', status: 'active' }), false);
assert.equal(canAccess('emailAlerts', { plan: 'PRO', status: 'active' }), true);
assert.equal(canAccess('multiStaff', { plan: 'PRO', status: 'active' }), false);
assert.equal(canAccess('multiStaff', { plan: 'BUSINESS', status: 'active' }), true);
assert.equal(canAccess('unknownCap', { plan: 'FREE' }), true); // unknown capabilities open
// aiInsights is FREE capability — always accessible even if cancelled/expired
assert.equal(canAccess('aiInsights', { plan: 'PRO', status: 'cancelled' }), true);
assert.equal(canAccess('aiInsights', { plan: 'PRO', status: 'expired' }), true);
assert.equal(canAccess('aiInsights', { plan: 'PRO', status: 'trial' }), true);
assert.ok(missingPlanFor('emailAlerts', { plan: 'FREE', status: 'active' }));
assert.equal(missingPlanFor('emailAlerts', { plan: 'FREE', status: 'active' }).id, 'PRO');
assert.ok(!missingPlanFor('dashboard', { plan: 'FREE' }));

// Store (legacy default)
const legacy = legacySubscription();
assert.equal(legacy.plan, 'FREE');
assert.equal(legacy.status, 'active');
assert.ok(legacy.subscriptionId.startsWith('local-FREE'));
const normalized = normalizeSubscription(null);
assert.equal(normalized.plan, 'FREE');
assert.ok(normalized.status === 'active');
const partial = normalizeSubscription({ plan: 'PRO', status: 'active' });
assert.equal(partial.plan, 'PRO');
assert.ok(partial.billingHistory && Array.isArray(partial.billingHistory));
const expiredSub = refreshStatus({ ...legacy, status: 'cancelled', renewalDate: new Date(Date.now() - 86400000).toISOString() });
assert.equal(expiredSub.status, 'expired');

// AI usage
let usage = newUsage();
assert.equal(usage.aiCount, 0);
assert.equal(remainingAi(usage, 'FREE'), 10);
assert.equal(canUseAi(usage, 'FREE'), true);
usage = recordAiUsage(usage);
assert.equal(usage.current.aiCount, 1);
assert.equal(remainingAi(usage, 'FREE'), 9);
usage = recordAiUsage(usage);
usage = recordAiUsage(usage);
usage = recordAiUsage(usage);
usage = recordAiUsage(usage);
usage = recordAiUsage(usage);
usage = recordAiUsage(usage);
usage = recordAiUsage(usage);
usage = recordAiUsage(usage);
usage = recordAiUsage(usage);
usage = recordAiUsage(usage); // 10 total
assert.equal(remainingAi(usage, 'FREE'), 0);
assert.equal(canUseAi(usage, 'FREE'), false);
assert.ok(usageSummary(usage, 'FREE').reached);
usage = monthRollover(usage, new Date('2026-09-01')); // new month
assert.equal(usage.current.aiCount, 0);
assert.equal(canUseAi(usage, 'FREE'), true);

// Invoices
const invoice = generateInvoice({ subscription: { subscriptionId: 'sub-123' }, plan: { id: 'PRO', price: 499, currency: 'NPR' } }, []);
assert.match(invoice.id, /^inv-\d{4}-\d{4}$/);
assert.equal(invoice.plan, 'PRO');
assert.equal(invoice.amount, 499);
assert.equal(invoice.currency, 'NPR');
assert.equal(invoice.method, 'demo');
assert.equal(invoice.status, 'paid');
const seed = billingHistorySeed();
assert.equal(seed.length, 1);
assert.equal(seed[0].plan, 'FREE');
assert.equal(seed[0].amount, 0);

// Server authorization seam
assert.deepEqual(requirePlan('emailAlerts', { plan: 'PRO', status: 'active', subscriptionId: 'x' }), { ok: true, plan: 'PRO', required: 'PRO', capability: 'emailAlerts' });
assert.deepEqual(requirePlan('emailAlerts', { plan: 'FREE', status: 'active', subscriptionId: 'x' }).ok, false);
assert.deepEqual(requirePlan('emailAlerts', { plan: 'PRO', status: 'cancelled', subscriptionId: 'x' }).ok, false);
assert.deepEqual(requirePlan('emailAlerts', { plan: 'FREE', status: 'active', subscriptionId: 'x' }).required, 'PRO');

// PAYMENT_MODE from env
assert.ok(['demo','live'].includes(PAYMENT_MODE));

console.log('Hamro Byapar smoke tests passed.');
