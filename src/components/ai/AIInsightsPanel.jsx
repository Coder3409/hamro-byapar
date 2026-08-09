// src/components/ai/AIInsightsPanel.jsx
// AI Insights Panel - Displays prioritized insights with WHY, DATA, ACTION

import { AlertTriangle, TrendingUp, TrendingDown, Package, DollarSign, Calendar, Lightbulb, Check, ArrowRight, AlertCircle, Info, Zap } from 'lucide-react';

const PRIORITY_ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  opportunity: Zap,
  insight: Lightbulb,
};

const PRIORITY_LABELS = {
  critical: 'critical',
  warning: 'warning',
  opportunity: 'opportunity',
  insight: 'insight',
};

const ICONS = {
  alert_circle: AlertCircle,
  alert_triangle: AlertTriangle,
  trending_up: TrendingUp,
  trending_down: TrendingDown,
  package: Package,
  dollar_sign: DollarSign,
  calendar: Calendar,
  info: Info,
};

export default function AIInsightsPanel({ insights, t, lang, onNavigate }) {
  if (!insights || insights.length === 0) {
    return (
      <section className="ai-insights-panel empty">
        <div className="insights-empty">
          <Info size={48} />
          <h3>{t('noInsights')}</h3>
          <p>{t('noInsightsDesc')}</p>
        </div>
      </section>
    );
  }

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'alert_circle': return <AlertCircle size={20} />;
      case 'alert_triangle': return <AlertTriangle size={20} />;
      case 'trending_up': return <TrendingUp size={20} />;
      case 'trending_down': return <TrendingDown size={20} />;
      case 'package': return <Package size={20} />;
      case 'dollar_sign': return <DollarSign size={20} />;
      case 'calendar': return <Calendar size={20} />;
      case 'info': return <Info size={20} />;
      default: return null;
    }
  };

  return (
    <section className="ai-insights-panel">
      <div className="insights-header">
        <h2>{t('aiInsights')}</h2>
        <span className="insights-count">{insights.length} {t('insightsFound')}</span>
      </div>
      <div className="insights-list">
        {insights.map((insight, idx) => (
          <article key={`${insight.id}-${idx}`} className={`insight-card ${insight.priority}`}>
            <div className="insight-header">
              <div className="insight-icon-wrapper">
                {getIcon(insight.icon)}
              </div>
              <div className="insight-title-section">
                <h3>{insight.title}</h3>
                <span className={`insight-priority ${insight.priority}`}>{t(PRIORITY_LABELS[insight.priority] || insight.priority)}</span>
              </div>
            </div>
            <div className="insight-body">
              <p className="insight-explanation">{insight.explanation}</p>
              <div className="insight-why">
                <strong>{t('why')}:</strong> {insight.why}
              </div>
            </div>
            {insight.action && (
              <div className="insight-action">
                <button
                  className="insight-action-btn"
                  onClick={() => onNavigate?.(insight.action.route, insight.action.params)}
                >
                  {insight.action.label}
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="insights-footer">
        <span className="data-source-badge">
          <span className="dot" />
          {t('basedOnShopData')}
        </span>
      </div>
    </section>
  );
}
