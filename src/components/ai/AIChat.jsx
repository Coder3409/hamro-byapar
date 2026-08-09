// src/components/ai/AIChat.jsx
// AI Chat / Business Conversation Component
// Natural language interface for business questions

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Sparkles, Loader2, BarChart3, Package, TrendingUp, AlertTriangle, DollarSign, Calendar, Check, MessageSquare } from 'lucide-react';
import { buildBusinessContext, getFocusedContext } from '../../ai/businessContext.js';
import { generateInsights } from '../../ai/insightEngine.js';
import { generateRecommendations } from '../../ai/recommendationEngine.js';

const MAX_HISTORY = 20;

export default function AIChat({ sales, products, profile, lang, t, onNavigate, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Build context when data changes
  useEffect(() => {
    const ctx = buildBusinessContext({ sales, products, profile, lang });
    setContext(ctx);
  }, [sales, products, profile, lang]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Detect question type from user input
  const detectQuestionType = (question) => {
    const q = question.toLowerCase();
    if (/(today|today's|aaja|आज).*(sale|sales|revenue|बिक्री)/.test(q) || /(what happened|ke bhayo|के भयो)/.test(q)) return 'today';
    if (/(best|top|selling|बिक्दै|धेरै)/.test(q)) return 'best';
    if (/(slow|not selling|kam|कम|बिकिरहेको|नबिकेको)/.test(q)) return 'slow';
    if (/(stock|restock|stok|मौज्दात|पुनः स्टक)/.test(q)) return 'stock';
    if (/(profit|margin|nafa|नाफा)/.test(q)) return 'profit';
    if (/(compare|vs|versus|तुलना|गत हप्ता|last week)/.test(q)) return 'compare';
    if (/(watch|attention|chahiyo|चाहियो|ध्यान)/.test(q)) return 'watch';
    return 'general';
  };

  // Generate AI response based on business context
  const generateResponse = useCallback(async (question) => {
    if (!context) return {
      text: t('analyzingData'),
      data: null,
      charts: null,
    };

    const questionType = detectQuestionType(question);
    const focusedContext = getFocusedContext(context, questionType);
    const insights = generateInsights(focusedContext);
    const recommendations = generateRecommendations(focusedContext);

    // Build response based on question type
    let responseText = '';
    let responseData = null;
    let responseCharts = null;

    switch (questionType) {
      case 'today':
        if (!focusedContext.hasData.todaySales) {
          responseText = t('noSalesToday');
        } else {
          responseText = t('todaySalesSummary')
            .replace('{revenue}', focusedContext.today.revenueFormatted)
            .replace('{orders}', focusedContext.today.orders)
            .replace('{units}', focusedContext.today.unitsSold)
            .replace('{comparison}', focusedContext.today.vsYesterdayLabel);
          responseData = { type: 'today', ...focusedContext.today };
        }
        break;

      case 'best':
        if (focusedContext.products.topProducts.length === 0) {
          responseText = t('noTopProducts');
        } else {
          const top = focusedContext.products.topProducts[0];
          responseText = t('bestSellerAnswer')
            .replace('{product}', top.name)
            .replace('{sold}', top.sold)
            .replace('{revenue}', top.revenueFormatted)
            .replace('{margin}', top.margin);
          responseData = { type: 'product', product: top };
        }
        break;

      case 'slow':
        if (focusedContext.products.slowMovers.length === 0) {
          responseText = t('noSlowMovers');
        } else {
          const slow = focusedContext.products.slowMovers.slice(0, 3);
          responseText = t('slowMoversAnswer')
            .replace('{count}', slow.length)
            .replace('{products}', slow.map(p => p.name).join(', '));
          responseData = { type: 'slow', products: slow };
        }
        break;

      case 'stock':
        if (!focusedContext.hasData.inventory) {
          responseText = t('noInventoryData');
        } else {
          const { lowStockCount, outOfStockCount, lowStockProducts, outOfStockProducts } = focusedContext.inventory;
          if (outOfStockCount > 0 || lowStockCount > 0) {
            responseText = t('stockAlertAnswer')
              .replace('{outOfStock}', outOfStockCount)
              .replace('{lowStock}', lowStockCount);
            responseData = { type: 'stock', lowStockProducts, outOfStockProducts };
          } else {
            responseText = t('stockHealthy');
          }
        }
        break;

      case 'profit':
        if (!focusedContext.hasData.sales) {
          responseText = t('noProfitData');
        } else {
          responseText = t('profitAnswer')
            .replace('{profit}', focusedContext.today.profitFormatted)
            .replace('{margin}', focusedContext.summary.profitMargin)
            .replace('{revenue}', focusedContext.today.revenueFormatted);
          responseData = { type: 'profit', ...focusedContext.today, margin: focusedContext.summary.profitMargin };
        }
        break;

      case 'compare':
        if (focusedContext.week.vsLastWeek === null) {
          responseText = t('insufficientComparisonData');
        } else {
          const change = focusedContext.week.vsLastWeek;
          responseText = t('compareAnswer')
            .replace('{change}', Math.abs(change))
            .replace('{direction}', change >= 0 ? t('increased') : t('decreased'))
            .replace('{thisWeek}', focusedContext.week.revenueFormatted);
          responseData = { type: 'compare', change: focusedContext.week.vsLastWeek };
        }
        break;

      case 'watch':
        const watchItems = [];
        if (focusedContext.inventory.lowStockCount > 0) watchItems.push(t('lowStockWatch'));
        if (focusedContext.week.vsLastWeek !== null && focusedContext.week.vsLastWeek < 0) watchItems.push(t('salesDropWatch'));
        if (focusedContext.products.slowMovers.length > 0) watchItems.push(t('slowMoversWatch'));

        if (watchItems.length > 0) {
          responseText = t('watchAnswer').replace('{items}', watchItems.join('; '));
        } else {
          responseText = t('allGoodWatch');
        }
        responseData = { type: 'watch', items: watchItems };
        break;

      default:
        // General business overview
        if (!focusedContext.hasData.sales) {
          responseText = t('generalEmpty');
        } else {
          responseText = t('generalAnswer')
            .replace('{revenue}', focusedContext.today.revenueFormatted)
            .replace('{orders}', focusedContext.today.orders)
            .replace('{lowStock}', focusedContext.inventory.lowStockCount)
            .replace('{topProduct}', focusedContext.products.topProducts[0]?.name || t('none'));
          responseData = { type: 'general', summary: focusedContext.summary };
        }
    }

    return {
      text: responseText,
      data: responseData,
      charts: responseCharts,
      insights: insights.slice(0, 3),
      recommendations: recommendations.slice(0, 3),
    };
  }, [context, t, generateInsights, generateRecommendations]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');

    try {
      const response = await generateResponse(trimmed);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.text,
        data: response.data,
        insights: response.insights,
        recommendations: response.recommendations,
      }]);
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('aiError'),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, generateResponse]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
    handleSend();
  };

  const quickQuestions = [
    { key: 'qToday', icon: Calendar },
    { key: 'qBest', icon: TrendingUp },
    { key: 'qSlow', icon: TrendingUp },
    { key: 'qRestock', icon: Package },
    { key: 'qCompare', icon: BarChart3 },
    { key: 'qWatch', icon: AlertTriangle },
  ];

  if (!context) {
    return (
      <div className="ai-chat-loading">
        <Loader2 className="spin" size={32} />
        <p>{t('analyzingData')}</p>
      </div>
    );
  }

  return (
    <div className="ai-chat">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <Sparkles size={20} />
          <span>{t('hamroAI')}</span>
        </div>
        <div className="ai-chat-status">
          <span className="status-dot ready" />
          <span>{t('ready')}</span>
        </div>
        {onClose && (
          <button className="ai-chat-close" onClick={onClose} aria-label={t('close')}>
            <X size={20} />
          </button>
        )}
      </div>

      <div className="ai-chat-messages" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="ai-chat-welcome">
            <Sparkles size={48} />
            <h3>{t('welcomeToAI')}</h3>
            <p>{t('welcomeToAIDesc')}</p>
            <div className="ai-quick-questions">
              {quickQuestions.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  className="ai-quick-btn"
                  onClick={() => handleQuickQuestion(t(key))}
                >
                  <Icon size={16} />
                  <span>{t(key)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`ai-message ${msg.role}`}>
            <div className="ai-message-avatar">
              {msg.role === 'user' ? (
                <span className="user-avatar">U</span>
              ) : (
                <Sparkles size={16} />
              )}
            </div>
            <div className="ai-message-content">
              <p>{msg.content}</p>
              {msg.data && (
                <div className="ai-message-data">
                  <AIDataCard data={msg.data} lang={lang} t={t} onNavigate={onNavigate} />
                </div>
              )}
              {msg.insights && msg.insights.length > 0 && (
                <div className="ai-message-insights">
                  {msg.insights.map((insight, i) => (
                    <AIInsightCard key={i} insight={insight} lang={lang} t={t} onNavigate={onNavigate} />
                  ))}
                </div>
              )}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="ai-message-recommendations">
                  {msg.recommendations.map((rec, i) => (
                    <AIRecommendationCard key={i} recommendation={rec} lang={lang} t={t} onNavigate={onNavigate} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-message assistant loading">
            <div className="ai-message-avatar"><Sparkles size={16} /></div>
            <div className="ai-message-content">
              <div className="ai-typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('askQuestion')}
            disabled={isLoading}
            aria-label={t('askQuestion')}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="ai-send-btn"
            aria-label={t('send')}
          >
            <Send size={20} />
          </button>
        </form>
        <p className="ai-chat-hint">{t('dataSourceNotice')}</p>
      </div>
    </div>
  );
}

// Data card component for structured data display
function AIDataCard({ data, lang, t, onNavigate }) {
  if (!data) return null;

  const formatValue = (val) => {
    if (typeof val === 'number' && val > 1000) {
      return val.toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-IN');
    }
    return val;
  };

  return (
    <div className="ai-data-card">
      {data.type === 'today' && (
        <div className="data-grid">
          <div className="data-item"><span className="data-label">{t('revenue')}</span><span className="data-value">{data.revenueFormatted}</span></div>
          <div className="data-item"><span className="data-label">{t('orders')}</span><span className="data-value">{data.orders}</span></div>
          <div className="data-item"><span className="data-label">{t('unitsSold')}</span><span className="data-value">{data.unitsSold}</span></div>
          <div className="data-item"><span className="data-label">{t('comparison')}</span><span className="data-value">{data.vsYesterdayLabel}</span></div>
        </div>
      )}
      {data.type === 'product' && (
        <div className="data-grid">
          <div className="data-item"><span className="data-label">{t('product')}</span><span className="data-value">{data.product.name}</span></div>
          <div className="data-item"><span className="data-label">{t('unitsSold')}</span><span className="data-value">{data.product.sold}</span></div>
          <div className="data-item"><span className="data-label">{t('revenue')}</span><span className="data-value">{data.product.revenueFormatted}</span></div>
          <div className="data-item"><span className="data-label">{t('margin')}</span><span className="data-value">{data.product.margin}%</span></div>
        </div>
      )}
      {data.type === 'stock' && (
        <div className="data-grid">
          <div className="data-item critical"><span className="data-label">{t('outOfStock')}</span><span className="data-value">{data.outOfStockProducts.length}</span></div>
          <div className="data-item warning"><span className="data-label">{t('lowStock')}</span><span className="data-value">{data.lowStockProducts.length}</span></div>
        </div>
      )}
      {data.type === 'profit' && (
        <div className="data-grid">
          <div className="data-item"><span className="data-label">{t('profit')}</span><span className="data-value">{data.profitFormatted}</span></div>
          <div className="data-item"><span className="data-label">{t('margin')}</span><span className="data-value">{data.margin}%</span></div>
        </div>
      )}
      {data.type === 'compare' && (
        <div className="data-grid">
          <div className="data-item"><span className="data-label">{t('weeklyChange')}</span><span className="data-value">{data.change >= 0 ? '+' : ''}{data.change}%</span></div>
        </div>
      )}
    </div>
  );
}

// Insight card component
function AIInsightCard({ insight, lang, t, onNavigate }) {
  const priorityColors = {
    critical: 'var(--red)',
    warning: 'var(--gold)',
    opportunity: 'var(--purple)',
    insight: 'var(--green)',
  };

  return (
    <div className="ai-insight-card" style={{ borderLeftColor: priorityColors[insight.priority] }}>
      <div className="ai-insight-header">
        <span className="ai-insight-icon" style={{ background: priorityColors[insight.priority] }}>
          {insight.icon === 'alert_circle' && <AlertTriangle size={14} />}
          {insight.icon === 'alert_triangle' && <AlertTriangle size={14} />}
          {insight.icon === 'trending_up' && <TrendingUp size={14} />}
          {insight.icon === 'trending_down' && <TrendingUp size={14} />}
          {insight.icon === 'package' && <Package size={14} />}
          {insight.icon === 'dollar_sign' && <DollarSign size={14} />}
          {insight.icon === 'calendar' && <Calendar size={14} />}
          {insight.icon === 'info' && <MessageSquare size={14} />}
        </span>
        <span className={`ai-insight-priority ${insight.priority}`}>{t(insight.priority)}</span>
      </div>
      <h4>{insight.title}</h4>
      <p>{insight.explanation}</p>
      <div className="ai-insight-why">
        <strong>{t('why')}:</strong> {insight.why}
      </div>
      {insight.action && (
        <button className="ai-insight-action" onClick={() => onNavigate?.(insight.action.route, insight.action.params)}>
          {insight.action.label}
        </button>
      )}
    </div>
  );
}

// Recommendation card component
function AIRecommendationCard({ recommendation, lang, t, onNavigate }) {
  const priorityColors = {
    critical: 'var(--red)',
    high: 'var(--gold)',
    medium: 'var(--purple)',
    low: 'var(--green)',
  };

  return (
    <div className="ai-recommendation-card" style={{ borderLeftColor: priorityColors[recommendation.priority] }}>
      <div className="ai-rec-header">
        <span className="ai-rec-icon" style={{ background: priorityColors[recommendation.priority] }}>
          {recommendation.icon === 'package' && <Package size={14} />}
          {recommendation.icon === 'megaphone' && <MessageSquare size={14} />}
          {recommendation.icon === 'alert_triangle' && <AlertTriangle size={14} />}
          {recommendation.icon === 'tag' && <AlertTriangle size={14} />}
          {recommendation.icon === 'calendar' && <Calendar size={14} />}
          {recommendation.icon === 'dollar_sign' && <DollarSign size={14} />}
          {recommendation.icon === 'trending_down' && <TrendingUp size={14} />}
          {recommendation.icon === 'plus' && <span>+</span>}
          {recommendation.icon === 'shopping_cart' && <Package size={14} />}
        </span>
        <span className={`ai-rec-priority ${recommendation.priority}`}>{t(recommendation.priority)}</span>
      </div>
      <h4>{recommendation.title}</h4>
      <p>{recommendation.explanation}</p>
      <div className="ai-rec-why">
        <strong>{t('why')}:</strong> {recommendation.why}
      </div>
      {recommendation.action && (
        <button className="ai-rec-action" onClick={() => onNavigate?.(recommendation.action.route, recommendation.action.params)}>
          {recommendation.action.label}
        </button>
      )}
    </div>
  );
}