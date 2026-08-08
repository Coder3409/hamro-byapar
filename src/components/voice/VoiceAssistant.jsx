import { useRef, useState } from 'react';
import { AlertCircle, Bot, Check, Edit3, Keyboard, Mic, MicOff, PackagePlus, RotateCcw, Sparkles, Volume2, X } from 'lucide-react';
import { money } from '../../utils/analytics.js';
import { answerVoiceQuestion, calculateVoiceSale, parseVoiceCommand } from '../../utils/voiceParser.js';

export default function VoiceAssistant({ products, sales, lang, t, onClose, onSave, onUndo }) {
  const [mode, setMode] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState(null);
  const [form, setForm] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [inventoryChoice, setInventoryChoice] = useState(null);
  const [savedSale, setSavedSale] = useState(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const speechSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const examples = lang === 'ne'
    ? ['मैले ५ वटा साबुन ३० मा किनेँ र ४५ मा बेचेँ।', 'आजको बिक्री कति छ?', 'कुन सामानको स्टक कम छ?']
    : ['10 packet noodles 20 ma kine, 25 ma beche.', 'I bought 5 soaps for 30 and sold them for 45.', 'Aaja ko sales kati cha?'];

  const reset = () => { setMode('idle'); setTranscript(''); transcriptRef.current = ''; setParsed(null); setForm(null); setAnswer(null); setError(''); setEditing(false); setInventoryChoice(null); setSavedSale(null); };
  const close = () => { recognitionRef.current?.abort?.(); onClose(); };

  const processTranscript = (value) => {
    const spoken = value.trim();
    if (!spoken) { setError(t('voiceNeedTranscript')); return; }
    setError(''); setMode('processing');
    window.setTimeout(() => {
      const result = parseVoiceCommand(spoken, products);
      setParsed(result);
      if (result.kind === 'question') {
        setAnswer(answerVoiceQuestion(result.question, sales, products, lang));
        setMode('question');
        return;
      }
      const productId = result.matchConfidence >= 0.58 ? result.product?.id || '' : '';
      setForm({ productId, productName: result.productName, quantity: result.quantity, purchasePrice: result.purchasePrice ?? '', sellingPrice: result.sellingPrice ?? '' });
      setEditing(result.missing.length > 0 || result.matchConfidence < 0.58);
      setInventoryChoice(result.product ? 'existing' : null);
      setMode('review');
    }, 520);
  };

  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setError(t('voiceUnavailable')); setMode('idle'); return; }
    setError(''); setTranscript(''); transcriptRef.current = '';
    const recognition = new Recognition();
    recognition.lang = lang === 'ne' ? 'ne-NP' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setMode('listening');
    recognition.onresult = (event) => {
      let next = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) next += event.results[index][0].transcript;
      transcriptRef.current = next;
      setTranscript(next);
    };
    recognition.onerror = () => { setError(t('voiceUnavailable')); setMode('idle'); };
    recognition.onend = () => { if (transcriptRef.current.trim()) processTranscript(transcriptRef.current); else setMode('idle'); };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setError(t('voiceUnavailable')); setMode('idle'); }
  };

  const stopListening = () => recognitionRef.current?.stop?.();
  const selected = products.find((product) => product.id === form?.productId);
  const calculation = form ? calculateVoiceSale(form) : null;
  const incomplete = !form?.productName || form.purchasePrice === '' || form.sellingPrice === '' || Number(form.quantity) < 1;
  const needsInventoryChoice = form && !selected && inventoryChoice == null;

  const save = () => {
    if (incomplete || needsInventoryChoice) { setEditing(true); return; }
    const sale = onSave({
      selected, productName: form.productName, productNameNe: form.productName, quantity: Number(form.quantity),
      purchasePrice: Number(form.purchasePrice), price: Number(form.sellingPrice), discount: 0, total: calculation.revenue,
      source: 'voice', addToInventory: inventoryChoice === 'add',
    });
    setSavedSale(sale); setMode('saved');
  };

  return <div className="voice-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <section className="voice-panel" role="dialog" aria-modal="true" aria-label={t('hamroVoice')}>
      <header className="voice-header"><div className="voice-brand"><span><Mic/></span><div><strong>{t('hamroVoice')}</strong><small>{t('voiceTagline')}</small></div></div><button className="icon-button" onClick={close} aria-label={t('close')}><X/></button></header>

      {mode === 'idle' && <div className="voice-idle">
        <div className="voice-orb"><Mic/><i/><i/><i/></div>
        <h2>{t('speakSale')}</h2><p>{t('voiceIntro')}</p>
        <button className="voice-start" onClick={startListening}><Mic/>{t('startSpeaking')}</button>
        {!speechSupported && <div className="voice-notice"><AlertCircle/><span>{t('voiceUnavailable')}</span></div>}
        <div className="voice-divider"><span>{t('typeInstead')}</span></div>
        <div className="transcript-entry"><Keyboard/><textarea value={transcript} onChange={(event) => { setTranscript(event.target.value); transcriptRef.current = event.target.value; }} placeholder={t('transcriptPlaceholder')}/></div>
        {error && <p className="voice-error">{error}</p>}
        <button className="button primary voice-understand" onClick={() => processTranscript(transcript)}><Sparkles/>{t('understand')}</button>
        <div className="voice-examples"><strong>{t('trySaying')}</strong>{examples.map((example) => <button key={example} onClick={() => { setTranscript(example); transcriptRef.current = example; processTranscript(example); }}>“{example}”</button>)}</div>
      </div>}

      {mode === 'listening' && <div className="voice-listening"><div className="listening-mic"><Mic/><span/><span/><span/></div><h2>{t('listening')}</h2><p>{t('listeningHelp')}</p><blockquote>{transcript || t('listeningPlaceholder')}</blockquote><div className="sound-wave">{Array.from({ length: 18 }, (_, index) => <i key={index}/>)}</div><button className="button secondary" onClick={stopListening}><MicOff/>{t('stopListening')}</button></div>}

      {mode === 'processing' && <div className="voice-processing"><div className="processing-mark"><Bot/><i/></div><h2>{t('understandingSale')}</h2><p>“{transcript}”</p><div className="processing-dots"><i/><i/><i/></div></div>}

      {mode === 'question' && answer && <div className="voice-question-answer"><span className="answer-icon"><Volume2/></span><small>{t('hamroVoiceSays')}</small><h2>{answer.title}</h2><strong>{answer.value}</strong><p>{answer.detail}</p><button className="button secondary" onClick={reset}><RotateCcw/>{t('askAnother')}</button></div>}

      {mode === 'review' && form && <div className="voice-review">
        <div className="understood-heading"><div><span><Sparkles/></span><div><small>{t('hamroVoiceUnderstood')}</small><h2>{form.productName || t('missingProduct')}</h2></div></div><span className="confidence">{parsed.confidence}% {t('confidence')}</span></div>
        {parsed.missing.length > 0 && <div className="missing-banner"><AlertCircle/><div><strong>{t('missingInfo')}</strong><p>{parsed.missing.map((field) => t(field === 'purchasePrice' ? 'missingPurchase' : field === 'sellingPrice' ? 'missingSelling' : 'missingProduct')).join(' ')}</p></div></div>}
        {selected && parsed.productName !== selected.name && <div className="product-match"><Check/><span>{parsed.productName} → {t('matchedInventory')}: <strong>{lang === 'ne' ? selected.nameNe : selected.name}</strong></span></div>}
        {!selected && <div className="new-product-card"><PackagePlus/><div><strong>{t('newProductDetected')}</strong><p>{t('newProductHelp')}</p><div><button className={inventoryChoice === 'add' ? 'active' : ''} onClick={() => setInventoryChoice('add')}>{t('addProduct')}</button><button className={inventoryChoice === 'continue' ? 'active' : ''} onClick={() => setInventoryChoice('continue')}>{t('continueWithoutInventory')}</button></div></div></div>}

        {editing ? <div className="voice-edit-grid"><label>{t('product')}<select value={form.productId} onChange={(event) => { const product = products.find((item) => item.id === event.target.value); setForm({ ...form, productId: event.target.value, productName: product?.name || form.productName }); setInventoryChoice(product ? 'existing' : null); }}><option value="">{t('newProductDetected')}</option>{products.map((product) => <option value={product.id} key={product.id}>{lang === 'ne' ? product.nameNe : product.name}</option>)}</select></label>{!form.productId && <label>{t('productName')}<input value={form.productName} onChange={(event) => setForm({ ...form, productName: event.target.value })}/></label>}<label>{t('quantity')}<input type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })}/></label><label>{t('purchasePrice')}<input type="number" min="0" value={form.purchasePrice} onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })}/></label><label>{t('sellingPrice')}<input type="number" min="0" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })}/></label></div> : <div className="voice-fields"><div><span>{t('quantity')}</span><strong>{form.quantity}{parsed.quantityDefaulted && <small>{t('defaultQuantity')}</small>}</strong></div><div><span>{t('boughtAt')}</span><strong>{money(form.purchasePrice, lang)}</strong></div><div><span>{t('soldAt')}</span><strong>{money(form.sellingPrice, lang)}</strong></div><div className="profit-field"><span>{t('profit')}</span><strong>{calculation.profit >= 0 ? '+' : ''}{money(calculation.profit, lang)}</strong></div></div>}
        <div className="voice-calculations"><div><span>{t('cost')}</span><strong>{money(calculation.cost, lang)}</strong></div><div><span>{t('revenue')}</span><strong>{money(calculation.revenue, lang)}</strong></div><div><span>{t('profitPerUnit')}</span><strong>{money(calculation.profitPerUnit, lang)}</strong></div><div><span>{t('margin')}</span><strong>{calculation.margin}%</strong></div></div>
        <div className="voice-actions"><button className="button secondary" onClick={reset}>{t('cancel')}</button><button className="button secondary" onClick={() => setEditing(!editing)}><Edit3/>{editing ? t('doneEditing') : t('edit')}</button><button className="button primary" disabled={incomplete || needsInventoryChoice} onClick={save}><Check/>{t('saveVoiceSale')}</button></div>
      </div>}

      {mode === 'saved' && savedSale && <div className="voice-saved"><div className="saved-check"><Check/></div><h2>{t('saleSaved')}</h2><strong>{lang === 'ne' ? savedSale.productNameNe : savedSale.productName} × {savedSale.quantity}</strong><p>{t('profit')}: <b>+{money(savedSale.total - savedSale.cost, lang)}</b></p><div className="saved-insight"><Bot/><span>{t('voiceSavedInsight').replace('{product}', lang === 'ne' ? savedSale.productNameNe : savedSale.productName).replace('{profit}', money(savedSale.total - savedSale.cost, lang))}</span></div><div className="voice-actions"><button className="button secondary" onClick={() => { onUndo(savedSale); setSavedSale(null); setMode('idle'); }}><RotateCcw/>{t('undo')}</button><button className="button primary" onClick={close}><Check/>{t('done')}</button></div></div>}
    </section>
  </div>;
}
