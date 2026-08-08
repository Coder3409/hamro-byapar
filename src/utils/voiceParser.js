import { money, summarize } from './analytics.js';

const DEVANAGARI_DIGITS = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9' };
const PRODUCT_ALIASES = [
  { key: 'noodles', display: 'Chau Chau', values: ['noodles', 'noodle', 'chau chau', 'chow chow', 'chauchau', 'chowchow', 'चाउचाउ'] },
  { key: 'soap', display: 'Soap', values: ['soap', 'soaps', 'sabun', 'saban', 'साबुन'] },
  { key: 'biscuits', display: 'Biscuits', values: ['biscuit', 'biscuits', 'biskut', 'बिस्कुट'] },
  { key: 'oil', display: 'Cooking Oil', values: ['cooking oil', 'oil', 'tel', 'खाने तेल', 'तेल'] },
  { key: 'milk', display: 'Milk', values: ['milk', 'dudh', 'दूध'] },
  { key: 'rice', display: 'Rice', values: ['rice', 'chamal', 'चामल'] },
  { key: 'tea', display: 'Tea', values: ['tea', 'chiya', 'चिया'] },
  { key: 'sugar', display: 'Sugar', values: ['sugar', 'chini', 'चिनी'] },
  { key: 'salt', display: 'Salt', values: ['salt', 'nun', 'नुन'] },
  { key: 'shampoo', display: 'Shampoo', values: ['shampoo', 'syampu', 'स्याम्पु'] },
];

