import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, Bot, Check, ChevronRight, CircleDollarSign,
  CloudOff, CreditCard, FileText, LayoutDashboard, Lightbulb, Menu, Mic, MonitorUp, Package, Plus, Search, Settings,
  ShoppingBag, ShoppingCart, Sparkles, Store, TrendingDown, TrendingUp, Users, Wallet, X,
  MessageSquare, Calendar, DollarSign, Zap, Shield, Eye, Clock,
} from 'lucide-react';
import { createDemoSales, demoProducts, demoProfile } from './data/demo';
import { officialSlogan, translate } from './i18n/translations';
import { loadData, saveData } from './services/storage';
import { sendStockAlertEmail } from './services/notifications';
import { chartData, dateKey, getInsights, money, summarize } from './utils/analytics';
import { calculateVat, normalizeVatProfile, summarizeVat, vatFromSale } from './utils/vat';
import { createStockAlertBaseline, evaluateStockAlerts, resolveNotifications, updateNotificationEmailStatus } from './utils/stockAlerts';
import VoiceAssistant from './components/voice/VoiceAssistant';
import { SUBSCRIPTION_PLANS, planById, isDemoPayment } from './subscription/plans';
import { canAccess, missingPlanFor } from './subscription/access';
import { legacySubscription, normalizeSubscription, refreshStatus } from './subscription/store';
import { newUsage, monthRollover, recordAiUsage, usageSummary } from './subscription/usage';
import { billingHistorySeed } from './subscription/invoices';
import { activateSubscription, cancelSubscription, createCheckout, verifyPayment } from './services/paymentService';
import SubscriptionPage from './components/subscription/SubscriptionPage';
import UpgradeModal from './components/subscription/UpgradeModal';
import ManageSubscriptionModal from './components/subscription/ManageSubscriptionModal';
import CancelConfirmModal from './components/subscription/CancelConfirmModal';
import AIBusinessSnapshot from './components/ai/AIBusinessSnapshot';
import AIInsightsPanel from './components/ai/AIInsightsPanel';
import AIWatch from './components/ai/AIWatch';
import { buildBusinessContext } from './ai/businessContext';
import { generateInsights } from './ai/insightEngine';
import { generateRecommendations } from './ai/recommendationEngine';

const nav = [
  ['dashboard', LayoutDashboard, 'dashboard'], ['sales', ShoppingCart, 'sales'], ['inventory', Package, 'inventory'],
  ['analytics', BarChart3, 'analytics'], ['ai', Bot, 'ai'], ['customers', Users, 'customers'],
  ['reports', FileText, 'reports'], ['subscription', CreditCard, 'subscription'], ['settings', Settings, 'settings'],
];

function Logo({ compact = false }) {
  return <div className="brand-lockup"><span className="brand-logo-frame"><img className="brand-logo" src="/assets/hamro-byapar-logo.jpeg" alt="Hamro Byapar" /></span>{!compact && <div><strong>Hamro Byapar</strong><small>{officialSlogan}</small></div>}</div>;
}

function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button ${variant} ${className}`} {...props}>{children}</button>;
}

function Modal({ title, onClose, closeLabel, children }) {
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal-card" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label={closeLabel}><X size={20} /></button></header>{children}</section></div>;
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="toast"><span><Check size={15} /></span>{message}</div>;
}

function ConnectionToast({ notice }) {
  if (!notice) return null;
  return <div className={`connection-toast ${notice.kind}`} role="status"><span>{notice.kind === 'offline' ? <CloudOff size={16}/> : <Check size={16}/>}</span>{notice.message}</div>;
}

function NotificationPanel({ notifications, lang, t, onReadAll }) {
  const rows = [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 12);
  const message = (item) => t(item.alertType === 'out_of_stock' ? 'outOfStockNotification' : 'lowStockNotification')
    .replace('{product}', lang === 'ne' ? item.productNameNe : item.productName)
    .replace('{stock}', item.currentStock);
  return <section className="notification-panel" aria-label={t('notifications')}><header><div><span>{t('alerts')}</span><strong>{t('notifications')}</strong></div>{notifications.some((item) => !item.isRead) && <button onClick={onReadAll}><Check size={14}/>{t('markAllRead')}</button>}</header>{rows.length ? <div className="notification-list">{rows.map((item) => <article className={`${item.alertType === 'out_of_stock' ? 'danger' : 'warning'} ${item.isRead ? 'read' : ''}`} key={item.id}><span>{item.alertType === 'out_of_stock' ? <X/> : <AlertTriangle/>}</span><div><strong>{t(item.alertType === 'out_of_stock' ? 'outOfStock' : 'lowStock')}</strong><p>{message(item)}</p><small>{new Date(item.createdAt).toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })} · {t(item.emailStatus === 'sent' ? 'emailSent' : item.emailStatus === 'failed' ? 'emailFailed' : 'emailPending')}</small></div>{!item.isRead && <i/>}</article>)}</div> : <div className="notification-empty"><Bell/><strong>{t('noNotifications')}</strong><p>{t('noNotificationsHelp')}</p></div>}</section>;
}

function Header({ lang, setLang, online, presentation, t, page, setMenuOpen, setPage, onSearch, notifications, notificationsOpen, setNotificationsOpen, markAllRead }) {
  const unread = notifications.filter((item) => !item.isRead).length;
  const searchRef = useRef(null);
  const previousUnread = useRef(unread);
  const [bellAttention, setBellAttention] = useState(false);
  useEffect(() => { const focusSearch = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); } }; addEventListener('keydown', focusSearch); return () => removeEventListener('keydown', focusSearch); }, []);
  useEffect(() => { if (unread <= previousUnread.current) { previousUnread.current = unread; return undefined; } previousUnread.current = unread; setBellAttention(true); const timer = window.setTimeout(() => setBellAttention(false), 700); return () => window.clearTimeout(timer); }, [unread]);
  return <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label={t('more')}><Menu /></button><div className="mobile-logo"><Logo compact /></div><form className="header-search" onSubmit={(event) => { event.preventDefault(); const query = new FormData(event.currentTarget).get('search')?.trim(); if (query) { onSearch(query); setPage('inventory'); } }}><Search/><input ref={searchRef} name="search" aria-label={t('globalSearch')} placeholder={t('globalSearch')}/><kbd>Ctrl K</kbd></form><div className="page-heading"><span>{t(page)}</span></div><div className="topbar-actions">{presentation && <div className="presentation-badge"><MonitorUp size={15}/><span>{t('presentationMode')}</span></div>}<div className={`connection ${online ? '' : 'offline'}`}>{online ? <span className="dot" /> : <CloudOff size={14} />}<span>{t(online ? 'online' : 'offline')}</span></div><div className="language-switch" aria-label={t('language')}><button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button><button className={lang === 'ne' ? 'active' : ''} onClick={() => setLang('ne')}>ने</button></div><div className="notification-wrap"><button className={`notification ${bellAttention ? 'attention' : ''}`} aria-label={t('alerts')} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={19} />{unread > 0 && <><i/><b>{unread > 9 ? '9+' : unread}</b></>}</button>{notificationsOpen && <NotificationPanel notifications={notifications} lang={lang} t={t} onReadAll={markAllRead}/>}</div><div className="avatar">AS</div></div></header>;
}

function Sidebar({ page, setPage, t, open, setOpen, profile, online }) {
  const ownerInitials = profile.ownerName?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'HB';
  return <><aside className={`sidebar ${open ? 'open' : ''}`}><div className="sidebar-brand"><Logo /></div><nav>{nav.map(([id, Icon, key]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setOpen(false); }}><Icon size={19} /><span>{t(key)}</span>{page === id && <i />}</button>)}</nav><div className="sidebar-help"><span className="ai-mini-orb"><Sparkles size={18}/></span><strong>{t('aiAssistant')}</strong><p>{t('aiCompanion')}</p><button onClick={() => setPage('ai')}>{t('viewAiInsights')} <ArrowRight size={14} /></button></div><div className={`sidebar-sync ${online ? '' : 'offline'}`}><span/><div><strong>{t(online ? 'synced' : 'offline')}</strong><small>{t(online ? 'justNow' : 'savedLocally')}</small></div></div><div className="sidebar-profile"><div className="avatar">{ownerInitials}</div><div><strong>{profile.ownerName}</strong><span>{profile.shopName}</span></div><ChevronRight size={17} /></div></aside>{open && <button className="sidebar-scrim" aria-label={t('close')} onClick={() => setOpen(false)} />}</>;
}

function useCountUp(value, duration = 760) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(0);
  useEffect(() => {
    const startValue = previous.current;
    const target = Number(value) || 0;
    previous.current = target;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplay(target); return undefined; }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startValue + (target - startValue) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return display;
}

function MetricCard({ icon: Icon, label, value, formatValue, note, tone }) {
  const animated = useCountUp(value);
  return <article className={`metric-card ${tone}`}><div className="metric-icon"><Icon size={21} /></div><div><p>{label}</p><strong>{formatValue(Math.round(animated))}</strong><span>{note}</span></div></article>;
}

function SalesChart({ sales, lang, t, compact = false }) {
  const [metric, setMetric] = useState('revenue');
  const [days, setDays] = useState(7);
  const [hovered, setHovered] = useState(null);
  const data = chartData(sales, metric, days);
  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d, i) => ({ ...d, x: 22 + (i * 656) / Math.max(data.length - 1, 1), y: 184 - (d.value / max) * 142 }));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const insights = getInsights(sales, [], lang);
  const nepaliDays = ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिही', 'शुक्र', 'शनि'];
  const axisText = (date) => lang === 'ne'
    ? (days <= 7 ? nepaliDays[date.getDay()] : date.getDate().toLocaleString('ne-NP'))
    : date.toLocaleDateString('en-US', { weekday: days <= 7 ? 'short' : undefined, day: days > 7 ? 'numeric' : undefined });
  const chartKey = `${metric}-${days}`;
  return <article className={`card chart-card ${compact ? 'compact' : ''}`}><div className="card-heading"><div><span className="eyebrow">{t('analytics')}</span><h2>{t('salesTrend')}</h2></div><div className="chart-controls"><div className="segmented">{['revenue', 'orders', 'profit'].map((item) => <button key={item} className={metric === item ? 'active' : ''} onClick={() => setMetric(item)}>{t(item)}</button>)}</div><div className="segmented soft">{[[1, 'today'], [7, 'sevenDays'], [30, 'thirtyDays']].map(([value, key]) => <button key={value} className={days === value ? 'active' : ''} onClick={() => setDays(value)}>{t(key)}</button>)}</div></div></div><div className="chart-wrap"><svg viewBox="0 0 700 220" role="img" aria-label={t('salesTrend')} preserveAspectRatio="none"><defs><linearGradient id={`area-${chartKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d71920" stopOpacity=".24"/><stop offset="1" stopColor="#d71920" stopOpacity="0"/></linearGradient></defs>{[42, 89, 136, 184].map((y) => <line key={y} x1="22" x2="678" y1={y} y2={y} className="gridline" />)}<path key={`area-${chartKey}`} d={`${path} L${points.at(-1)?.x || 678},190 L22,190 Z`} fill={`url(#area-${chartKey})`} className="trend-area"/><path key={`line-${chartKey}`} d={path} className="trend-line" pathLength="1"/>{points.map((p, i) => <g key={`${chartKey}-${i}`}><circle cx={p.x} cy={p.y} r={hovered === i ? 7 : 4} className="trend-dot" style={{ '--dot-delay': `${Math.min(i * 70, 700)}ms` }} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} /><rect x={p.x - 15} y="22" width="30" height="170" fill="transparent" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />{hovered === i && <g><rect x={Math.min(Math.max(p.x - 52, 4), 592)} y={Math.max(p.y - 46, 2)} width="104" height="34" rx="8" className="tooltip-bg"/><text x={Math.min(Math.max(p.x, 56), 644)} y={Math.max(p.y - 24, 24)} textAnchor="middle" className="tooltip-text">{metric === 'orders' ? p.value : money(p.value, lang)}</text></g>}</g>)}{points.filter((_, i) => days <= 7 || i % 5 === 0 || i === points.length - 1).map((p, i) => <text key={i} x={p.x} y="211" textAnchor="middle" className="axis-label">{axisText(p.date)}</text>)}</svg></div>{!compact && <div className="chart-insight"><div className="insight-icon"><Sparkles size={20} /></div><div><strong>{t('whatHappened')}</strong><p>{insights.overview}</p></div></div>}</article>;
}

