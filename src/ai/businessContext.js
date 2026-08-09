// src/ai/businessContext.js
// Business Context Engine - Extracts and summarizes all relevant business data for AI consumption
// All data derived from actual application state - NO fake data

import { dateKey, money, summarize, chartData, getInsights } from '../utils/analytics.js';

const DAY_MS = 86_400_000;

/**
 * Build comprehensive business context from actual application data
 * @param {Object} params - Application state
 * @param {Array} params.sales - Sales records
 * @param {Array} params.products - Product inventory
 * @param {Object} params.profile - Shop profile
 * @param {string} params.lang - Current language ('en' or 'ne')
 * @returns {Object} Structured business context for AI
 */
export function buildBusinessContext({ sales = [], products = [], profile = {}, lang = 'en' }) {
  const now = new Date();
  const todayKey = dateKey(now);
  const yesterdayKey = dateKey(new Date(now.getTime() - DAY_MS));
  const weekAgoKey = dateKey(new Date(now.getTime() - 7 * DAY_MS));
  const twoWeeksAgoKey = dateKey(new Date(now.getTime() - 14 * DAY_MS));

  // Today's sales
  const todaySales = sales.filter(s => dateKey(s.createdAt) === todayKey);
  const yesterdaySales = sales.filter(s => dateKey(s.createdAt) === yesterdayKey);
  const thisWeekSales = sales.filter(s => {
    const diff = now - new Date(s.createdAt);
    return diff >= 0 && diff < 7 * DAY_MS;
  });
  const lastWeekSales = sales.filter(s => {
    const diff = now - new Date(s.createdAt);
    return diff >= 7 * DAY_MS && diff < 14 * DAY_MS;
  });

  // Sales aggregates
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.total, 0);
  const thisWeekRevenue = thisWeekSales.reduce((sum, s) => sum + s.total, 0);
  const lastWeekRevenue = lastWeekSales.reduce((sum, s) => sum + s.total, 0);
  const todayProfit = todaySales.reduce((sum, s) => sum + s.total - s.cost, 0);
  const todayOrders = todaySales.length;
  const todayUnits = todaySales.reduce((sum, s) => sum + s.quantity, 0);

  // Revenue comparison
  const revenueVsYesterday = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : null;
  const revenueVsLastWeek = lastWeekRevenue > 0
    ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
    : null;

  // Inventory analysis
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.lowStock);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const healthyProducts = products.filter(p => p.stock > p.lowStock);

  // Product performance
  const productSales = {};
  sales.forEach(sale => {
    if (!productSales[sale.productId]) {
      productSales[sale.productId] = { quantity: 0, revenue: 0, count: 0 };
    }
    productSales[sale.productId].quantity += sale.quantity;
    productSales[sale.productId].revenue += sale.total;
    productSales[sale.productId].count += 1;
  });

  const productPerformance = products.map(p => {
    const ps = productSales[p.id] || { quantity: 0, revenue: 0, count: 0 };
    return {
      id: p.id,
      name: lang === 'ne' ? p.nameNe : p.name,
      nameNe: p.nameNe,
      category: p.category,
      stock: p.stock,
      lowStock: p.lowStock,
      sellingPrice: p.sellingPrice,
      purchasePrice: p.purchasePrice,
      sold: ps.quantity,
      revenue: ps.revenue,
      transactions: ps.count,
      profit: ps.revenue - (p.purchasePrice * ps.quantity),
      margin: ps.revenue > 0 ? Math.round(((ps.revenue - (p.purchasePrice * ps.quantity)) / ps.revenue) * 100) : 0,
      stockStatus: p.stock === 0 ? 'out_of_stock' : p.stock <= p.lowStock ? 'low_stock' : 'healthy',
      daysOfStock: p.sellingPrice > 0 && ps.quantity > 0
        ? Math.round((p.stock / (ps.quantity / Math.max(1, sales.length > 0 ? 30 : 1))) * 30)
        : null
    };
  });

  // Sort by performance
  const topProducts = [...productPerformance]
    .filter(p => p.sold > 0)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const slowMovers = [...productPerformance]
    .filter(p => p.sold > 0 && p.sold <= 3)
    .sort((a, b) => a.sold - b.sold)
    .slice(0, 5);

  const zeroSalesProducts = productPerformance.filter(p => p.sold === 0 && p.stock > 0);

  // Recent sales trend (last 7 days)
  const salesTrend = chartData(sales, 'revenue', 7);

  // Busiest days
  const daySales = {};
  sales.forEach(sale => {
    const day = dateKey(sale.createdAt);
    if (!daySales[day]) daySales[day] = { revenue: 0, orders: 0 };
    daySales[day].revenue += sale.total;
    daySales[day].orders += 1;
  });

  const sortedDays = Object.entries(daySales)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 3);

  // Key metrics summary
  const summary = summarize(sales, products);

  return {
    // Meta
    generatedAt: now.toISOString(),
    shopName: profile.shopName || 'Your Shop',
    currency: profile.currency || 'NPR / Rs.',
    lang,

    // Today's snapshot
    today: {
      revenue: todayRevenue,
      revenueFormatted: money(todayRevenue, lang),
      profit: todayProfit,
      profitFormatted: money(todayProfit, lang),
      orders: todayOrders,
      unitsSold: todayUnits,
      avgOrderValue: todayOrders > 0 ? money(Math.round(todayRevenue / todayOrders), lang) : money(0, lang),
      vsYesterday: revenueVsYesterday,
      vsYesterdayLabel: revenueVsYesterday !== null
        ? (revenueVsYesterday >= 0 ? `↑ ${revenueVsYesterday}% vs yesterday` : `↓ ${Math.abs(revenueVsYesterday)}% vs yesterday`)
        : 'No data for comparison',
    },

    // Weekly snapshot
    week: {
      revenue: thisWeekRevenue,
      revenueFormatted: money(thisWeekRevenue, lang),
      vsLastWeek: revenueVsLastWeek,
      vsLastWeekLabel: revenueVsLastWeek !== null
        ? (revenueVsLastWeek >= 0 ? `↑ ${revenueVsLastWeek}% vs last week` : `↓ ${Math.abs(revenueVsLastWeek)}% vs last week`)
        : 'Insufficient data',
      daysWithSales: Object.keys(daySales).length,
    },

    // Inventory snapshot
    inventory: {
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      healthyCount: healthyProducts.length,
      lowStockProducts: lowStockProducts.map(p => ({
        id: p.id,
        name: lang === 'ne' ? p.nameNe : p.name,
        stock: p.stock,
        lowStock: p.lowStock,
        category: p.category,
      })),
      outOfStockProducts: outOfStockProducts.map(p => ({
        id: p.id,
        name: lang === 'ne' ? p.nameNe : p.name,
        category: p.category,
      })),
    },

    // Product performance
    products: {
      topProducts,
      slowMovers,
      zeroSalesProducts: zeroSalesProducts.map(p => ({
        id: p.id,
        name: lang === 'ne' ? p.nameNe : p.name,
        stock: p.stock,
        category: p.category,
      })),
      all: productPerformance,
    },

    // Sales trend
    salesTrend: salesTrend.map(d => ({
      date: d.date.toISOString().split('T')[0],
      revenue: d.value,
      revenueFormatted: money(d.value, lang),
    })),

    // Busiest days
    busiestDays: sortedDays.map(([date, data]) => ({
      date,
      revenue: data.revenue,
      revenueFormatted: money(data.revenue, lang),
      orders: data.orders,
    })),

    // Summary stats
    summary: {
      totalRevenue: summary.revenue,
      totalRevenueFormatted: money(summary.revenue, lang),
      totalProfit: summary.profit,
      totalProfitFormatted: money(summary.profit, lang),
      totalTransactions: summary.transactions,
      totalUnitsSold: summary.unitsSold,
      profitMargin: summary.revenue > 0 ? Math.round((summary.profit / summary.revenue) * 100) : 0,
      lowStockCount: summary.lowStock,
      change: summary.change,
      changeLabel: summary.change >= 0 ? `↑ ${summary.change}%` : `↓ ${Math.abs(summary.change)}%`,
    },

    // AI Insights (from existing system)
    aiInsights: getInsights(sales, products, lang),

    // Data availability flags
    hasData: {
      sales: sales.length > 0,
      todaySales: todaySales.length > 0,
      products: products.length > 0,
      inventory: products.length > 0,
      history: sales.length > 10,
      comparisons: yesterdaySales.length > 0 || lastWeekSales.length > 0,
    },
  };
}

