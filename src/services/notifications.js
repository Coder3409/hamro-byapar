export async function sendStockAlertEmail(alert, product, profile, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl('/api/alerts/stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alertId: alert.id,
      alertType: alert.alertType,
      product: {
        id: product.id,
        sku: product.sku || product.id,
        name: product.name,
        category: product.category,
        stock: Number(product.stock),
        lowStock: Number(product.lowStock),
      },
      shop: { name: profile.shopName, owner: profile.ownerName },
      occurredAt: alert.createdAt,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || 'Email alert service is unavailable.');
  return result;
}