function ProductRanking({ products, t, lang, slow = false }) {
  const list = slow ? [...products].sort((a, b) => a.sold - b.sold).slice(0, 4) : [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);
  const max = Math.max(...list.map((p) => p.sold), 1);
  return <article className="card ranking-card"><div className="card-heading"><div><span className="eyebrow">{slow ? t('slowMovers') : t('topProductsHelp')}</span><h2>{slow ? t('slowMovers') : t('bestSellers')}</h2></div>{slow ? <TrendingDown className="muted-icon" /> : <TrendingUp className="green-icon" />}</div><div className="rank-list">{list.map((p, i) => <div className="rank-row" key={p.id} style={{ '--rank-index': i }}><span className="rank-number">{i + 1}</span><div><strong>{lang === 'ne' ? p.nameNe : p.name}</strong><div className="progress"><i style={{ width: `${Math.max(10, p.sold / max * 100)}%` }} /></div></div><span>{p.sold.toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-IN')} {t('unitsSold')}</span></div>)}</div></article>;
}

function SaleRows({ sales, lang, t, limit }) {
  const rows = [...sales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit || sales.length);
  if (!rows.length) return <div className="empty-state"><ShoppingBag /><h3>{t('noSales')}</h3><p>{t('noSalesHelp')}</p></div>;
  return <div className="sale-list">{rows.map((sale) => <div className="sale-row" key={sale.id}><div className="product-symbol">{sale.source === 'voice' ? <Mic size={16}/> : (lang === 'ne' ? sale.productNameNe : sale.productName)?.charAt(0)}</div><div><strong>{lang === 'ne' ? sale.productNameNe : sale.productName}</strong><span>{sale.quantity.toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-IN')} × {money(sale.unitPrice, lang)}</span>{sale.source === 'voice' && <span className="voice-sale-meta"><Mic size={11}/>{t('voice')}</span>}</div><div><strong>{money(sale.total, lang)}</strong><span className="profit-meta">+{money(Math.max(0, sale.total - sale.cost), lang)} {t('profit')}</span><span>{new Date(sale.createdAt).toLocaleTimeString(lang === 'ne' ? 'ne-NP' : 'en-US', { hour: 'numeric', minute: '2-digit' })}</span></div></div>)}</div>;
}

function AIInsightBanner({ sales, products, lang, t, openAi }) {
  const insight = getInsights(sales, products, lang).cards[1];
  return <section className="ai-insight-banner"><div className="ai-insight-icon"><Bot/><i/></div><div><span>{t('aiInsight')} <b>{t('beta')}</b></span><h2>{insight.insight}</h2><p>{insight.action}</p></div><button onClick={openAi} aria-label={t('askAi')}><ArrowRight/></button></section>;
}

function Dashboard({ sales, products, profile, lang, t, setPage, openSale, openVoice }) {
  const d = summarize(sales, products);
  const locale = lang === 'ne' ? 'ne-NP' : 'en-IN';
  return <div className="page fade-in dashboard-page"><section className="welcome"><div><span>{t('greeting')} <span aria-hidden>👋</span></span><h1>{profile.shopName}</h1><p>{t('overview')}</p></div><div className="page-actions"><Button className="voice-action" onClick={openVoice}><Mic size={19}/><span><small>{t('hamroVoice')}</small>{t('voiceSale')}</span></Button><Button variant="navy" onClick={openSale}><Plus size={19}/>{t('addSale')}</Button></div></section><section className="metrics"><MetricCard icon={Wallet} label={t('todaySales')} value={d.revenue} formatValue={(value) => money(value, lang)} note={`${d.change >= 0 ? '↑ ' : '↓ '}${Math.abs(d.change)}% ${t('sevenDays')}`} tone="green"/><MetricCard icon={ShoppingBag} label={t('transactions')} value={d.transactions} formatValue={(value) => value.toLocaleString(locale)} note={`${d.unitsSold.toLocaleString(locale)} ${t('unitsSoldToday')}`} tone="blue"/><MetricCard icon={CircleDollarSign} label={t('estimatedProfit')} value={d.profit} formatValue={(value) => money(value, lang)} note={`${d.revenue ? Math.round(d.profit / d.revenue * 100) : 0}% ${t('profit')}`} tone="gold"/><MetricCard icon={AlertTriangle} label={t('lowStock')} value={d.lowStock} formatValue={(value) => value.toLocaleString(locale)} note={t('itemsNeedAttention')} tone="red"/></section><div className="dashboard-grid"><SalesChart sales={sales} lang={lang} t={t}/><aside className="right-column"><ProductRanking products={products} t={t} lang={lang}/></aside></div><AIInsightBanner sales={sales} products={products} lang={lang} t={t} openAi={() => setPage('ai')}/><div className="two-column"><article className="card recent-card"><div className="card-heading"><div><span className="eyebrow">{t('today')}</span><h2>{t('recentSales')}</h2></div><button className="text-button" onClick={() => setPage('sales')}>{t('seeAll')} <ArrowRight size={15}/></button></div><SaleRows sales={sales.filter((s) => dateKey(s.createdAt) === dateKey(new Date()))} lang={lang} t={t} limit={4}/></article><Alerts products={products} lang={lang} t={t} limit={3}/></div></div>;
}

function Alerts({ products, lang, t, limit }) {
  const items = products.filter((p) => p.stock <= p.lowStock).map((p) => ({ ...p, kind: p.stock === 0 ? 'danger' : 'warning', action: t('restock') })).concat([...products].sort((a, b) => a.sold - b.sold).slice(0, 1).map((p) => ({ ...p, kind: 'info', action: t('watchDemand') })));
  return <article className="card alerts-card"><div className="card-heading"><div><span className="eyebrow">{t('alerts')}</span><h2>{t('inventoryAlerts')}</h2></div><Bell className="muted-icon" /></div><div className="alert-list">{items.slice(0, limit || items.length).map((p, i) => <div className={`alert-row ${p.kind}`} key={`${p.id}-${i}`}><span>{p.kind === 'danger' ? <X/> : p.kind === 'warning' ? <AlertTriangle/> : <TrendingDown/>}</span><div><strong>{lang === 'ne' ? p.nameNe : p.name}</strong><p>{p.kind === 'info' ? `${t('slowMoving')} · ${p.sold} ${t('unitsSold')}` : `${p.stock} ${t('units')} ${t('inStock')}`}</p><small>{p.action}</small></div></div>)}</div></article>;
}

function SaleModal({ products, profile, lang, t, onClose, onSave, preset }) {
  const available = products.filter((p) => p.stock > 0);
  const [form, setForm] = useState(() => { const p = preset || available[0]; return { productId: p?.id || '', quantity: 1, price: p?.sellingPrice || 0, discount: 0, vatApplicable: false }; });
  const selected = products.find((p) => p.id === form.productId);
  const setProduct = (id) => { const p = products.find((item) => item.id === id); setForm({ ...form, productId: id, price: p.sellingPrice }); };
  const amountBeforeVat = Math.max(0, Number(form.quantity) * Number(form.price) - Number(form.discount));
  const vat = calculateVat({ amount: amountBeforeVat, rate: profile.vatRate, inclusive: profile.pricesIncludeVat, applicable: profile.vatEnabled && form.vatApplicable });
  return <Modal title={t('newSale')} onClose={onClose} closeLabel={t('close')}><form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, total: vat.total, selected, vatApplicable: vat.applicable, vatRate: vat.rate, vatInclusive: vat.inclusive, taxableAmount: vat.taxableAmount, vatAmount: vat.vatAmount }); }}><label>{t('product')}<select value={form.productId} onChange={(e) => setProduct(e.target.value)}>{available.map((p) => <option key={p.id} value={p.id}>{lang === 'ne' ? p.nameNe : p.name} · {p.stock} {t('inStock')}</option>)}</select></label><div className="form-grid"><label>{t('quantity')}<input type="number" min="1" max={selected?.stock || 1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}/></label><label>{t('sellingPrice')}<input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}/></label></div><label>{t('discount')}<input type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}/></label>{profile.vatEnabled && <label className="vat-sale-toggle"><input type="checkbox" checked={form.vatApplicable} onChange={(e) => setForm({ ...form, vatApplicable: e.target.checked })}/><span><strong>{t('vatApplicable')}</strong><small>{profile.pricesIncludeVat ? t('priceIncludesVat') : t('vatAddedAtCheckout')}</small></span></label>}<div className="sale-total vat-sale-total">{vat.applicable && <><span>{t('taxableAmount')}</span><b>{money(vat.taxableAmount, lang)}</b><span>{t('outputVat')} ({vat.rate}%)</span><b>{money(vat.vatAmount, lang)}</b></>}<span>{t('total')}</span><strong>{money(vat.total, lang)}</strong></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={!selected}><Check size={18}/>{t('saveSale')}</Button></div></form></Modal>;
}

