// src/ai/insightEngine.js
// Insight Engine - Generates actionable insights from business context
// All insights derived from actual data - NO fabricated insights

import { money } from '../utils/analytics.js';

/**
 * Priority levels for insights
 */
export const PRIORITY = {
  CRITICAL: 'critical',   // Needs immediate attention
  WARNING: 'warning',     // Potential business problem
  OPPORTUNITY: 'opportunity', // Potential growth opportunity
  INSIGHT: 'insight',     // Useful business information
};

/**
 * Generate all insights from business context
 * @param {Object} context - Business context from buildBusinessContext
 * @returns {Array} Array of insight objects with priority, title, explanation, why, action, data
 */
export function generateInsights(context) {
  const insights = [];

  // 1. Low Stock Alerts (CRITICAL/WARNING)
  if (context.inventory.outOfStockCount > 0) {
    insights.push({
      id: 'out_of_stock',
      priority: PRIORITY.CRITICAL,
      category: 'inventory',
      title: context.lang === 'ne'
        ? `${context.inventory.outOfStockCount} सामानको मौज्दात सकिएको छ`
        : `${context.inventory.outOfStockCount} product${context.inventory.outOfStockCount > 1 ? 's are' : ' is'} out of stock`,
      explanation: context.lang === 'ne'
        ? 'यी सामानहरूको मौज्दात पूर्ण रूपमा सकिएको छ र तत्काल पुनः स्टक गर्न आवश्यक छ।'
        : 'These products have zero stock and need immediate restocking.',
      why: context.inventory.outOfStockProducts.map(p =>
        `${p.name} (${p.category})`
      ).join(', '),
      action: {
        label: context.lang === 'ne' ? 'मौज्दात हेर्नुहोस्' : 'View Inventory',
        route: 'inventory',
        type: 'navigate',
      },
      data: {
        count: context.inventory.outOfStockCount,
        products: context.inventory.outOfStockProducts,
      },
      icon: 'alert_circle',
    });
  }

  if (context.inventory.lowStockCount > 0) {
    insights.push({
      id: 'low_stock',
      priority: context.inventory.lowStockCount > 3 ? PRIORITY.WARNING : PRIORITY.INSIGHT,
      category: 'inventory',
      title: context.lang === 'ne'
        ? `${context.inventory.lowStockCount} सामानहरू कम मौज्दातमा छन्`
        : `${context.inventory.lowStockCount} product${context.inventory.lowStockCount > 1 ? 's are' : ' is'} running low on stock`,
      explanation: context.lang === 'ne'
        ? 'यी सामानहरूको मौज्दात कम छ र चाँडै पुनः स्टक गर्न आवश्यक हुन सक्छ।'
        : 'These products are running low and may need restocking soon.',
      why: context.inventory.lowStockProducts.map(p =>
        `${p.name}: ${p.stock}/${p.lowStock} ${context.lang === 'ne' ? 'वटा' : 'units'}`
      ).join(', '),
      action: {
        label: context.lang === 'ne' ? 'मौज्दात हेर्नुहोस्' : 'View Inventory',
        route: 'inventory',
        type: 'navigate',
      },
      data: {
        count: context.inventory.lowStockCount,
        products: context.inventory.lowStockProducts,
      },
      icon: 'alert_triangle',
    });
  }

  // 2. Best Seller (INSIGHT/OPPORTUNITY)
  const topProduct = context.products.topProducts[0];
  if (topProduct && topProduct.sold > 0) {
    insights.push({
      id: 'best_seller',
      priority: PRIORITY.INSIGHT,
      category: 'sales',
      title: context.lang === 'ne'
        ? `${topProduct.name} सबैभन्दा धेरै बिक्री भइरहेको छ`
        : `${topProduct.name} is your best-selling product`,
      explanation: context.lang === 'ne'
        ? `यो सामानले ${topProduct.sold} ${context.lang === 'ne' ? 'वटा' : 'units'} बिक्री गरी ${money(topProduct.revenue, context.lang)} रकम उठाएको छ।`
        : `This product sold ${topProduct.sold} units generating ${money(topProduct.revenue, context.lang)} in revenue.`,
      why: context.lang === 'ne'
        ? `पछिल्ला बिक्रीमध्ये यसको मात्रा सबैभन्दा धेरै छ। नाफा प्रतिशत: ${topProduct.margin}%।`
        : `It has the highest sales volume in recent records. Profit margin: ${topProduct.margin}%.`,
      action: {
        label: context.lang === 'ne' ? 'सामान हेर्नुहोस्' : 'View Product',
        route: 'inventory',
        type: 'navigate',
        params: { productId: topProduct.id },
      },
      data: {
        product: topProduct,
      },
      icon: 'trending_up',
    });
  }

  // 3. Sales Trend (INSIGHT/WARNING/OPPORTUNITY)
  if (context.week.vsLastWeek !== null) {
    const isPositive = context.week.vsLastWeek >= 0;
    insights.push({
      id: 'sales_trend_weekly',
      priority: isPositive ? PRIORITY.OPPORTUNITY : PRIORITY.WARNING,
      category: 'sales',
      title: context.lang === 'ne'
        ? isPositive ? 'बिक्री गत हप्ताभन्दा बढेको छ' : 'बिक्री गत हप्ताभन्दा घटेको छ'
        : isPositive ? 'Sales increased vs last week' : 'Sales decreased vs last week',
      explanation: context.lang === 'ne'
        ? `यो हप्ताको बिक्री गत हप्ताको तुलनामा ${Math.abs(context.week.vsLastWeek)}% ${isPositive ? 'बढेको' : 'घटेको'} छ।`
        : `This week's sales are ${Math.abs(context.week.vsLastWeek)}% ${isPositive ? 'higher' : 'lower'} than last week.`,
      why: context.lang === 'ne'
        ? `गत हप्ता रकम: ${money(context.week.lastWeekRevenue, context.lang)}। यस हप्ता: ${money(context.week.revenue, context.lang)}।`
        : `Last week: ${money(context.week.lastWeekRevenue, context.lang)}. This week: ${money(context.week.revenue, context.lang)}.`,
      action: {
        label: context.lang === 'ne' ? 'विश्लेषण हेर्नुहोस्' : 'View Analytics',
        route: 'analytics',
        type: 'navigate',
      },
      data: {
        change: context.week.vsLastWeek,
        thisWeek: context.week.revenue,
        lastWeek: context.week.lastWeekRevenue,
      },
      icon: isPositive ? 'trending_up' : 'trending_down',
    });
  }

  // 4. Daily Sales Comparison (INSIGHT)
  if (context.today.vsYesterday !== null) {
    const isPositive = context.today.vsYesterday >= 0;
    insights.push({
      id: 'sales_trend_daily',
      priority: PRIORITY.INSIGHT,
      category: 'sales',
      title: context.lang === 'ne'
        ? isPositive ? 'आजको बिक्री हिजोभन्दा बढी छ' : 'आजको बिक्री हिजोभन्दा कम छ'
        : isPositive ? 'Today\'s sales beat yesterday' : 'Today\'s sales below yesterday',
      explanation: context.lang === 'ne'
        ? `आजको बिक्री हिजोको तुलनामा ${Math.abs(context.today.vsYesterday)}% ${isPositive ? 'बढी' : 'कम'} छ।`
        : `Today's sales are ${Math.abs(context.today.vsYesterday)}% ${isPositive ? 'higher' : 'lower'} than yesterday.`,
      why: context.lang === 'ne'
        ? `हिजो: ${money(context.today.yesterdayRevenue, context.lang)}। आज: ${context.today.revenueFormatted}।`
        : `Yesterday: ${money(context.today.yesterdayRevenue, context.lang)}. Today: ${context.today.revenueFormatted}.`,
      action: {
        label: context.lang === 'ne' ? 'बिक्री हेर्नुहोस्' : 'View Sales',
        route: 'sales',
        type: 'navigate',
      },
      data: {
        change: context.today.vsYesterday,
      },
      icon: isPositive ? 'trending_up' : 'trending_down',
    });
  }

  // 5. Slow Movers (WARNING/OPPORTUNITY)
  if (context.products.slowMovers.length > 0) {
    const slowCount = context.products.slowMovers.length;
    insights.push({
      id: 'slow_movers',
      priority: slowCount > 3 ? PRIORITY.WARNING : PRIORITY.INSIGHT,
      category: 'products',
      title: context.lang === 'ne'
        ? `${slowCount} सामानहरू कम बिक्री भइरहेका छन्`
        : `${slowCount} product${slowCount > 1 ? 's are' : ' is'} selling slowly`,
      explanation: context.lang === 'ne'
        ? 'यी सामानहरूले हालै कम बिक्री गरेका छन्। यिनीहरूको स्टक र मूल्यांकन गर्नुपर्छ।'
        : 'These products have had low sales recently. Review their stock and pricing.',
      why: context.products.slowMovers.map(p =>
        `${p.name}: ${p.sold} ${context.lang === 'ne' ? 'वटा बिक्री' : 'units sold'}`
      ).join(', '),
      action: {
        label: context.lang === 'ne' ? 'उत्पादनहरू हेर्नुहोस्' : 'View Products',
        route: 'inventory',
        type: 'navigate',
      },
      data: {
        count: slowCount,
        products: context.products.slowMovers,
      },
      icon: 'trending_down',
    });
  }

  // 6. Zero Sales Products with Stock (OPPORTUNITY)
  if (context.products.zeroSalesProducts.length > 0) {
    const zeroCount = context.products.zeroSalesProducts.length;
    insights.push({
      id: 'zero_sales_with_stock',
      priority: PRIORITY.OPPORTUNITY,
      category: 'products',
      title: context.lang === 'ne'
        ? `${zeroCount} सामानहरूमा स्टक छ तर बिक्री ० छ`
        : `${zeroCount} product${zeroCount > 1 ? 's have' : ' has'} stock but zero sales`,
      explanation: context.lang === 'ने'
        ? 'यी सामानहरू मौज्दातमा छन् तर बिक्री भएको छैन। प्रचार वा मूल्य परिवर्तन आवश्यक हुन सक्छ।'
        : 'These products are in stock but haven\'t sold. Consider promotion or price review.',
      why: context.products.zeroSalesProducts.map(p =>
        `${p.name}: ${p.stock} ${context.lang === 'ne' ? 'वटा स्टकमा' : 'units in stock'}`
      ).join(', '),
      action: {
        label: context.lang === 'ne' ? 'उत्पादनहरू हेर्नुहोस्' : 'View Products',
        route: 'inventory',
        type: 'navigate',
      },
      data: {
        count: zeroCount,
        products: context.products.zeroSalesProducts,
      },
      icon: 'package',
    });
  }

  // 7. High Margin Products (OPPORTUNITY)
  const highMarginProducts = context.products.all
    .filter(p => p.sold > 0 && p.margin > 40)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 3);

  if (highMarginProducts.length > 0) {
    insights.push({
      id: 'high_margin_products',
      priority: PRIORITY.OPPORTUNITY,
      category: 'products',
      title: context.lang === 'ne'
        ? `${highMarginProducts.length} उच्च नाफा प्रतिशतका सामानहरू`
        : `${highMarginProducts.length} high-margin product${highMarginProducts.length > 1 ? 's' : ''} identified`,
      explanation: context.lang === 'ne'
        ? 'यी सामानहरूमा राम्रो नाफा प्रतिशत छ। यिनीहरू प्राथमिकतामा राखेर बिक्री बढाउन सकिन्छ।'
        : 'These products have strong profit margins. Prioritize them to increase profitability.',
      why: highMarginProducts.map(p =>
        `${p.name}: ${p.margin}% ${context.lang === 'ne' ? 'नाफा' : 'margin'}`
      ).join(', '),
      action: {
        label: context.lang === 'ne' ? 'उत्पादनहरू हेर्नुहोस्' : 'View Products',
        route: 'inventory',
        type: 'navigate',
      },
      data: {
        products: highMarginProducts,
      },
      icon: 'dollar_sign',
    });
  }

  // 8. Weekend Sales Pattern (INSIGHT)
  if (context.busiestDays.length > 0) {
    const topDay = context.busiestDays[0];
    const dayName = new Date(topDay.date).toLocaleDateString(context.lang === 'ne' ? 'ne-NP' : 'en-US', { weekday: 'long' });
    insights.push({
      id: 'busiest_day',
      priority: PRIORITY.INSIGHT,
      category: 'sales',
      title: context.lang === 'ne'
        ? `${dayName} सबैभन्दा व्यस्त बिक्री दिन छ`
        : `${dayName} is your busiest sales day`,
      explanation: context.lang === 'ne'
        ? `यो दिनमा ${topDay.revenueFormatted} बिक्री भएको छ (${topDay.orders} अर्डरहरू)।`
        : `This day generated ${topDay.revenueFormatted} in revenue (${topDay.orders} orders).`,
      why: context.lang === 'ne'
        ? `गत दिनहरूको तुलनामा यो दिन लगातार बढी बिक्री गर्दछ।`
        : `This day consistently outperforms others in recent history.`,
      action: {
        label: context.lang === 'ne' ? 'विश्लेषण हेर्नुहोस्' : 'View Analytics',
        route: 'analytics',
        type: 'navigate',
      },
      data: {
        day: dayName,
        revenue: topDay.revenue,
        orders: topDay.orders,
      },
      icon: 'calendar',
    });
  }

  // 9. Profit Margin Alert (WARNING)
  if (context.summary.profitMargin < 15 && context.summary.totalRevenue > 0) {
    insights.push({
      id: 'low_profit_margin',
      priority: PRIORITY.WARNING,
      category: 'finance',
      title: context.lang === 'ne'
        ? `कम नाफा प्रतिशत: ${context.summary.profitMargin}%`
        : `Low profit margin: ${context.summary.profitMargin}%`,
      explanation: context.lang === 'ne'
        ? 'तपाईंको समग्र नाफा प्रतिशत १५% भन्दा कम छ। खरिद मूल्य वा बिक्री मूल्य पुनर्मूल्यांकन गर्नुहोस्।'
        : 'Your overall profit margin is below 15%. Review purchase prices or selling prices.',
      why: context.lang === 'ne'
        ? `कुल आम्दानी: ${context.summary.totalRevenueFormatted}। कुल नाफा: ${context.summary.totalProfitFormatted}।`
        : `Total revenue: ${context.summary.totalRevenueFormatted}. Total profit: ${context.summary.totalProfitFormatted}.`,
      action: {
        label: context.lang === 'ne' ? 'उत्पादनहरू हेर्नुहोस्' : 'Review Products',
        route: 'inventory',
        type: 'navigate',
      },
      data: {
        margin: context.summary.profitMargin,
        revenue: context.summary.totalRevenue,
        profit: context.summary.totalProfit,
      },
      icon: 'dollar_sign',
    });
  }

  // 10. No Sales Data (EMPTY STATE)
  if (!context.hasData.sales) {
    insights.push({
      id: 'no_sales_data',
      priority: PRIORITY.INSIGHT,
      category: 'empty',
      title: context.lang === 'ne' ? 'अहिलेसम्म कुनै बिक्री डेटा छैन' : 'No sales data recorded yet',
      explanation: context.lang === 'ne'
        ? 'बिक्री रेकर्ड गर्नुभएपछि Hamro AI तपाईंको व्यापारको प्रवृत्ति र अवसरहरू पहिचान गर्न सक्छ।'
        : 'Once you record sales, Hamro AI will identify trends and opportunities for your business.',
      why: context.lang === 'ne'
        ? 'बिक्री डेटा नभएकोमा AI कुनै अन्तर्दृष्टि प्रदान गर्न सक्दैन।'
        : 'Without sales data, AI cannot provide meaningful insights.',
      action: {
        label: context.lang === 'ne' ? 'बिक्री थप्नुहोस्' : 'Add Sale',
        route: 'sales',
        type: 'navigate',
      },
      data: {},
      icon: 'info',
    });
  }

  // 11. No Inventory Data (EMPTY STATE)
  if (!context.hasData.inventory) {
    insights.push({
      id: 'no_inventory_data',
      priority: PRIORITY.INSIGHT,
      category: 'empty',
      title: context.lang === 'ne' ? 'अहिलेसम्म कुनै मौज्दात डेटा छैन' : 'No inventory data recorded yet',
      explanation: context.lang === 'ne'
        ? 'उत्पादनहरू थप्नुभएपछि Hamro AI मौज्दात निगरानी गर्न र कम स्टक सूचना दिन सक्छ।'
        : 'Once you add products, Hamro AI will monitor stock levels and alert you when restocking is needed.',
      why: context.lang === 'ne'
        ? 'मौज्दात डेटा नभएकोमा स्टक सूचनाहरू उपलब्ध छैनन्।'
        : 'Without inventory data, stock alerts are unavailable.',
      action: {
        label: context.lang === 'ne' ? 'उत्पादन थप्नुहोस्' : 'Add Product',
        route: 'inventory',
        type: 'navigate',
      },
      data: {},
      icon: 'info',
    });
  }

  // Sort by priority: CRITICAL > WARNING > OPPORTUNITY > INSIGHT
  const priorityOrder = {
    [PRIORITY.CRITICAL]: 0,
    [PRIORITY.WARNING]: 1,
    [PRIORITY.OPPORTUNITY]: 2,
    [PRIORITY.INSIGHT]: 3,
  };

  return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export { generateInsights as default };
