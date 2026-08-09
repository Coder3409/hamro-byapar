// Monthly AI usage counters for Hamro Byapar.
// Pure functions keyed by a `month` (e.g. "2026-8"). Limits come from the
// plan config (plans.js aiQuota). Importable from Node for smoke tests.

import { planById } from './plans.js';

const monthKey = (date) => `${date.getFullYear()}-${date.getMonth() + 1}`;

export function newUsage(now = new Date()) {
  return { month: monthKey(now), aiCount: 0 };
}

function normalizeUsage(usage = {}) {
  // Accept both rolled format {current: {month, aiCount}} and raw {month, aiCount}
  if (usage && usage.current) return usage;
  return { current: usage };
}

// Reset the counter when the calendar month changes.
export function monthRollover(usage = {}, now = new Date()) {
  const norm = normalizeUsage(usage);
  const current = norm.current;
  if (current && current.month === monthKey(now)) return norm;
  const previous = current ? { ...current } : null;
  return { current: newUsage(now), previous };
}

export function recordAiUsage(usage = {}, now = new Date()) {
  const rolled = monthRollover(usage, now);
  return { ...rolled, current: { ...rolled.current, aiCount: rolled.current.aiCount + 1 } };
}

export function remainingAi(usage = {}, planId = 'FREE', now = new Date()) {
  const current = monthRollover(usage, now).current;
  const limit = planById(planId).aiQuota;
  return Math.max(0, limit - current.aiCount);
}

export function canUseAi(usage = {}, planId = 'FREE', now = new Date()) {
  return remainingAi(usage, planId, now) > 0;
}

export function usageSummary(usage = {}, planId = 'FREE', now = new Date()) {
  const current = monthRollover(usage, now).current;
  const limit = planById(planId).aiQuota;
  return { used: current.aiCount, limit, remaining: Math.max(0, limit - current.aiCount), reached: current.aiCount >= limit };
}