function SalesPage({ sales, products, lang, t, openSale, openVoice, quickSell }) {
  const [filter, setFilter] = useState(0);
  const now = new Date();
  const yesterdayKey = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const filtered = sales.filter((s) => { const diff = Math.floor((now - new Date(s.createdAt)) / 86_400_000); return filter === 0 ? dateKey(s.createdAt) === dateKey(now) : filter === 1 ? dateKey(s.createdAt) === yesterdayKey : diff < filter; });
  return <div className="page fade-in"><section className="page-title"><div><span className="eyebrow">{t('sales')}</span><h1>{t('quickSale')}</h1><p>{t('quickSaleHelp')}</p></div><div className="page-actions"><Button className="voice-action" onClick={openVoice}><Mic/>{t('voiceSale')}</Button><Button variant="navy" onClick={() => openSale()}><Plus/>{t('addSale')}</Button></div></section><section className="quick-products">{products.filter((p) => p.stock > 0).slice(0, 8).map((p, i) => <button key={p.id} onClick={() => quickSell(p)}><span className={`product-emoji e${i % 5}`}>{['🥛','🍚','🫗','🍜','🍪','🧼','🧴','🫖'][i]}</span><strong>{lang === 'ne' ? p.nameNe : p.name}</strong><small>{money(p.sellingPrice, lang)} · {p.stock} {t('inStock')}</small><i>{t('tapToSell')}</i></button>)}</section><article className="card history-card"><div className="card-heading"><div><span className="eyebrow">{t('sales')}</span><h2>{t('saleHistory')}</h2></div><div className="segmented soft">{[[0,'today'],[1,'yesterday'],[7,'sevenDays'],[30,'thirtyDays']].map(([value,key]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{t(key)}</button>)}</div></div><SaleRows sales={filtered} lang={lang} t={t}/></article></div>;
}

function ProductModal({ t, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', nameNe: '', category: 'Grocery', purchasePrice: '', sellingPrice: '', stock: '', lowStock: '' });
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return <Modal title={t('newProduct')} onClose={onClose} closeLabel={t('close')}><form onSubmit={(e) => { e.preventDefault(); onSave(form); }}><div className="form-grid"><label>{t('productName')}<input required value={form.name} onChange={change('name')}/></label><label>{t('nepaliName')}<input value={form.nameNe} onChange={change('nameNe')}/></label></div><label>{t('category')}<select value={form.category} onChange={change('category')}><option>Grocery</option><option>Snacks</option><option>Beverage</option><option>Personal care</option><option>Other</option></select></label><div className="form-grid"><label>{t('purchasePrice')}<input required type="number" min="0" value={form.purchasePrice} onChange={change('purchasePrice')}/></label><label>{t('sellingPrice')}<input required type="number" min="0" value={form.sellingPrice} onChange={change('sellingPrice')}/></label><label>{t('currentStock')}<input required type="number" min="0" value={form.stock} onChange={change('stock')}/></label><label>{t('threshold')}<input required type="number" min="0" value={form.lowStock} onChange={change('lowStock')}/></label></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit"><Plus size={18}/>{t('saveProduct')}</Button></div></form></Modal>;
}

function StockModal({ product, lang, t, onClose, onSave }) {
  const [stock, setStock] = useState(product.stock);
  const [lowStock, setLowStock] = useState(product.lowStock);
  return <Modal title={t('updateStock')} onClose={onClose} closeLabel={t('close')}><form onSubmit={(event) => { event.preventDefault(); onSave(product.id, Number(stock), Number(lowStock)); }}><div className="stock-product"><span className="product-symbol">{(lang === 'ne' ? product.nameNe : product.name).charAt(0)}</span><div><strong>{lang === 'ne' ? product.nameNe : product.name}</strong><small>{product.category}</small></div></div><div className="form-grid"><label>{t('currentStock')}<input required type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)}/></label><label>{t('threshold')}<input required type="number" min="0" value={lowStock} onChange={(event) => setLowStock(event.target.value)}/></label></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit"><Check/>{t('saveChanges')}</Button></div></form></Modal>;
}

