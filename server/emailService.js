import nodemailer from 'nodemailer';
import { buildStockAlertEmail } from './emailTemplates.js';

export function createEmailService(env = process.env, createTransport = nodemailer.createTransport) {
  const user = env.EMAIL_USER;
  const appPassword = env.EMAIL_APP_PASSWORD;
  const recipient = env.ALERT_EMAIL || 'hbyapar@gmail.com';
  const manageUrl = `${env.APP_URL || 'http://localhost:4173'}#inventory`;
  const configured = Boolean(user && appPassword);
  const sentAlertIds = new Set();
  const inFlightAlertIds = new Set();
  let transporter;

  const getTransporter = () => {
    if (!configured) throw new Error('Email service is not configured.');
    transporter ||= createTransport({ service: 'gmail', auth: { user, pass: appPassword } });
    return transporter;
  };

  const sendEmail = async ({ to = recipient, subject, html, text }) => getTransporter().sendMail({
    from: `"Hamro Byapar" <${user}>`, to, subject, html, text,
  });

  const sendStockAlert = async (payload) => {
    if (!configured) return { delivered: false, reason: 'not_configured' };
    if (sentAlertIds.has(payload.alertId) || inFlightAlertIds.has(payload.alertId)) return { delivered: false, duplicate: true };
    inFlightAlertIds.add(payload.alertId);
    try {
      const email = buildStockAlertEmail({ ...payload, manageUrl });
      const info = await sendEmail(email);
      sentAlertIds.add(payload.alertId);
      return { delivered: true, messageId: info.messageId };
    } finally {
      inFlightAlertIds.delete(payload.alertId);
    }
  };

  return {
    configured,
    recipient,
    sendEmail,
    sendStockAlert,
    sendLowStockAlert: (payload) => sendStockAlert({ ...payload, alertType: 'low_stock' }),
    sendOutOfStockAlert: (payload) => sendStockAlert({ ...payload, alertType: 'out_of_stock' }),
  };
}
