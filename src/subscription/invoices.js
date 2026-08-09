// Invoice + billing-history generation for Hamro Byapar.
// Invoices are REAL records produced by the checkout flow (generateInvoice),
// not hardcoded UI data. The only seed is one FREE Rs.0 invoice.

import { PAYMENT_MODE } from './plans.js';
import { NEXT_PERIOD_MS } from './store.js';

export const nextInvoiceId = (history = []) => {
  const year = new Date().getFullYear();
  const count = Array.isArray(history) ? history.length : 0;
  return `inv-${year}-${String(count + 1).padStart(4, '0')}`;
};

export function generateInvoice({ subscription, plan, method = PAYMENT_MODE === 'demo' ? 'demo' : 'live', now = new Date() }, history = []) {
  return {
    id: nextInvoiceId(history),
    subscriptionId: subscription?.subscriptionId || 'unknown',
    plan: plan?.id || 'FREE',
    amount: plan?.price || 0,
    currency: plan?.currency || 'NPR',
    method,
    status: 'paid',
    issuedAt: now.toISOString(),
    renewalDate: new Date(now.getTime() + NEXT_PERIOD_MS).toISOString(),
  };
}

// One baseline record so billing history is never empty.
export function billingHistorySeed(now = new Date()) {
  return [generateInvoice({ subscription: {}, plan: { id: 'FREE', price: 0, currency: 'NPR' }, method: 'none', now }, [])];
}