function InventoryPage({ products, lang, t, addProduct, editStock, searchQuery = '' }) {
  const [query, setQuery] = useState(searchQuery);
  useEffect(() => { if (searchQuery) setQuery(searchQuery); }, [searchQuery]);
  const rows = products.filter((p) => `${p.name} ${p.nameNe}`.toLowerCase().includes(query.toLowerCase()));
  const status = (p) => p.stock === 0 ? ['outOfStock','danger'] : p.stock <= p.lowStock ? ['lowStock','warning'] : p.sold <= 3 ? ['slowMoving','info'] : ['healthy','success'];
  return <div className="page fade-in"><section className="page-title"><div><span className="eyebrow">{t('stock')}</span><h1>{t('inventory')}</h1><p>{products.length} {t('products')} · {products.filter((p) => p.stock <= p.lowStock).length} {t('itemsNeedAttention')}</p></div><Button onClick={addProduct}><Plus/>{t('addProduct')}</Button></section><Alerts products={products} lang={lang} t={t} limit={3}/><article className="card inventory-card"><div className="inventory-tools"><div className="search"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`${t('product')}...`}/></div></div><div className="inventory-table"><div className="inventory-head"><span>{t('product')}</span><span>{t('stock')}</span><span>{t('price')}</span><span>{t('sales')}</span><span>{t('status')}</span></div>{rows.map((p) => { const [key,tone] = status(p); return <div className="inventory-row" key={p.id}><div><span className="product-symbol">{(lang === 'ne' ? p.nameNe : p.name).charAt(0)}</span><span><strong>{lang === 'ne' ? p.nameNe : p.name}</strong><small>{p.category}</small></span></div><button className="stock-edit" onClick={() => editStock(p)} aria-label={`${t('updateStock')}: ${lang === 'ne' ? p.nameNe : p.name}`}><strong>{p.stock.toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-IN')}</strong> {t('units')}</button><span>{money(p.sellingPrice, lang)}</span><span>{p.sold.toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-IN')} {t('units')}</span><span className={`status ${tone}`}><i/>{t(key)}</span></div>; })}</div></article></div>;
}

