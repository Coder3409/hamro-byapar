// Subscription state model and transitions for Hamro Byapar.
// Pure functions — deterministic within a `now` parameter (mirrors stockAlerts.js),
// so the smoke tests can import and assert on them from Node.
// Legacy/no subscription data always defaults to the FREE / active plan.

import { CYCLE_DAYS } from './plans.js';

export const STATUSES = ['active', 'trial', 'cancelled', 'expired', 'pending'];
export const NEXT_PERIOD_MS = CYCLE_DAYS * 24 * 60 * 60 * 1000;

const makeId = (plan) => `local-${plan}-${Math.random().toString(36).slice(2, 10)}`;

export function createSubscription(now = new Date()) {
  const start = new Date(now.getTime());
  const renewal = new Date(now.getTime() + NEXT_PERIOD_MS);
  return {
    plan: 'FREE',
    status: 'active',
    startDate: start.toISOString(),
    renewalDate: renewal.toISOString(),
    paymentStatus: 'free',
    subscriptionId: makeId('FREE'),
    cancelledAt: null,
    nextEffectiveDate: null,
    periodStart: start.toISOString(),
    periodEnd: renewal.toISOString(),
    billingHistory: [],
  };
}

// Default for legacy data (apps saved before subscriptions existed): FREE, active.
export function legacySubscription(now = new Date()) {
  return createSubscription(now);
}

// Merge persisted subscription with defaults so legacy or partial records
// always surface a real plan. Never mutates input.
export function normalizeSubscription(raw, now = new Date()) {
  if (!raw || typeof raw !== 'object') return createSubscription(now);
  const fallback = createSubscription(now);
  const merged = { ...fallback, ...raw };
  merged.plan = merged.plan || 'FREE';
  merged.status = merged.status || 'active';
  merged.paymentStatus = merged.paymentStatus || (merged.plan === 'FREE' ? 'free' : merged.paymentStatus);
  merged.billingHistory = Array.isArray(merged.billingHistory) ? merged.billingHistory : [];
  return merged;
}

// Advance the 30-day cycle: returns a subscription renewed for the next period.
export function completeRenewal(subscription, newStart, newEnd) {
  return {
    ...subscription,
    startDate: newStart.toISOString(),
    renewalDate: newEnd.toISOString(),
    periodStart: newStart.toISOString(),
    periodEnd: newEnd.toISOString(),
    status: 'active',
    cancelledAt: null,
    nextEffectiveDate: null,
  };
}

// Real expiry meaning: if the renewal date passed while cancelled/unpaid,
// the subscription becomes expired (or pending for an unpaid plan).
export function refreshStatus(subscription, now = new Date()) {
  if (!subscription) return createSubscription(now);
  if (new Date(subscription.renewalDate) <= now) {
    if (subscription.status === 'cancelled') return { ...subscription, status: 'expired' };
    if (subscription.paymentStatus === 'pending') return { ...subscription, status: 'pending' };
  }
  return subscription;
}