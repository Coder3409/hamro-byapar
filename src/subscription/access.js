// Central feature-access system for Hamro Byapar subscriptions.
// Every premium capability must be checked through canAccess() in business
// logic — not just hidden in the UI. Covers plan level AND subscription status.

import { CAPABILITY_MIN_PLAN, PLAN_RANK, planById } from './plans.js';

const ACTIVE_STATUSES = ['active', 'trial', 'pending'];

export function planCanAccess(capability, planId, status = 'active') {
  const required = CAPABILITY_MIN_PLAN[capability];
  if (!required || required === 'FREE') return true;
  const meets = PLAN_RANK[planId || 'FREE'] >= PLAN_RANK[required];
  return meets && ACTIVE_STATUSES.includes(status);
}

export function canAccess(capability, subscription = {}) {
  const plan = subscription?.plan || 'FREE';
  return planCanAccess(capability, plan, subscription?.status || 'active');
}

// Returns the plan object required for a capability (drives the upgrade modal),
// or null when the current subscription can already access it.
export function missingPlanFor(capability, subscription = {}) {
  if (canAccess(capability, subscription)) return null;
  const required = CAPABILITY_MIN_PLAN[capability];
  return planById(required || 'PRO');
}