function AIPage({ sales, products, lang, t, setPage }) {
  const context = buildBusinessContext({ sales, products, profile: { shopName: 'Hamro Byapar' }, lang });
  const insights = generateInsights(context);
  const recommendations = generateRecommendations(context);
  const focusAiSection = (selector) => document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return <div className="page fade-in ai-page">
    <section className="ai-hero">
      <div className="ai-orb"><Bot size={34} /><i /></div>
      <div>
        <span>{t('ai')}</span>
        <h1>{t('hamroAI')}</h1>
        <strong className="ai-hero-tagline">{t('aiCopilot')}</strong>
        <p>{t('aiCopilotDesc')}</p>
      </div>
      <div className="ai-status-badge">
        <span className="status-dot ready" />
        <span>{t('ready')}</span>
        <span className="data-source">{t('basedOnShopData')}</span>
      </div>
    </section>

    <AIBusinessSnapshot context={context} t={t} lang={lang} />

    <AIWatch context={context} t={t} lang={lang} onNavigate={(route) => setPage(route)} />

    <AIInsightsPanel insights={insights} t={t} lang={lang} onNavigate={(route) => setPage(route)} />

    <section className="ai-recommendations">
      <div className="recommendations-header">
        <h2>{t('recommendations')}</h2>
        <span className="recommendations-count">{recommendations.length} {t('actionsSuggested')}</span>
      </div>
      <div className="recommendations-grid">
        {recommendations.slice(0, 4).map((rec, idx) => (
          <article key={`${rec.id}-${idx}`} className={`recommendation-card ${rec.priority}`}>
            <div className="rec-icon">
              {rec.icon === 'package' && <Package size={20} />}
              {rec.icon === 'megaphone' && <MessageSquare size={20} />}
              {rec.icon === 'alert_triangle' && <AlertTriangle size={20} />}
              {rec.icon === 'tag' && <AlertTriangle size={20} />}
              {rec.icon === 'calendar' && <Calendar size={20} />}
              {rec.icon === 'dollar_sign' && <DollarSign size={20} />}
              {rec.icon === 'trending_down' && <TrendingUp size={20} />}
              {rec.icon === 'plus' && <span className="plus-icon">+</span>}
              {rec.icon === 'shopping_cart' && <ShoppingCart size={20} />}
            </div>
            <h3>{rec.title}</h3>
            <p>{rec.explanation}</p>
            <div className="rec-why"><strong>{t('why')}:</strong> {rec.why}</div>
            {rec.action && (
              <button className="rec-action" onClick={() => setPage(rec.action.route)}>
                {rec.action.label}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>

    <section className="ai-quick-questions">
      <div className="quick-questions-header">
        <h2>{t('quickQuestions')}</h2>
        <p>{t('quickQuestionsDesc')}</p>
      </div>
      <div className="quick-questions-grid">
        {['qToday', 'qBest', 'qSlow', 'qRestock', 'qCompare', 'qWatch'].map((q, i) => (
          <button key={q} className="quick-question-btn" onClick={() => focusAiSection(['qSlow', 'qRestock', 'qWatch'].includes(q) ? '.ai-watch' : '.ai-insights-panel')}>
            <span className="qq-icon">
              {i === 5 ? <AlertTriangle /> : i === 3 ? <Package /> : i === 1 ? <TrendingUp /> : <Lightbulb />}
            </span>
            <span>{t(q)}</span>
          </button>
        ))}
      </div>
    </section>

  </div>;
}

function SettingsPage({ profile, setProfile, lang, setLang, presentation, setPresentation, t, loadDemo, subscription, openManage, openUpgrade, openCancel }) {
  const [draft, setDraft] = useState(() => normalizeVatProfile(profile));
  const [formMessage, setFormMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(normalizeVatProfile(profile)), [profile]);
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const toggle = (key) => () => setDraft((current) => ({ ...current, [key]: !current[key] }));
  const subPlan = subscription ? planById(subscription.plan) : planById('FREE');
  const subStatusKey = `status_${subscription?.status || 'active'}`;
  const nextBilling = subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const submit = async (event) => {
    event.preventDefault();
    setFormMessage(null);
    const vatRate = Number(draft.vatRate);
    if (!draft.shopName.trim()) { setFormMessage({ type: 'error', text: t('businessNameRequired') }); return; }
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) { setFormMessage({ type: 'error', text: t('invalidVatRate') }); return; }
    if (draft.vatEnabled && !draft.vatRegistrationNumber.trim()) { setFormMessage({ type: 'error', text: t('vatNumberRequired') }); return; }
    setSaving(true);
    const result = await setProfile(normalizeVatProfile({ ...draft, vatRate }));
    setSaving(false);
    setFormMessage({ type: result?.ok === false ? 'error' : 'success', text: t(result?.ok === false ? 'settingsSaveFailed' : 'settingsSaved') });
  };
  return <div className="page fade-in settings-page"><section className="page-title settings-title"><div><span className="eyebrow">{t('settings')}</span><h1>{t('settingsTitle')}</h1><p>{t('settingsSubtitle')}</p></div></section><form className="settings-form" onSubmit={submit}><section className="card settings-section"><header><span className="settings-section-icon"><Store/></span><div><span className="eyebrow">{t('businessProfile')}</span><h2>{t('shopProfile')}</h2><p>{t('businessProfileHelp')}</p></div></header><div className="settings-fields"><label>{t('shopName')}<input required value={draft.shopName} onChange={update('shopName')}/></label><label>{t('ownerName')}<input value={draft.ownerName} onChange={update('ownerName')}/></label><label>{t('shopType')}<select value={draft.shopType} onChange={update('shopType')}><option>Kirana</option><option>Clothing</option><option>Electronics</option><option>Stationery</option><option>Pharmacy</option><option>Restaurant</option><option>Other</option></select></label><label>{t('location')}<input value={draft.location} onChange={update('location')}/></label><label>{t('currency')}<input value={draft.currency} readOnly/></label></div></section><section className="card settings-section tax-settings"><header><span className="settings-section-icon purple"><Shield/></span><div><span className="eyebrow">{t('taxAndBilling')}</span><h2>{t('vatSettings')}</h2><p>{t('vatSettingsHelp')}</p></div><button type="button" role="switch" aria-label={t('vatEnabled')} aria-checked={draft.vatEnabled} className={`toggle ${draft.vatEnabled ? 'on' : ''}`} onClick={toggle('vatEnabled')}><i/></button></header><div className={`settings-fields ${draft.vatEnabled ? '' : 'disabled-fields'}`}><label>{t('vatRegistrationNumber')}<input disabled={!draft.vatEnabled} required={draft.vatEnabled} value={draft.vatRegistrationNumber} onChange={update('vatRegistrationNumber')} placeholder={t('vatNumberPlaceholder')}/></label><label>{t('vatRate')}<span className="input-suffix"><input disabled={!draft.vatEnabled} type="number" min="0" max="100" step="0.01" value={draft.vatRate} onChange={update('vatRate')}/><i>%</i></span></label><div className="settings-switch-row"><div><strong>{t('pricesIncludeVat')}</strong><small>{t('pricesIncludeVatHelp')}</small></div><button disabled={!draft.vatEnabled} type="button" role="switch" aria-label={t('pricesIncludeVat')} aria-checked={draft.pricesIncludeVat} className={`toggle ${draft.pricesIncludeVat ? 'on' : ''}`} onClick={toggle('pricesIncludeVat')}><i/></button></div></div>{!draft.vatEnabled && <div className="settings-note"><Shield size={16}/>{t('vatDisabledHelp')}</div>}</section><section className="card settings-section preferences-settings"><header><span className="settings-section-icon"><MonitorUp/></span><div><span className="eyebrow">{t('preferences')}</span><h2>{t('displayAndLanguage')}</h2><p>{t('preferencesHelp')}</p></div></header><div className="settings-fields"><label>{t('language')}<select value={lang} onChange={(event) => setLang(event.target.value)}><option value="en">{t('english')}</option><option value="ne">{t('nepali')}</option></select></label><div className="settings-switch-row"><div><strong>{t('presentationMode')}</strong><small>{t('presentationHelp')}</small></div><button type="button" role="switch" aria-label={t('presentationMode')} aria-checked={presentation} className={`toggle ${presentation ? 'on' : ''}`} onClick={() => setPresentation(!presentation)}><i/></button></div></div></section>{formMessage && <div className={`settings-message ${formMessage.type}`} role="status">{formMessage.type === 'success' ? <Check/> : <AlertTriangle/>}<span>{formMessage.text}</span></div>}<div className="settings-save-bar"><div><strong>{t('dataOnDevice')}</strong><small>{t('settingsPersistenceHelp')}</small></div><Button type="submit" disabled={saving}><Check/>{t(saving ? 'saving' : 'saveChanges')}</Button></div></form><section className="card subscription-setting"><div className="subscription-setting-icon"><CreditCard/></div><div className="subscription-setting-main"><span className="eyebrow">{t('subscription')}</span><div className="subscription-plan-row"><h2>{t(subPlan.nameKey || `plan_${subPlan.id.toLowerCase()}`)}</h2><span className={`sub-status-chip ${subscription?.status || 'active'}`}>{t(subStatusKey)}</span></div><p>{t('nextBillingDate')}: <strong>{nextBilling}</strong></p></div><div className="subscription-setting-actions"><Button variant="secondary" onClick={openManage}>{t('featureManage')}</Button><Button variant="navy" onClick={openUpgrade}>{t('upgradePlan')}</Button>{subscription?.plan !== 'FREE' && <Button variant="secondary" onClick={openCancel}>{t('cancelPlan')}</Button>}</div></section><aside className="card demo-card settings-demo"><span><Sparkles/></span><div><h2>{t('demoShop')}</h2><p>{t('demoHelp')}</p></div><Button type="button" onClick={loadDemo}><Store/>{t('loadDemo')}</Button><small>{officialSlogan}</small></aside></div>;
}

function CustomersPage({ t, openUpgrade }) {
  return <div className="page fade-in"><section className="page-title"><div><span className="eyebrow">{t('customers')}</span><h1>{t('customerHub')}</h1><p>{t('customerHelp')}</p></div><Button variant="navy" onClick={openUpgrade}><Plus/>{t('addCustomer')}</Button></section><section className="card feature-empty"><span><Users/></span><h2>{t('customerHub')}</h2><p>{t('customerEmpty')}</p></section></div>;
}

function ReportsPage({ sales, products, profile, lang, t }) {
  const inputDate = (value) => { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
  const today = inputDate(new Date());
  const defaultFrom = inputDate(new Date(Date.now() - 29 * 86_400_000));
  const [draftRange, setDraftRange] = useState({ from: defaultFrom, to: today });
  const [range, setRange] = useState({ from: defaultFrom, to: today });
  const [rangeError, setRangeError] = useState('');
  const [activeReport, setActiveReport] = useState('sales');
  const [draftVatStatus, setDraftVatStatus] = useState('vatable');
  const [vatStatus, setVatStatus] = useState('vatable');
  const locale = lang === 'ne' ? 'ne-NP' : 'en-IN';
  const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  const periodLabel = `${formatDate(range.from)} – ${formatDate(range.to)}`;
  const applyDateRange = () => {
    if (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to) { setRangeError(t('invalidDateRange')); return; }
    setRangeError('');
    setRange(draftRange);
  };
  const filteredSales = sales.filter((sale) => { const key = inputDate(sale.createdAt); return key >= range.from && key <= range.to; });
  const transactions = filteredSales.length;
  const unitsSold = filteredSales.reduce((total, sale) => total + Number(sale.quantity || 0), 0);
  const totalSales = filteredSales.reduce((total, sale) => total + Number(sale.total || 0), 0);
  const revenue = filteredSales.reduce((total, sale) => total + (sale.vatApplicable === true ? vatFromSale(sale).taxableAmount : Number(sale.total || 0)), 0);
  const profit = filteredSales.reduce((total, sale) => total + (sale.vatApplicable === true ? vatFromSale(sale).taxableAmount : Number(sale.total || 0)) - Number(sale.cost || 0), 0);
  const lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= product.lowStock);
  const outOfStockProducts = products.filter((product) => product.stock === 0);
  const inventoryValue = products.reduce((total, product) => total + Number(product.stock || 0) * Number(product.purchasePrice || 0), 0);
  const performance = Object.values(filteredSales.reduce((rows, sale) => {
    const key = sale.productId || sale.productName;
    const netRevenue = sale.vatApplicable === true ? vatFromSale(sale).taxableAmount : Number(sale.total || 0);
    const current = rows[key] || { id: key, name: lang === 'ne' ? sale.productNameNe || sale.productName : sale.productName, units: 0, revenue: 0, profit: 0 };
    current.units += Number(sale.quantity || 0); current.revenue += netRevenue; current.profit += netRevenue - Number(sale.cost || 0); rows[key] = current; return rows;
  }, {})).sort((a, b) => b.revenue - a.revenue);
  const vatSummary = summarizeVat(filteredSales);
  const visibleVatRows = vatSummary.rows.filter(({ vat }) => vatStatus === 'all' || (vatStatus === 'vatable' ? vat.applicable : !vat.applicable));
  const reportTypes = [
    { id: 'sales', icon: ShoppingCart, title: t('salesReport'), description: t('salesReportDesc') },
    { id: 'inventory', icon: Package, title: t('inventoryReport'), description: t('inventoryReportDesc') },
    { id: 'profit', icon: CircleDollarSign, title: t('profitReport'), description: t('profitReportDesc') },
    { id: 'vat', icon: FileText, title: t('vatReport'), description: t('vatReportDesc') },
  ];
  return <div className="page fade-in reports-page">
    <section className="reports-hero"><div><span className="eyebrow">{t('businessReports')}</span><h1>{t('reports')}</h1><p>{t('reportSubtitle')}</p></div><div className="reports-actions report-date-actions"><label>{t('from')}<input type="date" value={draftRange.from} max={draftRange.to || today} onChange={(event) => setDraftRange({ ...draftRange, from: event.target.value })}/></label><label>{t('to')}<input type="date" value={draftRange.to} min={draftRange.from} max={today} onChange={(event) => setDraftRange({ ...draftRange, to: event.target.value })}/></label><Button type="button" variant="navy" onClick={applyDateRange}><BarChart3/>{t('generateReport')}</Button></div></section>
    {rangeError && <div className="report-error" role="alert"><AlertTriangle/>{rangeError}</div>}
    <section className="reports-section"><div className="reports-section-heading"><div><span>{t('reportSummary')}</span><h2>{periodLabel}</h2></div><small>{transactions.toLocaleString(locale)} {t('transactions')}</small></div><div className="metrics report-metrics"><MetricCard icon={ShoppingCart} label={t('totalSales')} value={totalSales} formatValue={(value) => money(value, lang)} note={periodLabel} tone="green"/><MetricCard icon={ShoppingBag} label={t('totalTransactions')} value={transactions} formatValue={(value) => value.toLocaleString(locale)} note={`${unitsSold.toLocaleString(locale)} ${t('unitsSold')}`} tone="blue"/><MetricCard icon={Wallet} label={t('revenue')} value={revenue} formatValue={(value) => money(value, lang)} note={t('excludingOutputVat')} tone="red"/><MetricCard icon={CircleDollarSign} label={t('estimatedProfit')} value={profit} formatValue={(value) => money(value, lang)} note={`${revenue ? Math.round(profit / revenue * 100) : 0}% ${t('margin')}`} tone="gold"/></div></section>
    <section className="reports-section"><div className="reports-section-heading"><div><span>{t('reports')}</span><h2>{t('reportTypes')}</h2></div></div><div className="report-type-grid">{reportTypes.map(({ id, icon: Icon, title, description }) => <button key={id} className={`report-type-card ${activeReport === id ? 'active' : ''}`} onClick={() => setActiveReport(id)}><span className="report-type-icon"><Icon/></span><span className="report-type-copy"><strong>{title}</strong><small>{description}</small></span><span className="report-type-action">{t('viewReport')}</span></button>)}</div></section>
    {activeReport === 'sales' && <section className="reports-detail"><div className="reports-section-heading"><div><span>{t('sales')}</span><h2>{t('salesPerformance')}</h2></div><small>{periodLabel}</small></div><SalesChart sales={filteredSales} lang={lang} t={t} compact/><article className="card report-table-card"><div className="report-card-heading"><div><span className="eyebrow">{t('sales')}</span><h3>{t('productPerformance')}</h3></div><strong>{performance.length} {t('products')}</strong></div>{performance.length ? <div className="report-table"><div className="report-table-head"><span>{t('product')}</span><span>{t('unitsSold')}</span><span>{t('revenue')}</span><span>{t('profit')}</span></div>{performance.slice(0, 10).map((row) => <div className="report-table-row" key={row.id}><strong>{row.name || t('product')}</strong><span>{row.units.toLocaleString(locale)}</span><span>{money(row.revenue, lang)}</span><span className={row.profit >= 0 ? 'positive' : 'negative'}>{money(row.profit, lang)}</span></div>)}</div> : <div className="report-empty"><ShoppingBag/><strong>{t('noSales')}</strong><p>{t('noSalesData')}</p></div>}</article></section>}
    {activeReport === 'inventory' && <section className="reports-detail"><div className="reports-section-heading"><div><span>{t('inventory')}</span><h2>{t('inventoryReport')}</h2></div><small>{products.length.toLocaleString(locale)} {t('products')}</small></div><div className="inventory-report-summary"><article><Package/><span>{t('totalProducts')}</span><strong>{products.length.toLocaleString(locale)}</strong></article><article className="warning"><AlertTriangle/><span>{t('lowStock')}</span><strong>{lowStockProducts.length.toLocaleString(locale)}</strong></article><article className="danger"><X/><span>{t('outOfStock')}</span><strong>{outOfStockProducts.length.toLocaleString(locale)}</strong></article><article><Wallet/><span>{t('inventoryValue')}</span><strong>{money(inventoryValue, lang)}</strong></article></div><article className="card report-table-card">{products.length ? <div className="report-table inventory-report-table"><div className="report-table-head"><span>{t('product')}</span><span>{t('stock')}</span><span>{t('purchasePrice')}</span><span>{t('status')}</span></div>{products.slice(0, 12).map((product) => <div className="report-table-row" key={product.id}><strong>{lang === 'ne' ? product.nameNe : product.name}</strong><span>{product.stock.toLocaleString(locale)} {t('units')}</span><span>{money(product.purchasePrice, lang)}</span><span className={`report-status ${product.stock === 0 ? 'danger' : product.stock <= product.lowStock ? 'warning' : 'healthy'}`}>{t(product.stock === 0 ? 'outOfStock' : product.stock <= product.lowStock ? 'lowStock' : 'healthy')}</span></div>)}</div> : <div className="report-empty"><Package/><strong>{t('noInventoryData')}</strong></div>}</article></section>}
    {activeReport === 'profit' && <section className="reports-detail"><div className="reports-section-heading"><div><span>{t('profit')}</span><h2>{t('profitRevenueReport')}</h2></div><small>{periodLabel}</small></div><div className="inventory-report-summary profit-report-summary"><article><Wallet/><span>{t('totalSales')}</span><strong>{money(totalSales, lang)}</strong></article><article><BarChart3/><span>{t('revenue')}</span><strong>{money(revenue, lang)}</strong></article><article><CircleDollarSign/><span>{t('estimatedProfit')}</span><strong>{money(profit, lang)}</strong></article><article><TrendingUp/><span>{t('margin')}</span><strong>{revenue ? Math.round(profit / revenue * 100) : 0}%</strong></article></div><article className="card report-table-card"><div className="report-card-heading"><div><span className="eyebrow">{t('profit')}</span><h3>{t('productProfitability')}</h3></div></div>{performance.length ? <div className="report-table"><div className="report-table-head"><span>{t('product')}</span><span>{t('unitsSold')}</span><span>{t('revenue')}</span><span>{t('profit')}</span></div>{[...performance].sort((a, b) => b.profit - a.profit).slice(0, 10).map((row) => <div className="report-table-row" key={row.id}><strong>{row.name}</strong><span>{row.units.toLocaleString(locale)}</span><span>{money(row.revenue, lang)}</span><span className={row.profit >= 0 ? 'positive' : 'negative'}>{money(row.profit, lang)}</span></div>)}</div> : <div className="report-empty"><CircleDollarSign/><strong>{t('noSales')}</strong><p>{t('noSalesData')}</p></div>}</article></section>}
    {activeReport === 'vat' && <section className="reports-detail vat-report"><div className="vat-report-heading"><div><span className="eyebrow">{t('vatSummaryReport')}</span><h2>{t('vatReportBasedOnTransactions')}</h2><p>{profile.shopName} · {periodLabel}</p></div><div><span>{t('vatRegistrationNumber')}</span><strong>{profile.vatRegistrationNumber || t('notProvided')}</strong></div></div>{!profile.vatEnabled && <div className="vat-configuration-alert"><Shield/><div><strong>{t('vatDisabled')}</strong><p>{t('enableVatInSettings')}</p></div></div>}{profile.vatEnabled && !profile.vatRegistrationNumber && <div className="vat-configuration-alert warning"><AlertTriangle/><div><strong>{t('missingVatNumber')}</strong><p>{t('addVatNumberInSettings')}</p></div></div>}<div className="vat-summary-grid"><article><span>{t('taxableSales')}</span><strong>{money(vatSummary.taxableSales, lang)}</strong><small>{vatSummary.vatableTransactions.toLocaleString(locale)} {t('vatableTransactions')}</small></article><article><span>{t('outputVat')}</span><strong>{money(vatSummary.outputVat, lang)}</strong><small>{t('recordedSalesOnly')}</small></article><article><span>{t('inputVat')}</span><strong>{t('notAvailable')}</strong><small>{t('purchaseVatUnavailable')}</small></article><article><span>{t('netVat')}</span><strong>{t('notCalculable')}</strong><small>{t('inputVatRequired')}</small></article></div><div className="vat-transaction-summary"><span><strong>{vatSummary.vatableTransactions.toLocaleString(locale)}</strong>{t('vatableTransactions')}</span><span><strong>{vatSummary.nonVatTransactions.toLocaleString(locale)}</strong>{t('nonVatTransactions')}</span><span><strong>{vatSummary.totalTransactions.toLocaleString(locale)}</strong>{t('totalTransactions')}</span></div><div className="vat-table-toolbar"><div><span className="eyebrow">{t('transactionSummary')}</span><h3>{t('vatTransactions')}</h3></div><div><label>{t('vatStatus')}<select value={draftVatStatus} onChange={(event) => setDraftVatStatus(event.target.value)}><option value="vatable">{t('vatableOnly')}</option><option value="nonVat">{t('nonVatOnly')}</option><option value="all">{t('allTransactions')}</option></select></label><Button type="button" variant="secondary" onClick={() => setVatStatus(draftVatStatus)}>{t('applyFilter')}</Button></div></div><article className="card report-table-card vat-table-card">{visibleVatRows.length ? <div className="report-table vat-report-table"><div className="report-table-head"><span>{t('date')}</span><span>{t('invoice')}</span><span>{t('transaction')}</span><span>{t('taxableAmount')}</span><span>{t('vatRate')}</span><span>{t('vatAmount')}</span><span>{t('total')}</span></div>{visibleVatRows.map(({ sale, vat }) => <div className="report-table-row" key={sale.id}><span>{new Date(sale.createdAt).toLocaleDateString(locale)}</span><strong title={sale.id}>{sale.invoiceNumber || sale.id}</strong><span>{t('saleTransaction')}</span><span>{vat.applicable ? money(vat.taxableAmount, lang) : '—'}</span><span>{vat.applicable ? `${vat.rate}%` : '—'}</span><span>{money(vat.vatAmount, lang)}</span><span>{money(vat.total, lang)}</span></div>)}</div> : <div className="report-empty"><FileText/><strong>{t('noVatTransactions')}</strong><p>{t('noVatTransactionsHelp')}</p></div>}</article><div className="vat-report-note"><Shield/>{t('vatVerificationNote')}</div></section>}
  </div>;
}

function App() {
  const [ready, setReady] = useState(false); const [page, setPage] = useState('dashboard'); const [lang, setLangState] = useState(() => localStorage.getItem('hamro-language') || 'en');
  const [presentation, setPresentationState] = useState(() => localStorage.getItem('hamro-presentation') === 'true');
  const [products, setProducts] = useState([]); const [sales, setSales] = useState([]); const [profile, setProfileState] = useState(demoProfile); const [online, setOnline] = useState(navigator.onLine);
  const [notifications, setNotifications] = useState([]); const [alertStates, setAlertStates] = useState({}); const alertStatesRef = useRef({}); const [globalSearch, setGlobalSearch] = useState('');
  const [subscription, setSubscription] = useState(null); const [aiUsage, setAiUsage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false); const [modal, setModal] = useState(null); const [notificationsOpen, setNotificationsOpen] = useState(false); const [toast, setToast] = useState(''); const [connectionNotice, setConnectionNotice] = useState(null); const connectionRef = useRef(navigator.onLine); const t = (key) => translate(lang, key);
  useEffect(() => { loadData().then((data) => { const initial = data || { products: demoProducts, sales: createDemoSales(), profile: demoProfile }; const initialAlertStates = initial.alertStates || createStockAlertBaseline(initial.products); const initialSubscription = normalizeSubscription(initial.subscription || legacySubscription()); alertStatesRef.current = initialAlertStates; setProducts(initial.products); setSales(initial.sales); setProfileState(normalizeVatProfile(initial.profile || demoProfile)); setNotifications(initial.notifications || []); setAlertStates(initialAlertStates); setSubscription(refreshStatus(initialSubscription)); setAiUsage(monthRollover(initial.aiUsage || newUsage())); setReady(true); }); }, []);
  useEffect(() => { if (ready) saveData({ products, sales, profile, notifications, alertStates, subscription, aiUsage }).catch((error) => console.warn('[Hamro Byapar storage] Automatic save failed:', error.message)); }, [products, sales, profile, notifications, alertStates, ready, subscription, aiUsage]);
  useEffect(() => {
    if (!ready) return;
    const result = evaluateStockAlerts(products, alertStatesRef.current);
    alertStatesRef.current = result.states;
    setAlertStates(result.states);
    if (result.alerts.length || result.resolvedAlertIds.length) setNotifications((old) => [...result.alerts, ...resolveNotifications(old, result.resolvedAlertIds)]);
    result.alerts.forEach((alert) => {
      const product = products.find((item) => item.id === alert.productId);
      const updateDelivery = (emailStatus) => {
        setNotifications((old) => updateNotificationEmailStatus(old, alert.id, emailStatus));
        setAlertStates((old) => {
          if (old[alert.productId]?.alertId !== alert.id) return old;
          const next = { ...old, [alert.productId]: { ...old[alert.productId], emailStatus } };
          alertStatesRef.current = next;
          return next;
        });
      };
      const emailAllowed = canAccess('emailAlerts', subscription);
      emailAllowed ? sendStockAlertEmail(alert, product, profile)
        .then((delivery) => updateDelivery(delivery.delivered || delivery.duplicate ? 'sent' : 'failed'))
        .catch((emailError) => { console.warn('[Hamro Byapar alerts] Email delivery failed:', emailError.message); updateDelivery('failed'); }) : updateDelivery('skipped');
    });
  }, [products, profile, ready, subscription]);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dataset.lang = lang; localStorage.setItem('hamro-language', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('hamro-presentation', String(presentation)); }, [presentation]);
  useEffect(() => { const update = () => setOnline(navigator.onLine); addEventListener('online', update); addEventListener('offline', update); return () => { removeEventListener('online', update); removeEventListener('offline', update); }; }, []);
  useEffect(() => {
    if (connectionRef.current === online) return undefined;
    connectionRef.current = online;
    if (!online) {
      setConnectionNotice({ kind: 'offline', message: t('offlineSaved') });
      const timer = window.setTimeout(() => setConnectionNotice(null), 3600);
      return () => window.clearTimeout(timer);
    }
    setConnectionNotice({ kind: 'syncing', message: t('backOnlineSyncing') });
    const syncedTimer = window.setTimeout(() => setConnectionNotice({ kind: 'synced', message: t('syncComplete') }), 900);
    const clearTimer = window.setTimeout(() => setConnectionNotice(null), 3300);
    return () => { window.clearTimeout(syncedTimer); window.clearTimeout(clearTimer); };
  }, [online, lang]);
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3200); };
  const setLang = (next) => { setLangState(next); notify(translate(next, 'languageChanged')); };
  const setPresentation = (next) => { setPresentationState(next); notify(t(next ? 'presentationEnabled' : 'presentationDisabled')); };
  const recordSale = ({ selected, productName, productNameNe, quantity, price, purchasePrice, discount = 0, total, source = 'manual', addToInventory = false, vatApplicable = false, vatRate = profile.vatRate, vatInclusive = profile.pricesIncludeVat, taxableAmount = 0, vatAmount = 0 }) => {
    const qty = Number(quantity); const unitPrice = Number(price); const unitCost = Number(purchasePrice ?? selected?.purchasePrice ?? 0); const createdProduct = !selected && addToInventory;
    const productId = selected?.id || `${createdProduct ? 'p' : 'untracked'}-${crypto.randomUUID()}`; const resolvedName = selected?.name || productName || t('product'); const resolvedNameNe = selected?.nameNe || productNameNe || resolvedName;
    const sale = { id: crypto.randomUUID(), productId, productName: resolvedName, productNameNe: resolvedNameNe, quantity: qty, unitPrice, discount: Number(discount), total: Number(total ?? unitPrice * qty - Number(discount)), cost: unitCost * qty, source, inventoryTracked: Boolean(selected) || createdProduct, createdProduct, vatApplicable: vatApplicable === true, vatRate: Number(vatRate), vatInclusive: vatInclusive !== false, taxableAmount: Number(taxableAmount), vatAmount: Number(vatAmount), createdAt: new Date().toISOString() };
    setSales((old) => [...old, sale]);
    if (selected) setProducts((old) => old.map((product) => product.id === selected.id ? { ...product, stock: Math.max(0, product.stock - qty), sold: (product.sold || 0) + qty } : product));
    else if (createdProduct) setProducts((old) => [...old, { id: productId, name: resolvedName, nameNe: resolvedNameNe, category: 'Other', purchasePrice: unitCost, sellingPrice: unitPrice, stock: 0, lowStock: 5, sold: qty }]);
    notify(t('saleAdded')); return sale;
  };
  const saveSale = (details) => { recordSale({ ...details, purchasePrice: details.selected?.purchasePrice, source: 'manual' }); setModal(null); };
  const saveVoiceSale = (details) => recordSale(details);
  const undoVoiceSale = (sale) => { setSales((old) => old.filter((item) => item.id !== sale.id)); if (sale.createdProduct) setProducts((old) => old.filter((product) => product.id !== sale.productId)); else if (sale.inventoryTracked) setProducts((old) => old.map((product) => product.id === sale.productId ? { ...product, stock: product.stock + sale.quantity, sold: Math.max(0, (product.sold || 0) - sale.quantity) } : product)); notify(t('saleUndone')); };
  const saveProduct = (form) => { setProducts((old) => [...old, { ...form, id: crypto.randomUUID(), nameNe: form.nameNe || form.name, purchasePrice: Number(form.purchasePrice), sellingPrice: Number(form.sellingPrice), stock: Number(form.stock), lowStock: Number(form.lowStock), sold: 0 }]); setModal(null); notify(t('productAdded')); };
  const updateProductStock = (productId, stock, lowStock) => { setProducts((old) => old.map((product) => product.id === productId ? { ...product, stock, lowStock } : product)); setModal(null); notify(t('stockUpdated')); };
  const updateProfile = async (value) => {
    const nextProfile = normalizeVatProfile(value);
    try {
      await saveData({ products, sales, profile: nextProfile, notifications, alertStates, subscription, aiUsage });
      setProfileState(nextProfile);
      notify(t('settingsSaved'));
      return { ok: true };
    } catch (error) {
      console.warn('[Hamro Byapar settings] Save failed:', error.message);
      notify(t('settingsSaveFailed'));
      return { ok: false, error };
    }
  };
  const markAllRead = () => setNotifications((old) => old.map((notification) => ({ ...notification, isRead: true })));
  const loadDemo = () => { const nextProducts = demoProducts.map((p) => ({ ...p })); const baseline = createStockAlertBaseline(nextProducts); alertStatesRef.current = baseline; setProducts(nextProducts); setSales(createDemoSales()); setProfileState(normalizeVatProfile(demoProfile)); setNotifications([]); setAlertStates(baseline); setModal(null); setPage('dashboard'); notify(t('demoLoaded')); };
  const plan = subscription ? planById(subscription.plan) : planById('FREE');
  const upgradeTo = async (planId) => {
    const target = planById(planId);
    if (target.price > 0 && !isDemoPayment()) { notify(t('paymentNotConfigured')); return; }
    try {
      setModal({ type: 'processing-upgrade', plan: target });
      const checkout = await createCheckout({ planId: target.id, subscription });
      await verifyPayment(checkout, subscription);
      const { updated, invoice } = await activateSubscription(subscription, target.id, { currentHistory: subscription?.billingHistory || [] });
      setSubscription(updated);
      setAiUsage((current) => current || newUsage());
      setModal(null);
      setPage('subscription');
      notify(target.price > 0 ? t('planUpgraded') : t('planDowngraded'));
    } catch (error) {
      console.warn('[Hamro Byapar subscription] Upgrade failed:', error.message);
      setModal(null);
      notify(t('upgradeFailed'));
    }
  };
  const downgradeToFree = async () => {
    if (!subscription || subscription.plan === 'FREE') return;
    setSubscription(await cancelSubscription(subscription));
    notify(t('planDowngraded'));
    setModal(null);
  };
  const canUseAi = () => { const summary = usageSummary(aiUsage, plan.plan); return !summary.reached; };
  const requireAi = () => {
    if (!canAccess('aiInsights', subscription) || !canUseAi()) { setModal({ type: 'upgrade', reason: 'ai_limit' }); return false; }
    return true;
  };
  const onAiUsed = () => setAiUsage((prev) => recordAiUsage(prev));
  const pageProps = { sales, products, profile, lang, t, setPage, subscription, aiUsage, canAccess, upgradeModal: (cap) => setModal({ type: 'upgrade', capability: cap }) };
  const analyticsPage = <div className="page fade-in"><section className="page-title"><div><span className="eyebrow">{t('analytics')}</span><h1>{t('salesTrend')}</h1><p>{officialSlogan}</p></div></section><SalesChart sales={sales} lang={lang} t={t}/><div className="two-column"><ProductRanking products={products} t={t} lang={lang}/><ProductRanking products={products} t={t} lang={lang} slow/></div></div>;
  const content = page === 'dashboard' ? <Dashboard {...pageProps} openVoice={() => setModal({ type: 'voice' })} openSale={() => setModal({ type: 'sale' })}/> : page === 'sales' ? <SalesPage {...pageProps} openVoice={() => setModal({ type: 'voice' })} openSale={() => setModal({ type: 'sale' })} quickSell={(product) => setModal({ type: 'sale', product })}/> : page === 'inventory' ? <InventoryPage {...pageProps} searchQuery={globalSearch} addProduct={() => setModal({ type: 'product' })} editStock={(product) => setModal({ type: 'stock', product })}/> : page === 'analytics' ? analyticsPage : page === 'ai' ? <AIPage {...pageProps}/> : page === 'customers' ? <CustomersPage t={t} openUpgrade={() => setModal({ type: 'upgrade', capability: 'multiStaff' })}/> : page === 'reports' ? <ReportsPage {...pageProps}/> : page === 'subscription' ? <SubscriptionPage {...pageProps} billingHistory={(subscription?.billingHistory) || []} onPlanSelect={upgradeTo}/> : <SettingsPage {...pageProps} lang={lang} setLang={setLang} presentation={presentation} setPresentation={setPresentation} setProfile={updateProfile} loadDemo={loadDemo} subscription={subscription} openManage={() => setModal({ type: 'manage' })} openUpgrade={() => setModal({ type: 'upgrade', capability: 'advancedAnalytics' })} openCancel={() => setModal({ type: 'cancel' })}/>;
  if (!ready) return <div className="loading-screen"><Logo/><div className="loading-bar"><i/></div><span>{officialSlogan}</span></div>;
  return <div className={`app-shell ${presentation ? 'presentation' : ''}`}><Sidebar page={page} setPage={setPage} t={t} open={menuOpen} setOpen={setMenuOpen} profile={profile} online={online}/><main><Header lang={lang} setLang={setLang} online={online} presentation={presentation} t={t} page={page} setMenuOpen={setMenuOpen} setPage={setPage} onSearch={setGlobalSearch} notifications={notifications} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} markAllRead={markAllRead}/><div className="page-route" key={page}>{content}</div><footer>{officialSlogan}</footer></main><nav className="mobile-nav">{[['dashboard',LayoutDashboard,'home'],['sales',ShoppingCart,'sales'],['inventory',Package,'inventory'],['ai',Bot,'ai'],['settings',Settings,'more']].map(([id,Icon,key]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon/><span>{t(key)}</span></button>)}</nav>{modal?.type === 'sale' && <SaleModal products={products} profile={profile} lang={lang} t={t} preset={modal.product} onClose={() => setModal(null)} onSave={saveSale}/>} {modal?.type === 'product' && <ProductModal t={t} onClose={() => setModal(null)} onSave={saveProduct}/>} {modal?.type === 'stock' && <StockModal product={modal.product} lang={lang} t={t} onClose={() => setModal(null)} onSave={updateProductStock}/>} {modal?.type === 'voice' && <VoiceAssistant products={products} sales={sales} lang={lang} t={t} aiUsageInfo={usageSummary(aiUsage, plan.plan)} onAiUse={onAiUsed} requireAi={requireAi} autoStart onClose={() => setModal(null)} onSave={saveVoiceSale} onUndo={undoVoiceSale}/>} {modal?.type === 'upgrade' && <UpgradeModal capability={modal.capability || 'advancedAnalytics'} reason={modal.reason} subscription={subscription} t={t} lang={lang} onUpgrade={(planId) => { setModal(null); upgradeTo(planId); }} onClose={() => setModal(null)}/>} {modal?.type === 'manage' && subscription && <ManageSubscriptionModal subscription={subscription} t={t} lang={lang} onUpgrade={(planId) => { setModal(null); upgradeTo(planId); }} onCancel={() => setModal({ type: 'cancel' })} onClose={() => setModal(null)}/>} {modal?.type === 'cancel' && subscription && <CancelConfirmModal subscription={subscription} t={t} onConfirm={() => downgradeToFree()} onClose={() => setModal(null)}/>}<Toast message={toast}/><ConnectionToast notice={connectionNotice}/></div>;
}

export default App;
