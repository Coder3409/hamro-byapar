import 'dotenv/config';
import { createEmailService } from '../server/emailService.js';

const service = createEmailService();
if (!service.configured) throw new Error('Add EMAIL_USER and EMAIL_APP_PASSWORD to .env before sending a test email.');
const result = await service.sendLowStockAlert({
  alertId: `manual-test-${Date.now()}`,
  product: { id: 'test-product', name: 'Test Product', category: 'Test', stock: 4, lowStock: 5 },
  shop: { name: 'Hamro Byapar Test Shop' },
  occurredAt: new Date().toISOString(),
});
console.log(`Test alert sent to ${service.recipient}. Message ID: ${result.messageId}`);
