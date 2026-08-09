import { ArrowRight, BadgeCheck, Check, X } from 'lucide-react';
import { planById } from '../../subscription/plans.js';

// Manage-subscription view in Settings / subscription page.
// Shows current plan, status, next billing date, and the Manage/Upgrade/Cancel actions.
export default function ManageSubscriptionModal({ subscription, t, lang, onUpgrade, onCancel, onClose }) {
  const plan = planById(subscription?.plan || 'FREE');
  const statusKey = `status_${subscription?.status || 'active'}`;
  const billingDate = subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal-card manage-modal" role="dialog" aria-modal="true" aria-label={t('managePlan')}>
      <header className="manage-header"><span className="manage-icon"><BadgeCheck size={20}/></span><div><h2>{t('managePlan')}</h2><p>{t('subscriptionManageHelp')}</p></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></header>
      <div className="manage-summary">
        <div><span>{t('currentPlan')}</span><strong>{t(plan.nameKey || `plan_${plan.id.toLowerCase()}`)}</strong></div>
        <div><span>{t('status')}</span><strong className={`manage-status ${subscription?.status || 'active'}`}>{t(statusKey)}</strong></div>
        <div><span>{t('nextBillingDate')}</span><strong>{billingDate}</strong></div>
      </div>
      <div className="manage-actions">
        <button className="button secondary" onClick={() => onUpgrade('PRO')}>{t('upgradeTo', { plan: t('planPro') })} <ArrowRight size={16}/></button>
        {subscription?.plan === 'PRO' && <button className="button secondary" onClick={onCancel}>{t('cancelPlan')}</button>}
        <button className="button primary" onClick={onClose}><Check size={16}/>{t('done')}</button>
      </div>
    </section>
  </div>;
}