/**
 * Get a focused context for a specific question type
 * @param {Object} fullContext - Full business context from buildBusinessContext
 * @param {string} questionType - Type of question being asked
 * @returns {Object} Focused context
 */
export function getFocusedContext(fullContext, questionType) {
  const base = {
    shopName: fullContext.shopName,
    currency: fullContext.currency,
    lang: fullContext.lang,
    generatedAt: fullContext.generatedAt,
  };

  switch (questionType) {
    case 'today':
    case 'sales':
      return {
        ...base,
        today: fullContext.today,
        week: fullContext.week,
        recentSales: fullContext.salesTrend.slice(-7),
      };

    case 'best':
    case 'top':
      return {
        ...base,
        topProducts: fullContext.products.topProducts,
        summary: fullContext.summary,
      };

    case 'slow':
    case 'not_selling':
      return {
        ...base,
        slowMovers: fullContext.products.slowMovers,
        zeroSalesProducts: fullContext.products.zeroSalesProducts,
        summary: fullContext.summary,
      };

    case 'stock':
    case 'restock':
      return {
        ...base,
        inventory: fullContext.inventory,
        products: fullContext.products.all.filter(p => p.stockStatus !== 'healthy'),
      };

    case 'profit':
      return {
        ...base,
        today: fullContext.today,
        summary: fullContext.summary,
        products: fullContext.products.all.filter(p => p.sold > 0),
      };

    case 'compare':
      return {
        ...base,
        week: fullContext.week,
        salesTrend: fullContext.salesTrend,
        summary: fullContext.summary,
      };

    case 'watch':
      return {
        ...base,
        inventory: fullContext.inventory,
        summary: fullContext.summary,
        aiInsights: fullContext.aiInsights,
      };

    default:
      return fullContext;
  }
}

export { buildBusinessContext as default };