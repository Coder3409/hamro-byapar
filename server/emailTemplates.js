const SLOGAN = 'व्यापार बुझौं | व्यवसाय बढाऔं';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

export function buildStockAlertEmail({ alertType, product, shop = {}, occurredAt = new Date().toISOString(), manageUrl }) {
  const outOfStock = alertType === 'out_of_stock';
  const title = outOfStock ? 'OUT OF STOCK' : 'LOW STOCK ALERT';
  const subject = `${outOfStock ? '🚨 Out of Stock' : '⚠️ Low Stock Alert'} - ${product.name}`;
  const accent = outOfStock ? '#b42318' : '#b76e00';
  const background = outOfStock ? '#fff1f0' : '#fff8e6';
  const message = outOfStock
    ? 'This product is currently out of stock. Please restock it as soon as possible.'
    : 'This product is running low on stock. Please consider restocking it.';
  const safeProduct = escapeHtml(product.name);
  const safeShop = escapeHtml(shop.name || 'Hamro Byapar');
  const safeCategory = escapeHtml(product.category || 'Uncategorized');
  const safeSku = escapeHtml(product.sku || product.id || '—');
  const safeManageUrl = escapeHtml(manageUrl || 'http://localhost:4173');
  const date = new Date(occurredAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kathmandu' });
  const text = `${title}\n\nProduct: ${product.name}\nCurrent Stock: ${product.stock} units\nMinimum Stock: ${product.lowStock} units\nCategory: ${product.category || 'Uncategorized'}\nShop: ${shop.name || 'Hamro Byapar'}\nDate: ${date}\n\n${message}\n\nManage inventory: ${manageUrl || 'http://localhost:4173'}`;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f8fb;font-family:Arial,sans-serif;color:#10233f"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#f7f8fb"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;overflow:hidden;border:1px solid #e7e9ee;border-radius:18px;background:#fff"><tr><td style="padding:24px 28px;background:#061b3a;color:#fff"><div style="font-size:22px;font-weight:800">Hamro Byapar</div><div style="margin-top:5px;font-size:12px;opacity:.78">${SLOGAN}</div></td></tr><tr><td style="padding:28px"><div style="display:inline-block;padding:7px 11px;border-radius:999px;background:${background};color:${accent};font-size:12px;font-weight:800;letter-spacing:.08em">${title}</div><h1 style="margin:18px 0 6px;font-size:27px;color:#10233f">${safeProduct}</h1><p style="margin:0 0 22px;color:#64748b;font-size:14px">${safeShop}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 8px"><tr><td style="padding:12px 14px;border-radius:10px;background:#f7f8fb;color:#64748b;font-size:12px">Current stock<br><strong style="color:${accent};font-size:22px">${Number(product.stock)} units</strong></td><td width="12"></td><td style="padding:12px 14px;border-radius:10px;background:#f7f8fb;color:#64748b;font-size:12px">Minimum stock<br><strong style="color:#10233f;font-size:22px">${Number(product.lowStock)} units</strong></td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0 20px;font-size:13px;color:#52617a"><tr><td style="padding:6px 0">Category</td><td align="right"><strong>${safeCategory}</strong></td></tr><tr><td style="padding:6px 0">Product code</td><td align="right"><strong>${safeSku}</strong></td></tr><tr><td style="padding:6px 0">Date</td><td align="right"><strong>${escapeHtml(date)}</strong></td></tr></table><div style="padding:15px 16px;border-left:4px solid ${accent};border-radius:8px;background:${background};color:#453b2c;font-size:14px;line-height:1.55">${escapeHtml(message)}</div><div style="margin-top:24px;text-align:center"><a href="${safeManageUrl}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#d71920;color:#fff;text-decoration:none;font-size:14px;font-weight:800">Manage Inventory</a></div></td></tr><tr><td style="padding:18px 28px;border-top:1px solid #e7e9ee;color:#7b879a;font-size:11px">This automatic alert was created by Hamro Byapar. Email delivery does not affect local sales or inventory operations.</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}
