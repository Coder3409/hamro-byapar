// Central subscription configuration for Hamro Byapar.
// This is the single source of truth for plans, prices, AI usage quotas,
// and the capability → minimum-plan map. Editing prices, quotas, or the plan
// list here updates the UI, invoices, gating, and tests together.
// Safe to import from Node (smoke tests) — `import.meta.env` is undefined there.

export const PAYMENT_MODE = (import.meta.env?.VITE_PAYMENT_MODE || 'demo').toLowerCase() === 'demo' ? 'demo' : 'live';
export const isDemoPayment = () => PAYMENT_MODE === 'demo';

export const CYCLE_DAYS = 30;

export const SUBSCRIPTION_PLANS = [
  {
    id: 'FREE',
    nameKey: 'planFree',
    price: 0,
    currency: 'NPR',
    aiQuota: 10,
    features: ['f_inventory', 'f_sales', 'f_expenses', 'f_dashboard', 'f_ai_insights', 'f_alerts_basic'],
  },
  {
    id: 'PRO',
    nameKey: 'planPro',
    price: 499,
    currency: 'NPR',
    aiQuota: 100,
    recommended: true,
    features: ['f_inventory', 'f_sales', 'f_expenses', 'f_dashboard', 'f_ai_insights', 'f_alerts_basic', 'f_ai_advanced', 'f_sales_analytics', 'f_inventory_analytics', 'f_alerts_auto', 'f_email_alerts', 'f_reports', 'f_export_reports', 'f_ai_limit_high', 'f_priority_support'],
  },
  {
    id: 'BUSINESS',
    nameKey: 'planBusiness',
    price: 999,
    currency: 'NPR',
    aiQuota: 500,
    features: ['f_inventory', 'f_sales', 'f_expenses', 'f_dashboard', 'f_ai_insights', 'f_alerts_basic', 'f_ai_advanced', 'f_sales_analytics', 'f_inventory_analytics', 'f_alerts_auto', 'f_email_alerts', 'f_reports', 'f_export_reports', 'f_ai_limit_max', 'f_priority_support', 'f_multi_staff', 'f_advanced_analytics', 'f_multi_user', 'f_advanced_reports', 'f_automation'],
  },
];

export const PLAN_BY_ID = Object.fromEntries(SUBSCRIPTION_PLANS.map((plan) => [plan.id, plan]));
export const PLAN_RANK = { FREE: 0, PRO: 1, BUSINESS: 2 };

export const planById = (id) => PLAN_BY_ID[id] || PLAN_BY_ID.FREE;
export const planMeets = (planId, requiredId) => PLAN_RANK[planId || 'FREE'] >= PLAN_RANK[requiredId || 'FREE'];
export const planRank = (planId) => PLAN_RANK[planId] ?? 0;

// capability → minimum plan id. Unknown capabilities default to open.
export const CAPABILITY_MIN_PLAN = {
  dashboard: 'FREE',
  sales: 'FREE',
  inventory: 'FREE',
  alerts: 'FREE',
  aiVoice: 'FREE',
  aiInsights: 'FREE',
  expenses: 'FREE',
  emailAlerts: 'PRO',
  exportReports: 'PRO',
  advancedAnalytics: 'PRO',
  advancedReports: 'PRO',
  multiStaff: 'BUSINESS',
  multiUser: 'BUSINESS',
  automation: 'BUSINESS',
};