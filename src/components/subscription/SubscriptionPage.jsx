import { CreditCard, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { SUBSCRIPTION_PLANS, planById } from '../../subscription/plans.js';
import { usageSummary } from '../../subscription/usage.js';
import PlanCard from './PlanCard.jsx';
import { money } from '../../utils/analytics.js';

const formatDate = (value, lang) => new Date(value).toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// The dedicated /subscription page. Matches Hamro Byapar's card/grid language,
// with the recommended PRO plan made prominent. Reads live subscription state.
export default function SubscriptionPage({ subscription, aiUsage, billingHistory, t, lang, onPlanSelect }) {
  const plan = planById(subscription?.plan || 'FREE');
  const usage = usageSummary(aiUsage || {}, plan?.id || 'FREE');
  const nextBilling = subscription?.renewalDate ? new Date(subscription.renewalDate) : null;
  const start = subscription?.startDate ? new Date(subscription.startDate) : null;
  const rows = (billingHistory || []).slice().sort((a, b) => new Date(b.issuedAt || b.createdAt || 0) - new Date(a.issuedAt || a.createdAt || 0));
  return <div className="page fade-in">
    <section className="page-title"><div><span className="eyebrow">{t('subscription')}</span><h1>{t('subscriptionPage')}</h1><p>{t('subscriptionHelp')}</p></div></section>

    <section className="sub-status-card card">
      <div className="sub-status-icon"><ShieldCheck size={22}/></div>
      <div className="sub-status-main"><span className="eyebrow">{t('currentPlan')}</span><h2>{t(plan.nameKey || `plan_${plan.id.toLowerCase()}`)}</h2><p className={`sub-status-chip ${subscription?.status || 'active'}`}>{t(`status_${subscription?.status || 'active'}`)}</p></div>
      <div className="sub-status-dates">
        <div><span>{t('startDate')}</span><strong>{start ? formatDate(subscription.startDate, lang) : '—'}</strong></div>
        <div><span>{t('renewalDate')}</span><strong>{nextBilling ? formatDate(subscription.renewalDate, lang) : '—'}</strong></div>
        <div><span>{t('status_payment')}</span><strong>{t(subscription?.paymentStatus === 'paid' ? 'status_paid' : subscription?.paymentStatus === 'pending' ? 'status_pending' : 'status_free')}</strong></div>
      </div>
      {usage.limit > 0 && <div className="sub-usage"><span>{t('aiQuotaUsed')}</span><div className="usage-bar"><i style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}/></div><strong>{usage.used} / {usage.limit}</strong></div>}
    </section>

    <section className="plan-grid">
      {SUBSCRIPTION_PLANS.map((item) => <PlanCard key={item.id} plan={item} currentPlanId={subscription?.plan} status={subscription?.status || 'active'}
        onSelect={() => onPlanSelect(item.id)} t={t} lang={lang} />)}
    </section>

    <section className="card billing-card">
      <div className="card-heading"><div><span className="eyebrow">{t('billingHistory')}</span><h2>{t('billingHistory')}</h2></div>{subscription?.plan !== 'FREE' && <span className="billing-hint"><CreditCard size={14}/>{t('billingRenewalNotice')}</span>}</div>
      <div className="billing-table"><div className="billing-head"><span>{t('paymentId')}</span><span>{t('plan')}</span><span>{t('amount')}</span><span>{t('date')}</span><span>{t('status')}</span></div>
        {rows.length ? rows.map((row) => <div className="billing-row" key={row.id}>
          <span className="billing-id">{row.id}</span><span>{t(planById(row.plan).nameKey || `plan_${row.plan.toLowerCase()}`)}</span>
          <span>{money(row.amount, lang)}</span><span>{formatDate(row.issuedAt || row.createdAt, lang)}</span>
          <span className={`billing-status ${row.status}`}>{t(row.method === 'demo' ? 'status_demo' : `status_${row.status || 'paid'}`)}</span>
        </div>) : <div className="empty-state billing-empty"><Wallet size={28}/><h3>{t('noBillingHistory')}</h3></div>}</div>
    </section>

    {subscription?.plan !== 'FREE' && <p className="sub-renew-note"><Wallet size={13}/>{t('renewalNotice')}: {nextBilling ? formatDate(subscription.renewalDate, lang) : '—'}</p>}
    <p className="sub-demo-note"><Lock size={13}/>{t('demoPaymentNotice')}</p>
  </div>;
}