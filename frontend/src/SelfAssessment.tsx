import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, HeartPulse, Info, Leaf, RotateCcw, ShieldCheck } from 'lucide-react';
import { api, saveText } from './api';
import { ErrorBox, Loading } from './ui';
import { useIndividual } from './IndividualContext';
import type { CheckInResult, CheckInSchema } from './types';
import './self-assessment.css';

const steps = ['Your work', 'Your energy', 'Work & recovery'];

export function SelfAssessment() {
  const { data: saved, setData, reset } = useIndividual();
  const navigate = useNavigate(); const location = useLocation();
  const [schema, setSchema] = useState<CheckInSchema | null>(saved.schema);
  const [answers, setAnswers] = useState<Record<string, number>>(saved.answers);
  const [wellbeing, setWellbeing] = useState<Record<string, string>>(saved.wellbeing);
  const [step, setStep] = useState(location.pathname.endsWith('/results') && saved.result ? 3 : 0);
  const [result, setResult] = useState<CheckInResult | null>(saved.result);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (schema) return;
    const controller = new AbortController(); setLoadError('');
    api<CheckInSchema>('/self-assessment', { signal: controller.signal }).then(setSchema).catch(e => { if (e.name !== 'AbortError') setLoadError(e.message); });
    return () => controller.abort();
  }, [retry]);

  function goTo(next: number) {
    setStep(next); setError('');
    requestAnimationFrame(() => { headingRef.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step < 2) { goTo(step + 1); return; }
    setBusy(true); setError('');
    const optional = Object.fromEntries(schema!.factors.map(f => [f.id, wellbeing[f.id] === undefined || wellbeing[f.id] === '' ? null : Number(wellbeing[f.id])]));
    try {
      const response = await api<CheckInResult>('/self-assessment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ burnout_answers: answers, wellbeing: optional }) });
      if (mounted.current) { setData({ answers, wellbeing, result: response, schema, scenario: null }); navigate('/individual/results'); }
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  }
  function clear() { reset(); setAnswers({}); setWellbeing({}); setResult(null); navigate('/individual'); goTo(0); }
  function answerChanged(id: string, value: number) { const next = { ...answers, [id]: value }; setAnswers(next); setResult(null); setError(''); setData({ ...saved, answers: next, wellbeing, schema, result: null, scenario: null }); }
  function factorChanged(id: string, value: string) { const next = { ...wellbeing, [id]: value }; setWellbeing(next); setResult(null); setError(''); setData({ ...saved, answers, wellbeing: next, schema, result: null, scenario: null }); }
  function download() {
    if (!result) return;
    const lines = [
      'My Workwell self-assessment', '',
      `Work-related burnout score: ${result.burnout.score.toFixed(2)} / 100`,
      'Copenhagen Burnout Inventory, work-related subscale. Higher scores indicate more reported exhaustion.',
      'This is a self-reflection summary, not a diagnosis or a probability.', '',
      'My burnout questionnaire responses',
      ...result.burnout.items.map(item => `${item.question}\n  ${item.answer} (${item.points}/100 after scoring${item.reverse_scored ? ', reverse-scored item' : ''})`), '',
      'My additional wellbeing indicators',
      ...result.factors.map(f => `${f.label}: ${f.value === null ? 'Not provided' : `${f.value} ${f.unit}`}`), '',
      'Ideas for my next step', ...result.suggestions.map(s => `${s.title}\n${s.text}`), '',
      'Scoring', result.method, result.suggestion_method, '', result.privacy, '',
      'Attribution', result.attribution, '', 'Sources', ...result.sources.map(s => `${s.title}: ${s.url}`),
    ];
    if (saved.scenario) lines.push('', 'My what-if targets (not a health forecast)', ...result.factors.map(f => `${f.label}: ${saved.scenario?.[f.id] || 'Not provided'} ${f.unit}`), 'My measured CBI score is unchanged. These targets do not predict future burnout.');
    saveText(lines.join('\n'), 'workwell-self-assessment.txt', 'text/plain;charset=utf-8');
  }

  if (loadError) return <ErrorBox message={loadError} retry={() => setRetry(r => r + 1)} />;
  if (!schema) return <Loading label="Loading your self-assessment" />;
  const completed = schema.questions.filter(q => answers[q.id] !== undefined).length;
  const currentQuestions = step === 0 ? schema.questions.slice(0, 3) : schema.questions.slice(3);

  return <div className="employee-checkin">
    <div className="checkin-intro"><span><ShieldCheck size={16} />No name or employee ID required</span><span>Answers are processed in memory and are not saved.</span></div>
    {step < 3 ? <div className="checkin-layout">
      <section className="panel checkin-form-panel" aria-busy={busy}>
        <ol className="checkin-steps" aria-label="Self-assessment progress">{steps.map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined} className={step === i ? 'current' : step > i ? 'complete' : ''}><span>{step > i ? <Check size={13} /> : i + 1}</span>{label}</li>)}</ol>
        <div className="checkin-form-heading"><h2 tabIndex={-1} ref={headingRef}>{step === 0 ? 'What does work feel like?' : step === 1 ? 'How much energy is work taking?' : 'Look at the rest of the picture.'}</h2><p>{step < 2 ? 'Choose the response that best reflects your experience at work.' : 'These six questions are optional. Share what feels useful to you.'}</p><div className="checkin-progress"><span style={{ transform: `scaleX(${completed / schema.questions.length})` }} /></div><span className="checkin-completed">{completed} of {schema.questions.length} burnout questions answered</span></div>
        <form onSubmit={submit} onInvalidCapture={() => setError(step < 2 ? 'Please answer each question in this section before continuing.' : 'Check the values below. Sleep must be between 0 and 24 hours, and a workweek between 0 and 168 hours.')}>
          {step < 2 ? <div className="checkin-questions">{currentQuestions.map((question, index) => <fieldset className="checkin-question" key={question.id} disabled={busy}><legend><span>{(step === 0 ? 0 : 3) + index + 1}.</span> {question.text}</legend><div className="checkin-options">{question.options.map((option, value) => <label className="checkin-option" key={option}><input type="radio" name={question.id} required value={value} checked={answers[question.id] === value} onChange={() => answerChanged(question.id, value)} /><span>{option}</span></label>)}</div></fieldset>)}</div> : <div className="checkin-factors">{schema.factors.map(factor => <div className="field checkin-factor" key={factor.id}><label htmlFor={`wellbeing-${factor.id}`}>{factor.question}</label>{factor.kind === 'rating' ? <select id={`wellbeing-${factor.id}`} value={wellbeing[factor.id] ?? ''} disabled={busy} onChange={e => factorChanged(factor.id, e.target.value)}><option value="">Prefer not to answer</option>{Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}{i === 0 ? `: ${factor.low_label}` : i === 10 ? `: ${factor.high_label}` : ''}</option>)}</select> : <div className="checkin-number"><input id={`wellbeing-${factor.id}`} type="number" min={factor.min} max={factor.max} step="any" value={wellbeing[factor.id] ?? ''} disabled={busy} onChange={e => factorChanged(factor.id, e.target.value)} /><span>{factor.unit}</span></div>}<small>{factor.kind === 'rating' ? `0 = ${factor.low_label}. 10 = ${factor.high_label}.` : `Optional. Enter a value from ${factor.min} to ${factor.max}.`}</small></div>)}</div>}
          {error && <div className="checkin-form-error"><ErrorBox message={error} /></div>}
          <div className="checkin-actions"><span>Step {step + 1} of {steps.length}</span><div className="button-row">{step > 0 && <button type="button" className="button secondary" disabled={busy} onClick={() => goTo(step - 1)}><ArrowLeft size={15} />Back</button>}<button className="button primary" type="submit" disabled={busy}>{busy ? 'Preparing your summary…' : step < 2 ? 'Continue' : 'See my summary'}<ArrowRight size={16} /></button></div></div>
        </form>
      </section>
      <aside className="checkin-guide"><HeartPulse size={32} strokeWidth={1.4} /><h2>A moment, just for you.</h2><p>There is no right answer. Notice where you are, and what you might need.</p><ul><li><Check size={16} /><span>Seven questions about your experience at work.</span></li><li><Check size={16} /><span>Optional space for stress, rest, and support.</span></li><li><Check size={16} /><span>Your own summary and a what-if explorer.</span></li></ul><div className="checkin-boundary"><Info size={16} /><p>The score uses the Copenhagen Burnout Inventory’s work-related scale. It supports reflection and does not provide a medical diagnosis.</p></div></aside>
    </div> : result && <div className="checkin-results" aria-live="polite">
      <div className="checkin-result-heading"><div><h2 tabIndex={-1} ref={headingRef}>Your wellbeing snapshot</h2><p>Based on the answers you chose for this check-in.</p></div><div className="button-row"><Link className="button secondary" to="/individual"><ArrowLeft size={15} />Review my answers</Link><button className="button primary" onClick={download}><ArrowDownToLine size={16} />Download my summary</button></div></div>
      <div className="checkin-results-grid"><section className="panel checkin-score-panel"><div className="panel-heading"><div><h2>Work-related burnout score</h2><p>Copenhagen Burnout Inventory, work-related subscale</p></div><Leaf size={22} /></div><div className="checkin-score"><strong>{result.burnout.score.toFixed(1)}<span> / 100</span></strong><p>Higher scores indicate more reported exhaustion related to work.</p><div className="checkin-score-track" role="img" aria-label={`Work-related exhaustion score ${result.burnout.score} out of 100`}><span style={{ transform: `scaleX(${result.burnout.score / 100})` }} /></div><div className="checkin-scale"><span>Less reported exhaustion</span><span>More reported exhaustion</span></div></div><details className="checkin-score-details"><summary>See how each answer contributes</summary><div className="checkin-item-scores">{result.burnout.items.map(item => <div key={item.id}><span>{item.label}</span><div className="checkin-item-bar"><span style={{ transform: `scaleX(${item.points / 100})` }} /></div><strong>{item.points}<small> / 100</small></strong></div>)}</div><div className="panel-footnote"><Info size={14} />The energy-outside-work question is reverse-scored.</div></details></section>
        <section className="panel checkin-factor-panel"><div className="panel-heading"><div><h2>Your other wellbeing indicators</h2><p>These are your own ratings and reported hours.</p></div></div><dl className="checkin-factor-results">{result.factors.map(factor => <div key={factor.id}><dt>{factor.label}<small>{factor.description}</small></dt><dd>{factor.value === null ? <span className="checkin-unanswered">Not provided</span> : <>{factor.value}<small>{factor.unit}</small></>}</dd></div>)}</dl></section></div>
      <section className="explore-invitation"><div><h2>What could a different balance look like?</h2><p>Explore the targets you would choose for sleep, workload, and support.</p></div><Link className="button primary" to="/individual/explore">Explore changes<ArrowRight size={16} /></Link></section>
      <section className="checkin-next-steps"><h2>Ideas for your next step</h2><p>Choose one that feels useful. These prompts are based on your answers.</p><ol>{result.suggestions.map(suggestion => <li key={suggestion.title}><h3>{suggestion.title}</h3><p>{suggestion.text}</p></li>)}</ol></section>
      <div className="checkin-reset"><span>Your summary stays in this workspace until you refresh, switch experience, or start over.</span><button className="text-button" onClick={clear}><RotateCcw size={15} />Start a new check-in</button></div>
    </div>}
    <details className="panel provenance checkin-method"><summary>How this self-assessment works</summary><div><p>{schema.method}</p><p>The additional questions are standalone self-ratings, not part of the CBI score. No turnover prediction is inferred from these answers.</p>{result && <p>{result.suggestion_method}</p>}<p>{schema.attribution}</p><ul className="checkin-sources">{schema.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></div></details>
    <p className="checkin-attribution">CBI work-related scale: <a href={schema.sources[1].url} target="_blank" rel="noreferrer">Borritz et al. (2006), NFA</a>. If work-related distress is persistent or affecting daily life, consider speaking with a qualified health professional.</p>
  </div>;
}
