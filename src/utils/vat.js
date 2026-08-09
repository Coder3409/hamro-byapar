export const DEFAULT_VAT_RATE = 13;

const numberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const roundCurrency = (value) => Math.round((numberOrZero(value) + Number.EPSILON) * 100) / 100;

export function normalizeVatRate(value, fallback = DEFAULT_VAT_RATE) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
}

export function normalizeVatProfile(profile = {}) {
  return {
    ...profile,
    vatEnabled: profile.vatEnabled === true,
    vatRegistrationNumber: String(profile.vatRegistrationNumber || '').trim(),
    vatRate: normalizeVatRate(profile.vatRate ?? DEFAULT_VAT_RATE),
    pricesIncludeVat: profile.pricesIncludeVat !== false,
  };
}

export function calculateVat({ amount, rate = DEFAULT_VAT_RATE, inclusive = true, applicable = true }) {
  const sourceAmount = Math.max(0, numberOrZero(amount));
  const vatRate = normalizeVatRate(rate);

  if (!applicable) {
    return { applicable: false, rate: vatRate, inclusive: Boolean(inclusive), taxableAmount: 0, vatAmount: 0, total: roundCurrency(sourceAmount) };
  }

  if (inclusive) {
    const taxableAmount = vatRate > 0 ? sourceAmount / (1 + vatRate / 100) : sourceAmount;
    const total = roundCurrency(sourceAmount);
    return { applicable: true, rate: vatRate, inclusive: true, taxableAmount: roundCurrency(taxableAmount), vatAmount: roundCurrency(total - taxableAmount), total };
  }

  const taxableAmount = roundCurrency(sourceAmount);
  const vatAmount = roundCurrency(taxableAmount * vatRate / 100);
  return { applicable: true, rate: vatRate, inclusive: false, taxableAmount, vatAmount, total: roundCurrency(taxableAmount + vatAmount) };
}

export function vatFromSale(sale = {}) {
  const total = Math.max(0, numberOrZero(sale.total));
  const rate = normalizeVatRate(sale.vatRate ?? DEFAULT_VAT_RATE);
  if (sale.vatApplicable !== true) return calculateVat({ amount: total, rate, inclusive: true, applicable: false });

  if (Number.isFinite(Number(sale.taxableAmount)) && Number.isFinite(Number(sale.vatAmount))) {
    return {
      applicable: true,
      rate,
      inclusive: sale.vatInclusive !== false,
      taxableAmount: roundCurrency(sale.taxableAmount),
      vatAmount: roundCurrency(sale.vatAmount),
      total: roundCurrency(total),
    };
  }

  // A recorded sale total is always the final amount, so legacy VAT-marked rows
  // can be safely decomposed as a VAT-inclusive amount without changing the sale.
  return calculateVat({ amount: total, rate, inclusive: true, applicable: true });
}

export function summarizeVat(sales = []) {
  const rows = sales.map((sale) => ({ sale, vat: vatFromSale(sale) }));
  const vatable = rows.filter(({ vat }) => vat.applicable);
  const nonVat = rows.filter(({ vat }) => !vat.applicable);
  return {
    taxableSales: roundCurrency(vatable.reduce((sum, row) => sum + row.vat.taxableAmount, 0)),
    outputVat: roundCurrency(vatable.reduce((sum, row) => sum + row.vat.vatAmount, 0)),
    grossVatableSales: roundCurrency(vatable.reduce((sum, row) => sum + row.vat.total, 0)),
    vatableTransactions: vatable.length,
    nonVatTransactions: nonVat.length,
    totalTransactions: rows.length,
    rows,
    inputVatAvailable: false,
    inputVat: null,
    netVat: null,
  };
}
