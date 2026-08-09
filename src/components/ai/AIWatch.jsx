// src/components/ai/AIWatch.jsx
// AI Watch - Proactive monitoring alerts
// "AI is watching your business" concept

import { AlertTriangle, TrendingDown, TrendingUp, Package, Eye, Zap, AlertCircle, Clock, Check, Shield } from 'lucide-react';

const WATCH_TYPES = {
  low_stock: { icon: AlertTriangle, color: 'var(--gold)', label: 'lowStock' },
  out_of_stock: { icon: AlertCircle, color: 'var(--red)', label: 'outOfStock' },
  sales_drop: { icon: TrendingDown, color: 'var(--red)', label: 'salesDrop' },
  sales_spike: { icon: TrendingUp, color: 'var(--green)', label: 'salesSpike' },
  slow_movers: { icon: Package, color: 'var(--purple)', label: 'slowMovers' },
  weekend_prep: { icon: Zap, color: 'var(--purple)', label: 'weekendPrep' },
  high_margin: { icon: TrendingUp, color: 'var(--green)', label: 'highMargin' },
};

export default function AIWatch({ context, t, lang, onNavigate }) {
  if (!context) return null;

  const watchItems = [];

  // 1. Low stock alerts
  if (context.inventory.lowStockCount > 0) {
    context.inventory.lowStockProducts.slice(0, 3).forEach(product => {
      watchItems.push({
        id: `low_stock_${product.id}`,
        type: 'low_stock',
        priority: product.stock === 0 ? 'critical' : 'high',
        title: t('lowStockWatchTitle').replace('{product}', product.name),
        description: t('lowStockWatchDesc')
          .replace('{stock}', product.stock)
          .replace('{threshold}', product.lowStock),
        action: {
          label: t('viewInventory'),
          route: 'inventory',
          params: { productId: product.id, action: 'edit' },
        },
        timestamp: Date.now(),
      });
    });
  }

  // 2. Out of stock alerts
  if (context.inventory.outOfStockCount > 0) {
    context.inventory.outOfStockProducts.slice(0, 3).forEach(product => {
      watchItems.push({
        id: `out_of_stock_${product.id}`,
        type: 'out_of_stock',
        priority: 'critical',
        title: t('outOfStockWatchTitle').replace('{product}', product.name),
        description: t('outOfStockWatchDesc'),
        action: {
          label: t('restockNow'),
          route: 'inventory',
          params: { productId: product.id, action: 'edit' },
        },
        timestamp: Date.now(),
      });
    });
  }

  // 3. Sales drop
  if (context.week.vsLastWeek !== null && context.week.vsLastWeek < -10) {
    watchItems.push({
      id: 'sales_drop_weekly',
      type: 'sales_drop',
      priority: 'high',
      title: t('salesDropWatchTitle'),
      description: t('salesDropWatchDesc').replace('{pct}', Math.abs(context.week.vsLastWeek)),
      action: {
        label: t('viewAnalytics'),
        route: 'analytics',
      },
      timestamp: Date.now(),
    });
  }

  // 4. Daily sales drop
  if (context.today.vsYesterday !== null && context.today.vsYesterday < -20) {
    watchItems.push({
      id: 'sales_drop_daily',
      type: 'sales_drop',
      priority: 'high',
      title: t('dailySalesDropWatchTitle'),
      description: t('dailySalesDropWatchDesc').replace('{pct}', Math.abs(context.today.vsYesterday)),
      action: {
        label: t('viewSales'),
        route: 'sales',
      },
      timestamp: Date.now(),
    });
  }

  // 5. Slow movers
  if (context.products.slowMovers.length > 0) {
    context.products.slowMovers.slice(0, 2).forEach(product => {
      watchItems.push({
        id: `slow_${product.id}`,
        type: 'slow_movers',
        priority: 'medium',
        title: t('slowMoverWatchTitle').replace('{product}', product.name),
        description: t('slowMoverWatchDesc').replace('{sold}', product.sold),
        action: {
          label: t('reviewProduct'),
          route: 'inventory',
          params: { productId: product.id, action: 'edit' },
        },
        timestamp: Date.now(),
      });
    });
  }

  // 5. Weekend preparation
  if (context.busiestDays.length > 0) {
    const topDay = context.busiestDays[0];
    const dayOfWeek = new Date(topDay.date).getDay();
    if (dayOfWeek >= 5 || dayOfWeek === 0) {
      const dayName = new Date(topDay.date).toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-US', { weekday: 'long' });
      watchItems.push({
        id: 'weekend_prep',
        type: 'weekend_prep',
        priority: 'medium',
        title: t('weekendPrepWatchTitle').replace('{day}', dayName),
        description: t('weekendPrepWatchDesc').replace('{revenue}', topDay.revenueFormatted),
        action: {
          label: t('prepareStock'),
          route: 'inventory',
        },
        timestamp: Date.now(),
      });
    }
  }

  // 6. High margin opportunity
  const highMarginProducts = context.products.all
    .filter(p => p.sold > 0 && p.margin > 30)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 1);

  if (highMarginProducts.length > 0) {
    highMarginProducts.forEach(product => {
      watchItems.push({
        id: `high_margin_${product.id}`,
        type: 'high_margin',
        priority: 'low',
        title: t('highMarginWatchTitle').replace('{product}', product.name),
        description: t('highMarginWatchDesc').replace('{margin}', product.margin),
        action: {
          label: t('focusSales'),
          route: 'inventory',
          params: { productId: product.id },
        },
        timestamp: Date.now(),
      });
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedItems = watchItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  if (sortedItems.length === 0) {
    return (
      <section className="ai-watch all-good">
        <div className="watch-all-good">
          <Shield size={48} />
          <h3>{t('allGood')}</h3>
          <p>{t('allGoodDesc')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="ai-watch">
      <div className="watch-header">
        <div className="watch-title-row">
          <div className="watch-icon">
            <Eye size={22} />
          </div>
          <div>
            <h2>{t('aiWatch')}</h2>
            <p className="watch-subtitle">{t('aiWatchSubtitle')}</p>
          </div>
        </div>
        <span className="watch-count">{sortedItems.length} {t('alertsActive')}</span>
      </div>
      <div className="watch-list">
        {sortedItems.map((item, idx) => {
          const typeInfo = WATCH_TYPES[item.type] || { icon: AlertTriangle, color: 'var(--muted)', label: 'alert' };
          const Icon = typeInfo.icon;
          return (
            <article key={`${item.id}-${idx}`} className={`watch-item ${item.priority}`}>
              <div className="watch-item-icon" style={{ background: typeInfo.color }}>
                <Icon size={16} />
              </div>
              <div className="watch-item-content">
                <div className="watch-item-header">
                  <h3>{item.title}</h3>
                  <span className={`watch-priority ${item.priority}`}>{t(item.priority)}</span>
                </div>
                <p className="watch-item-description">{item.description}</p>
                <div className="watch-item-meta">
                  <span className="watch-type">{t(typeInfo.label)}</span>
                </div>
              </div>
              {item.action && (
                <button
                  className="watch-item-action"
                  onClick={() => onNavigate?.(item.action.route, item.action.params)}
                >
                  {item.action.label}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <div className="watch-footer">
        <span className="data-source-badge">
          <span className="dot" />
          {t('basedOnShopData')}
        </span>
        <span className="watch-last-updated">
          <Clock size={12} />
          {t('updatedJustNow')}
        </span>
      </div>
    </section>
  );
}