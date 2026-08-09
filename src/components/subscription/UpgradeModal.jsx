import { ArrowRight, Check, Crown, Lock, Sparkles, X } from 'lucide-react';
import { missingPlanFor } from '../../subscription/access.js';

// Benefit labels shown for each upgrade target, flattened to translation keys.
const UPGRADE_BENEFITS = {
  emailAlerts: ['f_email_alerts', 'f_reports', 'f_export_reports', 'f_priority_support'],
  exportReports: ['f_export_reports', 'f_reports', 'f_sales_analytics', 'f_priority_support'],
  advancedAnalytics: ['f_sales_analytics', 'f_export_reports', 'f_inventory_analytics', 'f_priority_support'],
  advancedReports: ['f_advanced_reports', 'f_sales_analytics', 'f_automation', 'f_priority_support'],
  multiStaff: ['multiStaff', 'f_multi_user', 'f_advanced_reports', 'f_automation'],
  aiLimit: ['f_ai_advanced', 'f_ai_limit_high', 'f_sales_analytics', 'f_priority_support'],
  ai_limit: ['f_ai_advanced', 'f_ai_limit_high', 'f_sales_analytics', 'f_priority_support'],
};

// Professional upgrade wall — shown when a FREE (or lower-tier) user attempts a
// premium feature. Explains the feature, the plan required, the benefits, and
// gives a clear upgrade path. Never a raw "access denied".
export default function UpgradeModal({ capability = 'advancedAnalytics', reason, subscription, t, onUpgrade, onClose }) {
  const requiredPlan = missingPlanFor(capability, subscription);
  const requiredId = requiredPlan?.id || (reason === 'ai_limit' ? 'PRO' : 'PRO');
  const requiredLabel = requiredId === 'BUSINESS' ? t('planBusiness') : t('planPro');
  const benefitsKey = reason === 'ai_limit' || reason === 'aiLimit' ? 'aiLimit' : capability;
  const benefits = UPGRADE_BENEFITS[benefitsKey] || UPGRADE_BENEFITS.advancedAnalytics;
  const featureLabel = reason === 'ai_limit' || reason === 'aiLimit' ? t('aiAssistant') : t(capability);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal-card upgrade-modal" role="dialog" aria-modal="true" aria-label={t('upgradePlan')}>
      <header className="upgrade-header">
        <span className="upgrade-lock"><Crown size={22}/></span>
        <div><h2>{t('unlockFeature').replace('{feature}', featureLabel)}</h2><p>{t('upgradePrompt').replace('{feature}', featureLabel).replace('{plan}', requiredLabel)}</p></div>
        <button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button>
      </header>
      <div className="upgrade-required"><span><Lock size={15}/>{t('requiredPlan')}</span><strong>{requiredLabel}</strong></div>
      <div className="upgrade-benefits"><div className="upgrade-benefit-head"><Sparkles size={17}/>{t('whyUpgrade')}</div><ul>{benefits.map((key) => <li key={key}><Check size={14}/>{t(key)}</li>)}</ul></div>
      <div className="upgrade-actions">
        <button className="button secondary" onClick={onClose}>{t('notNow')}</button>
        <button className="button primary" onClick={() => onUpgrade(requiredId)}>{t('upgradeTo').replace('{plan}', requiredLabel)} <ArrowRight size={16}/></button>
      </div>
    </section>
  </div>;
}