export function normalizeVoiceText(value = '') {
  return value
    .replace(/[०-९]/g, (digit) => DEVANAGARI_DIGITS[digit])
    .toLowerCase()
    .replace(/[.,!?;:।]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const rows = Array.from({ length: b.length + 1 }, (_, index) => [index]);
  for (let index = 0; index <= a.length; index += 1) rows[0][index] = index;
  for (let row = 1; row <= b.length; row += 1) {
    for (let column = 1; column <= a.length; column += 1) {
      rows[row][column] = b[row - 1] === a[column - 1]
        ? rows[row - 1][column - 1]
        : Math.min(rows[row - 1][column - 1], rows[row][column - 1], rows[row - 1][column]) + 1;
    }
  }
  return rows[b.length][a.length];
}

function matchProduct(text, products) {
  const normalizedProducts = products.map((product) => ({
    product,
    names: [normalizeVoiceText(product.name), normalizeVoiceText(product.nameNe)].filter(Boolean),
  }));
  const exact = normalizedProducts.filter(({ names }) => names.some((name) => name && text.includes(name)));
  if (exact.length) {
    const winner = exact.sort((a, b) => b.names[0].length - a.names[0].length)[0].product;
    return { product: winner, spokenProductName: winner.name, confidence: 0.99, suggestions: exact.map((item) => item.product) };
  }

  for (const group of PRODUCT_ALIASES) {
    const spokenAlias = group.values.find((alias) => text.includes(alias));
    if (!spokenAlias) continue;
    const candidates = normalizedProducts.filter(({ names }) => names.some((name) => group.values.some((alias) => name.includes(alias) || alias.includes(name))));
    if (candidates.length) {
      const winner = candidates.sort((a, b) => a.product.name.length - b.product.name.length)[0].product;
      return { product: winner, spokenProductName: group.display, confidence: candidates.length === 1 ? 0.94 : 0.82, suggestions: candidates.map((item) => item.product) };
    }
    return { product: null, spokenProductName: group.display, confidence: 0.72, suggestions: [] };
  }

  const words = text.split(' ').filter((word) => word.length >= 3 && !/^\d+$/.test(word));
  const fuzzy = normalizedProducts.map((item) => {
    const bestDistance = Math.min(...words.map((word) => Math.min(...item.names.map((name) => levenshtein(word, name)))));
    const maxLength = Math.max(...item.names.map((name) => name.length), 1);
    return { ...item, score: 1 - bestDistance / maxLength };
  }).filter((item) => item.score >= 0.58).sort((a, b) => b.score - a.score);
  if (fuzzy.length) return { product: fuzzy[0].product, spokenProductName: fuzzy[0].product.name, confidence: fuzzy[0].score, suggestions: fuzzy.slice(0, 3).map((item) => item.product) };

  const cleaned = words.filter((word) => !['maile','aaja','bought','sold','them','rupees','kineko','kine','ani','beche','packet','packets','ota','wata','मैले','आज','रुपैयाँमा','किनेँ','बेचेँ'].includes(word));
  return { product: null, spokenProductName: cleaned.slice(0, 3).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ') || '', confidence: 0.35, suggestions: [] };
}

function extractNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

export function detectVoiceQuestion(transcript) {
  const text = normalizeVoiceText(transcript);
  if (!text) return null;
  if (/(?:today|aaja|आज).*(?:sales|sale|बिक्री)|(?:sales|sale|बिक्री).*(?:kati|कति|today|aaja|आज)|(?:today|aaja|आज).*(?:kati|कति).*(?:bechiyo|बेचियो)/.test(text)) return 'sales';
  if (/(today|aaja|आज).*(profit|naph|nafa|नाफा)|(?:profit|naph|nafa|नाफा).*(kati|कति|today|aaja|आज)/.test(text)) return 'profit';
  if (/(best seller|selling best|kun.*(?:dherai|bikyo)|कुन.*(?:धेरै|बिक्यो))/.test(text)) return 'best';
  if (/(low stock|stock.*(?:kam|low)|k ko stock|मौज्दात.*कम|स्टक.*कम)/.test(text)) return 'stock';
  if (/(business.*(?:kasto|how)|(?:kasto|how).*business|व्यापार.*कस्तो)/.test(text)) return 'business';
  return null;
}

export function parseVoiceCommand(transcript, products = []) {
  const text = normalizeVoiceText(transcript);
  const question = detectVoiceQuestion(text);
  if (question) return { kind: 'question', question, transcript };

  const purchasePrice = extractNumber(text, [
    /(?:bought|buy|purchased).*?(?:for|at)\s*(\d+)/,
    /(\d+)\s*(?:rupees?|rs)?\s*(?:ma)?\s*(?:kineko|kine|kinera|kinya)/,
    /(\d+)\s*(?:रुपैयाँ)?\s*(?:मा)?\s*(?:किनेँ|किने|किनेको)/,
  ]);
  const sellingPrice = extractNumber(text, [
    /(?:sold|sell).*?(?:for|at)\s*(\d+)/,
    /(\d+)\s*(?:rupees?|rs)?\s*(?:ma)?\s*(?:beche|bechyo|becheko)/,
    /(\d+)\s*(?:रुपैयाँ)?\s*(?:मा)?\s*(?:बेचेँ|बेचे|बेचें|बेचेको)/,
  ]);
  const spokenQuantity = extractNumber(text, [
    /(\d+)\s*(?:packets?|packs?|pieces?|units?|pcs?|ota|wata|वटा|ओटा|प्याकेट)/,
    /(?:bought|buy|purchased)\s+(\d+)\s+/,
    /(?:मैले)\s+(\d+)\s+/,
  ]);
  const quantity = spokenQuantity || 1;
  const productMatch = matchProduct(text, products);
  const missing = [];
  if (!productMatch.spokenProductName && !productMatch.product) missing.push('product');
  if (purchasePrice == null) missing.push('purchasePrice');
  if (sellingPrice == null) missing.push('sellingPrice');
  const recognizedFields = [productMatch.product || productMatch.spokenProductName, purchasePrice != null, sellingPrice != null, spokenQuantity != null].filter(Boolean).length;

  return {
    kind: 'sale', transcript, product: productMatch.product, productName: productMatch.spokenProductName || productMatch.product?.name || '',
    suggestions: productMatch.suggestions, matchConfidence: productMatch.confidence, quantity, quantityDefaulted: spokenQuantity == null,
    purchasePrice, sellingPrice, missing, confidence: Math.round((recognizedFields / 4) * 100),
  };
}

export function calculateVoiceSale({ purchasePrice = 0, sellingPrice = 0, quantity = 1 }) {
  const cost = Number(purchasePrice) * Number(quantity);
  const revenue = Number(sellingPrice) * Number(quantity);
  const profit = revenue - cost;
  return { cost, revenue, profit, profitPerUnit: Number(sellingPrice) - Number(purchasePrice), margin: revenue ? Math.round((profit / revenue) * 100) : 0 };
}

export function answerVoiceQuestion(question, sales, products, lang = 'en') {
  const data = summarize(sales, products);
  const low = products.filter((product) => product.stock <= product.lowStock).sort((a, b) => a.stock - b.stock);
  const best = data.ranked[0];
  const units = data.today.reduce((sum, sale) => sum + sale.quantity, 0);
  if (lang === 'ne') {
    if (question === 'sales') return { title: 'आजको बिक्री', value: money(data.revenue, lang), detail: `${data.transactions.toLocaleString('ne-NP')} कारोबारबाट ${units.toLocaleString('ne-NP')} वटा सामान बिक्री भयो।` };
    if (question === 'profit') return { title: 'आजको नाफा', value: money(data.profit, lang), detail: 'आजका सबै रेकर्ड गरिएको बिक्रीको अनुमानित कुल नाफा।' };
    if (question === 'best') return { title: 'धेरै बिक्री भएको', value: best?.nameNe || 'अहिलेसम्म छैन', detail: best ? `${best.sold.toLocaleString('ne-NP')} वटा बिक्री भएको छ।` : 'पहिलो बिक्री थप्नुहोस्।' };
    if (question === 'stock') return { title: 'कम मौज्दात', value: low[0]?.nameNe || 'सबै ठीक छ', detail: low[0] ? `${low[0].stock.toLocaleString('ne-NP')} वटा मात्र बाँकी छ।` : 'सबै सामानको मौज्दात पर्याप्त छ।' };
    return { title: 'आजको व्यापार', value: data.change >= 0 ? 'राम्रो चलिरहेको छ' : 'ध्यान दिनुहोस्', detail: `गत हप्ताको तुलनामा बिक्री ${Math.abs(data.change).toLocaleString('ne-NP')}% ${data.change >= 0 ? 'बढेको' : 'घटेको'} छ।` };
  }
  if (question === 'sales') return { title: "Today's sales", value: money(data.revenue, lang), detail: `${units} units sold across ${data.transactions} transactions.` };
  if (question === 'profit') return { title: "Today's profit", value: money(data.profit, lang), detail: 'Estimated gross profit from every sale recorded today.' };
  if (question === 'best') return { title: 'Best seller', value: best?.name || 'No sales yet', detail: best ? `${best.sold} units sold.` : 'Record your first sale to get an answer.' };
  if (question === 'stock') return { title: 'Low stock', value: low[0]?.name || 'All healthy', detail: low[0] ? `Only ${low[0].stock} units left.` : 'Every product has healthy stock.' };
  return { title: "Today's business", value: data.change >= 0 ? 'Looking good' : 'Needs attention', detail: `Sales are ${Math.abs(data.change)}% ${data.change >= 0 ? 'higher' : 'lower'} than the previous week.` };
}
