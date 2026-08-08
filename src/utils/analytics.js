const DAY = 86_400_000;
export const money = (value, lang = 'en') => `Rs. ${Math.round(value || 0).toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-IN')}`;
export const dateKey = (value) => { const d = new Date(value); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

export function summarize(sales, products) {
  const now = new Date();
  const today = sales.filter((s) => dateKey(s.createdAt) === dateKey(now));
  const current = sales.filter((s) => now - new Date(s.createdAt) < 7 * DAY);
  const previous = sales.filter((s) => { const d = now - new Date(s.createdAt); return d >= 7 * DAY && d < 14 * DAY; });
  const cur = current.reduce((a, s) => a + s.total, 0);
  const prev = previous.reduce((a, s) => a + s.total, 0);
  const units = sales.reduce((map, sale) => ({ ...map, [sale.productId]: (map[sale.productId] || 0) + sale.quantity }), {});
  const ranked = [...products].sort((a, b) => (units[b.id] || b.sold || 0) - (units[a.id] || a.sold || 0));
  return { today, revenue: today.reduce((a, s) => a + s.total, 0), profit: today.reduce((a, s) => a + s.total - s.cost, 0), transactions: today.length, unitsSold: today.reduce((a, s) => a + s.quantity, 0), lowStock: products.filter((p) => p.stock <= p.lowStock).length, change: prev ? Math.round(((cur - prev) / prev) * 100) : 0, ranked, slow: [...ranked].reverse() };
}

export function chartData(sales, metric = 'revenue', days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * DAY);
    const matching = sales.filter((s) => dateKey(s.createdAt) === dateKey(date));
    const value = metric === 'orders' ? matching.length : matching.reduce((sum, s) => sum + (metric === 'profit' ? s.total - s.cost : s.total), 0);
    return { date, value };
  });
}

export function getInsights(sales, products, lang = 'en') {
  const d = summarize(sales, products); const best = d.ranked[0]; const slow = d.slow[0]; const low = products.filter((p) => p.stock <= p.lowStock);
  if (lang === 'ne') return { overview: d.change >= 0 ? `यो हप्ता तपाईंको बिक्री ${Math.abs(d.change).toLocaleString('ne-NP')}% बढेको छ। शुक्रबार र शनिबार बलियो दिन देखिएका छन्।` : `यो हप्ता तपाईंको बिक्री ${Math.abs(d.change).toLocaleString('ne-NP')}% घटेको छ। दैनिक बिक्रीमा ध्यान दिनुहोस्।`, cards: [
    { type: 'success', title: 'राम्रो बिक्री', insight: `${best?.nameNe || 'दूध'} सबैभन्दा धेरै बिक्री भइरहेको छ।`, reason: 'पछिल्ला बिक्रीमध्ये यसको मात्रा सबैभन्दा धेरै छ।', action: 'पर्याप्त मौज्दात राख्नुहोस्।' },
    { type: 'warning', title: 'मौज्दातमा ध्यान', insight: `${low.length.toLocaleString('ne-NP')} सामान कम वा सकिएको छ।`, reason: low.length ? `${low[0].nameNe} मा ${low[0].stock.toLocaleString('ne-NP')} मात्र बाँकी छ।` : 'सबै सामानको मौज्दात ठीक छ।', action: low.length ? 'सप्ताहन्तअघि पुनः स्टक गर्नुहोस्।' : 'यसरी नै निगरानी राख्नुहोस्।' },
    { type: 'info', title: 'कम बिक्री', insight: `${slow?.nameNe || 'सामान'} हाल कम बिक्री भइरहेको छ।`, reason: 'अन्य सामानको तुलनामा बिक्री कम छ।', action: 'पुनः स्टक गर्नुअघि माग जाँच गर्नुहोस्।' },
  ] };
  return { overview: d.change >= 0 ? `Your sales increased by ${Math.abs(d.change)}% this week. Friday and Saturday were your strongest days.` : `Your sales decreased by ${Math.abs(d.change)}% this week. Keep an eye on daily sales.`, cards: [
    { type: 'success', title: 'Strong seller', insight: `${best?.name || 'Milk'} is your best-selling product.`, reason: 'It has the highest sales volume in your recent records.', action: 'Keep enough stock ready for the weekend.' },
    { type: 'warning', title: 'Stock to watch', insight: `${low.length} products are low or out of stock.`, reason: low.length ? `${low[0].name} has only ${low[0].stock} units left.` : 'All products have healthy stock.', action: low.length ? 'Restock before the weekend.' : 'Continue monitoring stock.' },
    { type: 'info', title: 'Slow mover', insight: `${slow?.name || 'A product'} has had low sales recently.`, reason: 'It is selling less often than your other products.', action: 'Check demand before restocking.' },
  ] };
}
