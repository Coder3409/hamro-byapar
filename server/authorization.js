// Server-side subscription authorization seam for Hamro Byapar.
//
// IMPORTANT CONTEXT:
// Hamro Byapar currently has NO user accounts and NO server-side identity.
// All business data, including the subscription, is stored per-browser/offline.
// Genuine feature enforcement therefore happens in business logic on the client
// via src/subscription/access.js (canAccess), which every premium feature gate
// and AI-usage check uses.
//
// This module is the INTEGRATION POINT for when accounts + auth arrive. The
// requirePlan() contract below is the reference every privileged route must
// call. It never trusts client-sent values — a future server must verify the
// subscriber's plan against its own records, not against anything the browser
// claims.

import { CAPABILITY_MIN_PLAN, PLAN_RANK } from '../src/subscription/plans.js';

const ACTIVE_STATUSES = ['active', 'trial', 'pending'];

function denied(required) {
  return { ok: false, required, reason: 'insufficient_plan' };
}

// requirePlan(capability, user) -> { ok:true, ... } | { ok:false, required, reason }
// `user` is the authenticated request principal: { plan, status, subscriptionId }.
export function requirePlan(capability, user) {
  const required = CAPABILITY_MIN_PLAN[capability] || 'FREE';
  if (!user || typeof user.plan !== 'string' || typeof user.status !== 'string') {
    return { ok: false, required, reason: 'no_account' };
  }
  if (!ACTIVE_STATUSES.includes(user.status)) return denied(required);
  if (PLAN_RANK[user.plan] < PLAN_RANK[required]) return denied(required);
  return { ok: true, plan: user.plan, required, capability };
}