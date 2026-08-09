// PaymentService abstraction for Hamro Byapar subscriptions.
// This is the single integration point for a real payment gateway. The demo
// implementation runs a clearly-labelled simulated checkout; in non-demo mode
// every method REFUSES to run so a fake "real payment" is impossible.
// Later, a Nepalese gateway such as eSewa or Khalti replaces only the bodies
// of these methods behind the same signatures.

import { isDemoPayment, planById } from '../subscription/plans.js';
import { NEXT_PERIOD_MS } from '../subscription/store.js';
import { generateInvoice } from '../subscription/invoices.js';

const demoReference = () => `demo-${Math.random().toString(36).slice(2, 10)}`;

// 1. Begin checkout for upgrading to `planId`.
// Demo: returns a pseudo-checkout object. Live: refuses (no provider configured).
export async function createCheckout({ planId, subscription, onState } = {}) {
  const plan = planById(planId);
  if (!isDemoMode()) throw new Error('PAYMENT_MODE is not demo — no live payment provider is configured. Refusing to simulate a payment.');
  const reference = demoReference();
  onState?.({ step: 'checkout', reference, planId, amount: plan.price });
  return { id: reference, provider: 'demo', amount: plan.price, currency: plan.currency, demo: true, planId };
}

// 2. Verify a completed or redirect-returned checkout.
// Demo: any demo reference is treated as successfully verified (labelled demo).
export async function verifyPayment(checkout, _subscription) {
  if (!checkout?.demo || checkout.provider !== 'demo') throw new Error('PAYMENT_MODE is not demo — no live provider configured to verify against.');
  return { verified: true, reference: checkout.id, provider: 'demo', verifiedAt: new Date().toISOString(), amount: checkout.amount };
}

// 3. Activate a subscription for `planId`: flips state + writes a real invoice.
export async function activateSubscription(subscription, planId, { currentHistory = [], now = new Date() } = {}) {
  const plan = planById(planId);
  if (!isDemoMode()) throw new Error('PAYMENT_MODE is not demo — cannot activate a subscription without a live provider.');
  const start = new Date(now.getTime());
  const end = new Date(now.getTime() + NEXT_PERIOD_MS);
  const invoice = generateInvoice({ subscription, plan, method: 'demo' }, currentHistory);
  const updated = {
    ...(subscription || {}),
    plan: plan.id,
    status: 'active',
    startDate: start.toISOString(),
    renewalDate: end.toISOString(),
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    paymentStatus: 'paid',
    subscriptionId: subscription?.subscriptionId || `local-${plan.id}-${now.getTime()}`,
    cancelledAt: null,
    nextEffectiveDate: null,
    billingHistory: [...(Array.isArray(subscription?.billingHistory) ? subscription.billingHistory : []), invoice],
  };
  return { updated, invoice };
}

// 4. Cancel: keeps the record, flips status, downgrades premium access.
export async function cancelSubscription(subscription, { now = new Date() } = {}) {
  return {
    ...subscription,
    status: 'cancelled',
    cancelledAt: now.toISOString(),
    nextEffectiveDate: now.toISOString(),
  };
}

// 5. Reserved for live provider callbacks (eSewa/Khalti webhooks).
export async function handleWebhook(payload) {
  if (!isDemoMode()) throw new Error('PAYMENT_MODE is not demo — no live provider webhook is configured.');
  console.info('[Hamro Byapar payment] Demo webhook (no-op):', payload || null);
  return { ok: true };
}