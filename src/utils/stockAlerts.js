export function stockAlertLevel(product) {
  if (Number(product.stock) === 0) return 'out_of_stock';
  if (Number(product.stock) <= Number(product.lowStock)) return 'low_stock';
  return 'normal';
}

export function createStockAlertBaseline(products) {
  return Object.fromEntries(products.map((product) => [product.id, {
    productId: product.id,
    level: stockAlertLevel(product),
    alertId: null,
    emailStatus: 'baseline',
    updatedAt: new Date().toISOString(),
  }]));
}

export function evaluateStockAlerts(products, previousStates = {}, occurredAt = new Date().toISOString()) {
  const states = {};
  const alerts = [];
  const resolvedAlertIds = [];

  products.forEach((product) => {
    const previous = previousStates[product.id];
    const level = stockAlertLevel(product);
    if (previous?.level === level) {
      states[product.id] = previous;
      return;
    }
    if (previous?.alertId) resolvedAlertIds.push(previous.alertId);
    if (level === 'normal') {
      states[product.id] = { productId: product.id, level, alertId: null, emailStatus: null, updatedAt: occurredAt };
      return;
    }
    const alertId = `stock-${product.id}-${level}-${occurredAt}`;
    const alert = {
      id: alertId,
      alertId,
      alertType: level,
      productId: product.id,
      productName: product.name,
      productNameNe: product.nameNe || product.name,
      category: product.category || 'Other',
      currentStock: Number(product.stock),
      minimumStock: Number(product.lowStock),
      emailSent: false,
      emailStatus: 'pending',
      isResolved: false,
      isRead: false,
      createdAt: occurredAt,
      resolvedAt: null,
    };
    alerts.push(alert);
    states[product.id] = { productId: product.id, level, alertId, emailStatus: 'pending', updatedAt: occurredAt };
  });

  const currentProductIds = new Set(products.map((product) => product.id));
  Object.values(previousStates).forEach((previous) => {
    if (!currentProductIds.has(previous.productId) && previous.alertId) resolvedAlertIds.push(previous.alertId);
  });

  return { states, alerts, resolvedAlertIds };
}

export function resolveNotifications(notifications, alertIds, resolvedAt = new Date().toISOString()) {
  if (!alertIds.length) return notifications;
  const ids = new Set(alertIds);
  return notifications.map((notification) => ids.has(notification.id)
    ? { ...notification, isResolved: true, resolvedAt }
    : notification);
}

export function updateNotificationEmailStatus(notifications, alertId, emailStatus) {
  return notifications.map((notification) => notification.id === alertId
    ? { ...notification, emailStatus, emailSent: emailStatus === 'sent' }
    : notification);
}
