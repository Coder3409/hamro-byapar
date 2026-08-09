// src/components/ai/AIBusinessSnapshot.jsx
// Business Snapshot - Compact metric cards with AI interpretations
// All values from real application data

import { Wallet, ShoppingBag, TrendingUp, AlertTriangle, Package, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { money } from '../../utils/analytics.js';

const ICONS = {
  revenue: Wallet,
  orders: ShoppingBag,
  profit: DollarSign,
  lowStock: AlertTriangle,
  topProduct: Package,
  slowMovers: TrendingUp,
};

const TONES = {
  revenue: 'green',
  orders: 'blue',
  profit: 'gold',
  lowStock: 'red',
  topProduct: 'purple',
  slowMovers: 'purple',
};

export default function AIBusinessSnapshot({ context, t, lang }) {
  if (!context) return null;

  const today = context.today;
  const inventory = context.inventory;
  const products = context.products;
  const summary = context.summary;

  // Top product
  const topProduct = products.topProducts[0];

  // Slow mover
  const slowMover = products.slowMovers[0];

  // Format comparison indicators
  const formatComparison = (value, label) => {
    if (value === null || value === undefined) return null;
    const isPositive = value >= 0;
    return (
      <span className={`snapshot-comparison ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(value)}% {label}
      </span>
    );
  };

  const cards = [
    {
      key: 'revenue',
      label: t('todaySales'),
      value: today.revenueFormatted,
      comparison: formatComparison(today.vsYesterday, t('vsYesterday')),
      interpretation: today.vsYesterday !== null
        ? (today.vsYesterday >= 0
            ? t('interpretRevenueUp').replace('{pct}', today.vsYesterday)
            : t('interpretRevenueDown').replace('{pct}', Math.abs(today.vsYesterday)))
        : t('noComparison'),
      icon: Wallet,
      tone: 'green',
    },
    {
      key: 'orders',
      label: t('transactions'),
      value: today.orders.toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-IN'),
      comparison: formatComparison(
        today.vsYesterday !== null ? today.vsYesterday : null,
        t('vsYesterday')
      ),
      interpretation: t('interpretOrders').replace('{count}', today.orders),
      icon: ShoppingBag,
      tone: 'blue',
    },
    {
      key: 'profit',
      label: t('estimatedProfit'),
      value: today.profitFormatted,
      comparison: formatComparison(
        today.vsYesterday !== null ? today.vsYesterday : null,
        t('vsYesterday')
      ),
      interpretation: summary.profitMargin > 20
        ? t('interpretProfitHigh').replace('{margin}', summary.profitMargin)
        : summary.profitMargin > 10
          ? t('interpretProfitMedium').replace('{margin}', summary.profitMargin)
          : t('interpretProfitLow').replace('{margin}', summary.profitMargin),
      icon: DollarSign,
      tone: 'gold',
    },
    {
      key: 'lowStock',
      label: t('lowStock'),
      value: inventory.lowStockCount.toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-IN'),
      comparison: inventory.outOfStockCount > 0
        ? <span className="snapshot-comparison critical">{t('outOfStockCount').replace('{count}', inventory.outOfStockCount)}</span>
        : null,
      interpretation: inventory.lowStockCount > 0
        ? t('interpretLowStock').replace('{count}', inventory.lowStockCount)
        : t('interpretStockHealthy'),
      icon: AlertTriangle,
      tone: 'red',
    },
    {
      key: 'topProduct',
      label: t('topProduct'),
      value: topProduct?.name || t('none'),
      comparison: topProduct
        ? <span className="snapshot-comparison positive">{topProduct.sold} {t('unitsSold')}</span>
        : null,
      interpretation: topProduct
        ? t('interpretTopProduct').replace('{product}', topProduct.name).replace('{sold}', topProduct.sold)
        : t('interpretNoTopProduct'),
      icon: Package,
      tone: 'purple',
    },
    {
      key: 'slowMovers',
      label: t('slowMoving'),
      value: products.slowMovers.length.toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-IN'),
      comparison: products.slowMovers.length > 3
        ? <span className="snapshot-comparison negative">{t('manySlowMovers')}</span>
        : null,
      interpretation: products.slowMovers.length > 0
        ? t('interpretSlowMovers').replace('{count}', products.slowMovers.length).replace('{product}', slowMover?.name || t('none'))
        : t('interpretNoSlowMovers'),
      icon: TrendingUp,
      tone: 'purple',
    },
  ];

  return (
    <section className="ai-business-snapshot">
      <div className="snapshot-header">
        <h2>{t('businessSnapshot')}</h2>
        <p className="snapshot-subtitle">{t('snapshotSubtitle')}</p>
      </div>
      <div className="snapshot-grid">
        {cards.map((card) => (
          <article key={card.key} className={`snapshot-card ${card.tone}`}>
            <div className="snapshot-icon">
              <card.icon size={22} />
            </div>
            <div className="snapshot-content">
              <div className="snapshot-header-row">
                <span className="snapshot-label">{card.label}</span>
                {card.comparison}
              </div>
              <div className="snapshot-value">{card.value}</div>
              <div className="snapshot-interpretation">
                <span className="interpretation-icon">💡</span>
                <span>{card.interpretation}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="snapshot-footer">
        <span className="data-source-badge">
          <span className="dot" />
          {t('basedOnShopData')}
        </span>
      </div>
    </section>
  );
}