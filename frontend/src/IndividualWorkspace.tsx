import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router';
import { ArrowDownToLine, ArrowLeft, ArrowLeftRight, ArrowRight, Leaf, RotateCcw, ShieldCheck } from 'lucide-react';
import { IndividualProvider, useIndividual } from './IndividualContext';
import { SelfAssessment } from './SelfAssessment';
import { Brand, ErrorBox, Loading } from './ui';
import { api, saveText } from './api';
import type { CheckInFactor } from './types';

interface Scenario { comparisons: (CheckInFactor & { current: number | null; planned: number | null; delta: number | null })[]; suggestions: { title: string; text: string }[]; method: string }
function Layout() {
  const { data } = useIndividual(); const location = useLocation();
  return <div className="individual-app"><header className="individual-header"><Brand /><div><span>Your wellbeing</span><Link className="button secondary" to="/"><ArrowLeftRight size={15} />Switch experience</Link></div></header><div className="individual-navigation"><nav aria-label="Individual navigation"><NavLink end to="/individual">Your check-in</NavLink>{data.result ? <><NavLink to="/individual/results">Your summary</NavLink><NavLink to="/individual/explore">Explore changes</NavLink></> : <><span> Your summary</span><span>Explore changes</span></>}</nav><span><ShieldCheck size={14} />Answers not saved</span></div><main id="main" className="individual-main"><div className="individual-heading"><div className="individual-heading-icon"><Leaf size={22} strokeWidth={1.5} /></div><h1>{location.pathname.endsWith('explore') ? 'Make room for a different balance.' : location.pathname.endsWith('results') ? 'A clearer picture of where you are.' : 'How are you feeling at work?'}</h1><p>{location.pathname.endsWith('explore') ? 'A space to consider changes, one practical target at a time.' : location.pathname.endsWith('results') ? 'Your experience matters. Use this as a starting point for reflection.' : 'Pause for a moment. Check in with your energy, rest, and support.'}</p></div><Outlet /></main><footer className="individual-footer"><span>Workwell. A little perspective for your working life.</span><span><ShieldCheck size={14} />A personal reflection, not a diagnosis.</span></footer></div>;
}
function ResultOnly({ children }: { children: ReactNode }) { const { data } = useIndividual(); return data.result ? children : <Navigate to="/individual" replace />; }

