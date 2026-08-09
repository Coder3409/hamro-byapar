const DAY = 86_400_000;

export const demoProfile = {
  shopName: 'Asha Kirana Pasal',
  ownerName: 'Asha Shrestha',
  shopType: 'Kirana',
  location: 'Lalitpur, Nepal',
  currency: 'NPR / Rs.',
  vatEnabled: false,
  vatRegistrationNumber: '',
  vatRate: 13,
  pricesIncludeVat: true,
};

export const demoProducts = [
  ['p1', 'Milk', 'दूध', 'Dairy', 48, 60, 18, 8, 48],
  ['p2', 'Rice (5 kg)', 'चामल (५ केजी)', 'Grocery', 610, 690, 14, 5, 31],
  ['p3', 'Cooking Oil', 'खाने तेल', 'Grocery', 245, 280, 3, 6, 28],
  ['p4', 'Noodles', 'चाउचाउ', 'Snacks', 18, 25, 42, 15, 26],
  ['p5', 'Biscuits', 'बिस्कुट', 'Snacks', 16, 25, 35, 10, 20],
  ['p6', 'Bath Soap', 'नुहाउने साबुन', 'Personal care', 52, 65, 9, 8, 18],
  ['p7', 'Shampoo', 'स्याम्पु', 'Personal care', 165, 195, 5, 6, 11],
  ['p8', 'Tea (250 g)', 'चिया (२५० ग्राम)', 'Grocery', 105, 125, 12, 5, 16],
  ['p9', 'Sugar (1 kg)', 'चिनी (१ केजी)', 'Grocery', 102, 120, 0, 7, 15],
  ['p10', 'Salt (1 kg)', 'नुन (१ केजी)', 'Grocery', 22, 30, 24, 8, 9],
  ['p11', 'Soft Drink', 'चिसो पेय', 'Beverage', 75, 100, 16, 8, 23],
  ['p12', 'Brand X Noodles', 'ब्रान्ड एक्स चाउचाउ', 'Snacks', 19, 25, 30, 8, 2],
].map(([id, name, nameNe, category, purchasePrice, sellingPrice, stock, lowStock, sold]) => ({ id, name, nameNe, category, purchasePrice, sellingPrice, stock, lowStock, sold }));

const pattern = [7800, 9150, 8700, 10400, 11250, 13600, 14850, 9800, 10200, 11750, 12100, 10800, 13250, 14400, 9950, 10900, 11850, 12500, 13900, 15100, 10450, 11600, 12650, 11900, 13800, 15600, 14900, 12100, 13750, 14820];

export function createDemoSales() {
  const now = new Date();
  const cycle = ['p1', 'p2', 'p3', 'p4', 'p5', 'p11', 'p6', 'p8'];
  return pattern.flatMap((target, index) => {
    const daysAgo = 29 - index;
    const count = daysAgo === 0 ? 12 : 5;
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(now.getTime() - daysAgo * DAY);
      date.setHours(daysAgo === 0 ? 8 + i : 9 + i * 2, 10 + ((index * 7 + i * 11) % 45), 0, 0);
      const productId = cycle[(index + i * 3) % cycle.length];
      const product = demoProducts.find((item) => item.id === productId);
      const quantity = 1 + ((index + i) % 3);
      const amount = Math.round(product.sellingPrice * quantity * (target / 5000));
      return { id: `s-${daysAgo}-${i}`, productId, productName: product.name, productNameNe: product.nameNe, quantity, unitPrice: Math.round(amount / quantity), discount: 0, total: amount, cost: Math.round(product.purchasePrice * quantity * (target / 5000)), createdAt: date.toISOString() };
    });
  });
}
