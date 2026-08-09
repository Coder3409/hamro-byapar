import 'dotenv/config';
import { createServer } from 'node:http';
import { createEmailService } from './emailService.js';
import { SUBSCRIPTION_PLANS, PAYMENT_MODE } from '../src/subscription/plans.js';

const emailService = createEmailService();
const port = Number(process.env.EMAIL_SERVER_PORT || 4175);
const allowedOrigins = new Set((process.env.APP_ORIGIN || 'http://localhost:4173,http://localhost:4174').split(',').map((value) => value.trim()));

function sendJson(response, status, payload, origin) {
  if (origin && allowedOrigins.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Origin' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new Error('Request is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function validateStockAlert(payload) {
  if (!payload || !['low_stock', 'out_of_stock'].includes(payload.alertType)) return false;
  if (typeof payload.alertId !== 'string' || payload.alertId.length < 8 || payload.alertId.length > 160) return false;
  if (!payload.product || typeof payload.product.id !== 'string' || typeof payload.product.name !== 'string') return false;
  if (!Number.isFinite(payload.product.stock) || !Number.isFinite(payload.product.lowStock)) return false;
  return payload.product.name.length <= 160 && payload.product.stock >= 0 && payload.product.lowStock >= 0;
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (request.method === 'OPTIONS') {
    if (origin && allowedOrigins.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
    response.writeHead(204, { 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' });
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/api/health') {
    sendJson(response, 200, { ok: true, emailConfigured: emailService.configured }, origin);
    return;
  }
  // Read-only plan config, served from the single source of truth so a future
  // account server can consume it. No state, no database, no writes.
  if (request.method === 'GET' && request.url === '/api/subscription/plans') {
    sendJson(response, 200, { ok: true, paymentMode: PAYMENT_MODE, plans: SUBSCRIPTION_PLANS }, origin);
    return;
  }
  if (request.method === 'POST' && request.url === '/api/alerts/stock') {
    try {
      const payload = await readJson(request);
      if (!validateStockAlert(payload)) {
        sendJson(response, 400, { ok: false, error: 'Invalid stock alert payload.' }, origin);
        return;
      }
      const result = await emailService.sendStockAlert(payload);
      sendJson(response, result.delivered || result.duplicate ? 200 : 503, { ok: result.delivered || Boolean(result.duplicate), ...result }, origin);
    } catch (error) {
      console.error('[Hamro Byapar email] Stock alert delivery failed:', error?.message || 'Unknown email error');
      sendJson(response, 502, { ok: false, error: 'Email delivery failed.' }, origin);
    }
    return;
  }
  sendJson(response, 404, { ok: false, error: 'Not found.' }, origin);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[Hamro Byapar email] Server listening on http://127.0.0.1:${port}`);
  if (!emailService.configured) console.warn('[Hamro Byapar email] EMAIL_USER or EMAIL_APP_PASSWORD is missing; business operations remain available, but email delivery is disabled.');
});