function Explorer() {
  const { data, setData } = useIndividual();
  const result = data.result!;
  const current = Object.fromEntries(result.factors.map(f => [f.id, f.value]));
  const original = Object.fromEntries(result.factors.map(f => [f.id, f.value === null ? '' : String(f.value)]));
  const [values, setValues] = useState<Record<string, string>>(data.scenario || original);
  const [response, setResponse] = useState<Scenario | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [retry, setRetry] = useState(0);
  const planned = Object.fromEntries(result.factors.map(f => [f.id, values[f.id] === '' || values[f.id] === undefined ? null : Number(values[f.id])]));
  const body = JSON.stringify({ current, scenario: planned });
  const invalid = result.factors.some(f => { const value = planned[f.id]; return value !== null && (!Number.isFinite(value) || value < f.min || value > f.max); });
  useEffect(() => {
    if (invalid) { setResponse(null); setError('Use ratings from 0 to 10, sleep from 0 to 24 hours, and working time from 0 to 168 hours.'); setBusy(false); return; }
    const controller = new AbortController(); setError(''); setBusy(true); setResponse(null);
    const timer = window.setTimeout(() => {
      api<Scenario>('/self-assessment/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal }).then(setResponse).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [body, invalid, retry]);
  function update(id: string, value: string) { const next = { ...values, [id]: value }; setValues(next); setData({ ...data, scenario: next }); }
  function reset() { setValues(original); setData({ ...data, scenario: null }); }
  function download() { if (!response) return; saveText(['My Workwell what-if exploration', '', `Current measured CBI score: ${result.burnout.score}/100 (unchanged)`, '', ...response.comparisons.map(f => `${f.label}: current ${f.current ?? 'Not provided'}, target ${f.planned ?? 'Not provided'} ${f.unit}${f.delta === null ? '' : `; difference ${f.delta > 0 ? '+' : ''}${f.delta}`}`), '', ...response.suggestions.map(s => `${s.title}\n${s.text}`), '', response.method].join('\n'), 'workwell-what-if.txt', 'text/plain;charset=utf-8'); }
  return <><Link className="text-button back-link" to="/individual/results"><ArrowLeft size={15} />Back to my summary</Link><div className="scenario-notice"><Leaf size={24} /><div><strong>Your measured score stays the same.</strong><p>Your current CBI score is <b className="baseline-score">{result.burnout.score.toFixed(1)} / 100</b>. These targets explore what you would like to change; they do not predict future burnout.</p></div></div><div className="scenario-grid"><section className="panel scenario-controls"><div className="panel-heading"><div><h2>Choose your targets.</h2><p>Start with your current answers, or leave a target blank.</p></div><button className="icon-button" title="Reset scenario" aria-label="Reset scenario" onClick={reset}><RotateCcw size={16} /></button></div><div className="scenario-fields">{result.factors.map(f => <div className="field" key={f.id}><label htmlFor={`scenario-${f.id}`}>{f.label}</label>{f.kind === 'rating' ? <select id={`scenario-${f.id}`} value={values[f.id] || ''} onChange={e => update(f.id, e.target.value)}><option value="">Not provided</option>{Array.from({ length: 11 }, (_, i) => <option value={i} key={i}>{i}{i === 0 ? `: ${f.low_label}` : i === 10 ? `: ${f.high_label}` : ''}</option>)}</select> : <div className="checkin-number"><input id={`scenario-${f.id}`} type="number" step="any" min={f.min} max={f.max} value={values[f.id] || ''} onChange={e => update(f.id, e.target.value)} /><span>{f.unit}</span></div>}<small>{f.kind === 'rating' ? `0 = ${f.low_label}. 10 = ${f.high_label}.` : `Current: ${current[f.id] === null ? 'Not provided' : `${current[f.id]} ${f.unit}`}`}</small></div>)}</div></section>
    <div className="scenario-comparison">{error ? <ErrorBox message={error} retry={() => setRetry(n => n + 1)} /> : busy || !response ? <Loading label="Comparing your selected targets" /> : <><section className="panel"><div className="panel-heading"><div><h2>A different balance, on your terms.</h2><p>Differences between your entries, not predicted outcomes</p></div></div><div className="table-scroll"><table><thead><tr><th>Indicator</th><th>Current</th><th>Target</th><th>Change</th></tr></thead><tbody>{response.comparisons.map(f => <tr key={f.id}><td>{f.label}<small className="table-unit">{f.unit}</small></td><td>{f.current ?? 'Not provided'}</td><td>{f.planned ?? 'Not provided'}</td><td>{f.delta === null ? 'Not available' : `${f.delta > 0 ? '+' : ''}${f.delta}`}</td></tr>)}</tbody></table></div><div className="scenario-download"><button className="text-button" onClick={download}><ArrowDownToLine size={15} />Download scenario</button></div></section><section className="scenario-prompts"><h2>Make the change practical.</h2>{response.suggestions.map(s => <div key={s.title}><h3>{s.title}</h3><p>{s.text}</p></div>)}</section><p className="scenario-method">{response.method}</p></>}</div></div></>;
}
export default function IndividualWorkspace() {
  return <IndividualProvider><Routes><Route element={<Layout />}><Route index element={<SelfAssessment key="checkin" />} /><Route path="results" element={<ResultOnly><SelfAssessment key="results" /></ResultOnly>} /><Route path="explore" element={<ResultOnly><Explorer /></ResultOnly>} /><Route path="*" element={<Navigate to="/individual" replace />} /></Route></Routes></IndividualProvider>;
}
