import { AlertTriangle, Check, X } from 'lucide-react';

// Cancellation confirmation for Hamro Byapar subscriptions.
// Requires explicit confirmation; never deletes subscription or billing records —
// it flips status to 'cancelled' and downgrades premium access.
export default function CancelConfirmModal({ subscription, t, onConfirm, onClose }) {
  const planLabel = t(subscription?.plan?.toLowerCase?.() === 'pro' ? 'planPro' : subscription?.plan?.toLowerCase?.() === 'business' ? 'planBusiness' : 'planFree');
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal-card cancel-modal" role="dialog" aria-modal="true" aria-label={t('cancelPlan')}>
      <header className="cancel-header"><span className="cancel-icon"><AlertTriangle size={20}/></span><div><h2>{t('cancelConfirmTitle')}</h2><p>{t('cancelConfirmBody').replace('{plan}', planLabel)}</p></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></header>
      <p className="cancel-note"><AlertTriangle size={14}/>{t('cancelNote')}</p>
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>{t('keepPlan')}</button>
        <button className="button danger" onClick={onConfirm}><Check size={16}/>{t('confirmCancel')}</button>
      </div>
    </section>
  </div>;
}