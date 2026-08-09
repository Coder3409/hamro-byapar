import { BadgeCheck, Check, Crown, Lock, Sparkles } from 'lucide-react';

const PLAN_ICONS = { FREE: Check, PRO: Sparkles, BUSINESS: Crown };

// Dense, App.jsx-style plan card used on the subscription page.
// PRO carries the "Most popular" treatment; the CTA adapts to the current plan.
export default function PlanCard({ plan, currentPlanId, status, canDowngrade, onSelect, t, lang, demo }) {
  const isCurrentPlan = currentPlanId === plan.id;
  const Icon = PLAN_ICONS[plan.id] || Check;
  const currencySymbol = plan.currency === 'NPR' ? 'Rs.' : plan.currency;
  const priceText = plan.price === 0 ? 'Rs. 0' : `${currencySymbol} ${plan.price.toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-IN')}`;

  let action;
  if (isCurrentPlan) {
    action = status === 'active' || status === 'trial'
      ? <button className="plan-cta current" disabled>{t('currentPlan')}</button>
      : <button className="plan-cta" onClick={onSelect}>{t('renewPrompt')}</button>;
  } else if (status === 'cancelled' || status === 'expired') {
    action = <button className="plan-cta" onClick={onSelect}>{t('renewPrompt')}</button>;
  } else {
    action = <button className={`plan-cta ${plan.recommended ? 'recommended' : ''}`} onClick={onSelect}>
      {plan.id === 'PRO' ? t('upgradeToPro') : t('upgradeToBusiness')}
    </button>;
  }
  if (canDowngrade && isCurrentPlan && plan.id === 'PRO' && status === 'active') {
    action = <button className="plan-cta ghost" onClick={onSelect}>{t('downgradePlan')}</button>;
  }

  return <article className={`plan-card ${plan.id.toLowerCase()} ${isCurrentPlan ? 'current' : ''}`}>
    {plan.recommended && <div className="plan-ribbon"><Sparkles size={13}/>{t('mostPopular')}</div>}
    <header className="plan-card-head">
      {isCurrentPlan && <span className="plan-current-badge"><BadgeCheck size={13}/>{t('currentPlan')}</span>}
      <span className="plan-icon"><Icon size={19}/></span>
      <h3>{t(plan.nameKey || `plan_${plan.id.toLowerCase()}`)}</h3>
    </header>
    <div className="plan-price"><strong>{priceText}</strong><span>{t('perMonth')}</span></div>
    <p className="plan-ai-quota">{plan.aiQuota != null ? `${plan.aiQuota} ${t('aiCallsPerMonth')}` : t('unlimited')}</p>
    <ul className="plan-features">{(plan.features || []).map((key) => <li key={key}><Check size={14}/>{t(key)}</li>)}</ul>
    <div className="plan-card-actions">{action}</div>
    {demo && <p className="plan-demo-note"><Lock size={12}/>{t('demoPaymentNotice')}</p>}
  </article>;
}