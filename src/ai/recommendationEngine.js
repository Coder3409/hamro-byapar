// src/ai/recommendationEngine.js
// Recommendation Engine - Generates proactive, actionable recommendations tied to existing routes
// All recommendations based on actual business data - NO fake recommendations

import { money } from '../utils/analytics.js';

/**
 * Generate proactive recommendations from business context
 * Each recommendation connects to existing application routes
 * @param {Object} context - Business context from buildBusinessContext
 * @returns {Array} Array of recommendation objects
 */
export function generateRecommendations(context) {
  const recommendations = [];

  // 1. Restock Recommendations
  if (context.inventory.lowStockCount > 0) {
    context.inventory.lowStockProducts.forEach(product => {
      recommendations.push({
        id: `restock_${product.id}`,
        priority: product.stock === 0 ? 'critical' : 'high',
        category: 'inventory',
        title: context.lang === 'ne'
          ? `${product.name} पुनः स्टक गर्नुहोस्`
          : `Restock ${product.name}`,
        explanation: context.lang === 'ne'
          ? `मौज्दात ${product.stock}/${product.lowStock} वटा छ। यो सामान चाँडै सकिन सक्छ।`
          : `Stock is ${product.stock}/${product.lowStock} units. This product may run out soon.`,
        why: context.lang === 'ne'
          ? `वर्तमान स्टक: ${product.stock}। न्यूनतम सीमा: ${product.lowStock}।`
          : `Current stock: ${product.stock}. Minimum threshold: ${product.lowStock}.`,
        action: {
          label: context.lang === 'ne' ? 'मौज्दात अपडेट गर्नुहोस्' : 'Update Stock',
          route: 'inventory',
          type: 'navigate',
          params: { productId: product.id, action: 'edit' },
        },
        data: {
          productId: product.id,
          productName: context.lang === 'ne' ? product.name : product.name,
          currentStock: product.stock,
          threshold: product.lowStock,
        },
        icon: 'package',
      });
    });
  }

  // 2. Promote Best Sellers
  const topProduct = context.products.topProducts[0];
  if (topProduct && topProduct.sold > 10) {
    recommendations.push({
      id: `promote_${topProduct.id}`,
      priority: 'medium',
      category: 'marketing',
      title: context.lang === 'ne'
        ? `${topProduct.name} लाई प्रचार गर्नुहोस्`
        : `Promote ${topProduct.name}`,
      explanation: context.lang === 'ne'
        ? `यो तपाईंको सबैभन्दा लोकप्रिय सामान छ (${topProduct.sold} ${context.lang === 'ne' ? 'वटा बिक्री' : 'units sold'})। प्रचारले बिक्री बढाउन सक्छ।`
        : `This is your best seller (${topProduct.sold} units sold). Promotion could increase sales further.`,
      why: context.lang === 'ने'
        ? `उच्च माग र राम्रो नाफा प्रतिशत (${topProduct.margin}%)।`
        : `High demand and good profit margin (${topProduct.margin}%).`,
      action: {
        label: context.lang === 'ne' ? 'उत्पादन हेर्नुहोस्' : 'View Product',
        route: 'inventory',
        type: 'navigate',
        params: { productId: topProduct.id },
      },
      data: {
        productId: topProduct.id,
        sold: topProduct.sold,
        margin: topProduct.margin,
      },
      icon: 'megaphone',
    });
  }

  // 3. Review Slow Movers
  if (context.products.slowMovers.length > 0) {
    const slowProduct = context.products.slowMovers[0];
    recommendations.push({
      id: `review_${slowProduct.id}`,
      priority: 'medium',
      category: 'products',
      title: context.lang === 'ne'
        ? `${slowProduct.name} को मूल्यांकन गर्नुहोस्`
        : `Review ${slowProduct.name}`,
      explanation: context.lang === 'ne'
        ? `यो सामान हालै कम बिक्री भइरहेको छ (${slowProduct.sold} ${context.lang === 'ne' ? 'वटा बिक्री' : 'units sold'})। मूल्य वा स्टक पुनर्मूल्यांकन गर्नुहोस्।`
        : `This product has low sales recently (${slowProduct.sold} units sold). Review pricing or stock.`,
      why: context.lang === 'ne'
        ? `कम बिक्री र स्टक: ${slowProduct.stock} ${context.lang === 'ne' ? 'वटा' : 'units'}।`
        : `Low sales and stock: ${slowProduct.stock} units.`,
      action: {
        label: context.lang === 'ne' ? 'उत्पादन हेर्नुहोस्' : 'View Product',
        route: 'inventory',
        type: 'navigate',
        params: { productId: slowProduct.id, action: 'edit' },
      },
      data: {
        productId: slowProduct.id,
        sold: slowProduct.sold,
        stock: slowProduct.stock,
      },
      icon: 'alert_triangle',
    });
  }

  // 4. Zero Sales with Stock - Consider Promotion
  if (context.products.zeroSalesProducts.length > 0) {
    const zeroProduct = context.products.zeroSalesProducts[0];
    recommendations.push({
      id: `promote_zero_${zeroProduct.id}`,
      priority: 'low',
      category: 'marketing',
      title: context.lang === 'ne'
        ? `${zeroProduct.name} को लागि प्रचार सिर्जना गर्नुहोस्`
        : `Create promotion for ${zeroProduct.name}`,
      explanation: context.lang === 'ne'
        ? `यो सामानको ${zeroProduct.stock} ${context.lang === 'ne' ? 'वटा' : 'units'} स्टक छ तर बिक्री ० छ। प्रचार वा डिस्काउन्ट विचारणीय छ।`
        : `This product has ${zeroProduct.stock} units in stock but zero sales. Consider promotion or discount.`,
      why: context.lang === 'ne'
        ? `स्टकमा पैसा बन्डै गएको छ। बिक्री सुरु गर्न प्रचार आवश्यक।`
        : `Capital tied up in stock. Promotion needed to start sales.`,
      action: {
        label: context.lang === 'ne' ? 'उत्पादन हेर्नुहोस्' : 'View Product',
        route: 'inventory',
        type: 'navigate',
        params: { productId: zeroProduct.id, action: 'edit' },
      },
      data: {
        productId: zeroProduct.id,
        stock: zeroProduct.stock,
      },
      icon: 'tag',
    });
  }

  // 5. Weekend Stock Preparation
  if (context.busiestDays.length > 0) {
    const topDay = context.busiestDays[0];
    const dayName = new Date(topDay.date).toLocaleDateString(context.lang === 'ne' ? 'ne-NP' : 'en-US', { weekday: 'long' });
    // Check if busiest day is Friday/Saturday/Sunday (weekend)
    const dayOfWeek = new Date(topDay.date).getDay();
    if (dayOfWeek >= 5 || dayOfWeek === 0) { // Fri=5, Sat=6, Sun=0
      recommendations.push({
        id: 'weekend_prep',
        priority: 'medium',
        category: 'operations',
        title: context.lang === 'ne'
          ? `${dayName} को लागि अतिरिक्त स्टक तयार गर्नुहोस्`
          : `Prepare extra stock for ${dayName}`,
        explanation: context.lang === 'ne'
          ? `${dayName} तपाईंको सबैभन्दा व्यस्त बिक्री दिन छ (${topDay.revenueFormatted}, ${topDay.orders} अर्डरहरू)। अगाडि स्टक बढाउनुहोस्।`
          : `${dayName} is your busiest day (${topDay.revenueFormatted}, ${topDay.orders} orders). Increase stock beforehand.`,
        why: context.lang === 'ne'
          ? `तथ्याङ्क देखाउँछ ${dayName} मा बिक्री लगातार बढी हुन्छ।`
          : `Data shows ${dayName} consistently has higher sales.`,
        action: {
          label: context.lang === 'ne' ? 'मौज्दात हेर्नुहोस्' : 'View Inventory',
          route: 'inventory',
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
  }

  // 6. High Margin Products - Focus Sales Efforts
  const highMarginProducts = context.products.all
    .filter(p => p.sold > 0 && p.margin > 30)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 2);

  if (highMarginProducts.length > 0) {
    highMarginProducts.forEach(product => {
      recommendations.push({
        id: `focus_${product.id}`,
        priority: 'low',
        category: 'sales',
        title: context.lang === 'ne'
          ? `${product.name} मा बिक्री ध्यान केन्द्रित गर्नुहोस्`
          : `Focus sales on ${product.name}`,
        explanation: context.lang === 'ne'
          ? `यस सामानको उच्च नाफा प्रतिशत छ (${product.margin}%)। यो बिक्री बढाउँदा नाफा बढ्छ।`
          : `This product has high margin (${product.margin}%). Increasing its sales boosts profit.`,
        why: context.lang === 'ne'
          ? `नाफा प्रतिशत: ${product.margin}%। बिक्री: ${product.sold} ${context.lang === 'ne' ? 'वटा' : 'units'}।`
          : `Margin: ${product.margin}%. Sales: ${product.sold} units.`,
        action: {
          label: context.lang === 'ne' ? 'उत्पादन हेर्नुहोस्' : 'View Product',
          route: 'inventory',
          type: 'navigate',
          params: { productId: product.id },
        },
        data: {
          productId: product.id,
          margin: product.margin,
          sold: product.sold,
        },
        icon: 'dollar_sign',
      });
    });
  }

  // 7. Sales Drop Alert
  if (context.week.vsLastWeek !== null && context.week.vsLastWeek < -10) {
    recommendations.push({
      id: 'sales_drop',
      priority: 'high',
      category: 'sales',
      title: context.lang === 'ne'
        ? 'बिक्री गत हप्ताको तुलनामा घटेको छ'
        : 'Sales dropped significantly vs last week',
      explanation: context.lang === 'ne'
        ? `बिक्री ${Math.abs(context.week.vsLastWeek)}% घटेको छ। कारण पहिचान गर्न बिक्री विवरण हेर्नुहोस्।`
        : `Sales dropped ${Math.abs(context.week.vsLastWeek)}%. Review sales details to identify cause.`,
      why: context.lang === 'ne'
        ? `गत हप्ता: ${money(context.week.lastWeekRevenue, context.lang)}। यस हप्ता: ${money(context.week.revenue, context.lang)}।`
        : `Last week: ${money(context.week.lastWeekRevenue, context.lang)}. This week: ${money(context.week.revenue, context.lang)}.`,
      action: {
        label: context.lang === 'ne' ? 'बिक्री विश्लेषण हेर्नुहोस्' : 'View Sales Analytics',
        route: 'analytics',
        type: 'navigate',
      },
      data: {
        change: context.week.vsLastWeek,
      },
      icon: 'trending_down',
    });
  }

  // 8. Add First Product (Empty State)
  if (!context.hasData.inventory) {
    recommendations.push({
      id: 'add_first_product',
      priority: 'high',
      category: 'setup',
      title: context.lang === 'ne'
        ? 'पहिलो उत्पादन थप्नुहोस्'
        : 'Add your first product',
      explanation: context.lang === 'ne'
        ? 'उत्पादनहरू थप्नुभएपछि Hamro AI मौज्दात निगरानी गर्न र सूचना दिन सक्छ।'
        : 'Once you add products, Hamro AI can monitor stock and alert you.',
      why: context.lang === 'ne'
        ? 'मौज्दात डेटा बिना AI सुविधाहरू उपलब्ध छैनन्।'
        : 'AI features unavailable without inventory data.',
      action: {
        label: context.lang === 'ne' ? 'उत्पादन थप्नुहोस्' : 'Add Product',
        route: 'inventory',
        type: 'navigate',
        params: { action: 'add' },
      },
      data: {},
      icon: 'plus',
    });
  }

  // 9. Record First Sale (Empty State)
  if (!context.hasData.sales) {
    recommendations.push({
      id: 'record_first_sale',
      priority: 'high',
      category: 'setup',
      title: context.lang === 'ne'
        ? 'पहिलो बिक्री रेकर्ड गर्नुहोस्'
        : 'Record your first sale',
      explanation: context.lang === 'ne'
        ? 'बिक्री डेटा भएपछि Hamro AI प्रवृत्ति, नाफा र अवसरहरू पहिचान गर्न सक्छ।'
        : 'Once you have sales data, Hamro AI can identify trends, profit, and opportunities.',
      why: context.lang === 'ne'
        ? 'बिक्री डेटा बिना व्यापारिक अन्तर्दृष्टि सम्भव छैन।'
        : 'Business insights require sales data.',
      action: {
        label: context.lang === 'ne' ? 'बिक्री थप्नुहोस्' : 'Add Sale',
        route: 'sales',
        type: 'navigate',
        params: { action: 'add' },
      },
      data: {},
      icon: 'shopping_cart',
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export { generateRecommendations as default };
