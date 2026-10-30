import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, ChevronLeft, FileSpreadsheet, Info, RotateCcw, Upload, WandSparkles } from 'lucide-react';
import { api, backendUrl, formatNumber, percent, saveText } from './api';
import type { Field, PredictionResult, RecordInput, Schema } from './types';
import { ErrorBox } from './ui';

export function Assessment({ schema, selectedId }: { schema: Schema; selectedId?: number }) {
  const [values, setValues] = useState<RecordInput>({ ...schema.defaults });
  const [activeGroup, setActiveGroup] = useState(0);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [profileSource, setProfileSource] = useState('Example profile using dataset medians and most frequent categories');
  const groups = [...new Set(schema.fields.map(f => f.group))];
  const resultRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const requestVersion = useRef(0);
  useEffect(() => {
    if (selectedId === undefined) return;
    const controller = new AbortController();
    setLoadingRecord(true); setError(''); setResult(null);
    api<RecordInput>(`/records/${selectedId}`, { signal: controller.signal }).then(data => {
      setValues(data); setProfileSource(`Source dataset profile #${selectedId}`);
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoadingRecord(false); });
    return () => controller.abort();
  }, [selectedId]);
  const update = (name: string, value: string | number) => {
    requestVersion.current += 1;
    setValues(current => ({ ...current, [name]: value })); setResult(null); setError('');
    setProfileSource('Custom scenario based on the supplied model inputs');
  };
  const reset = () => { requestVersion.current += 1; setValues({ ...schema.defaults }); setResult(null); setError(''); setProfileSource('Example profile using dataset medians and most frequent categories'); };
  const loadExample = async () => {
    setLoadingRecord(true); setError(''); setResult(null);
    try { const data = await api<RecordInput>('/records/1'); requestVersion.current += 1; setValues(data); setProfileSource('Source dataset profile #1'); }
    catch (e) { setError((e as Error).message); } finally { setLoadingRecord(false); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setResult(null);
    const version = requestVersion.current;
    try {
      const response = await api<PredictionResult>('/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [values] }) });
      if (version === requestVersion.current) { setResult(response); setTimeout(() => resultRef.current?.focus(), 0); }
    } catch (e) { if (version === requestVersion.current) setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const prediction = result?.predictions[0];
  return <>
    <div className="assessment-layout">
      <section className="panel assessment-form-panel"><div className="panel-heading"><div><h2>Build a profile</h2><p>{profileSource}</p></div><button className="icon-button" title="Reset to example defaults" aria-label="Reset to example defaults" onClick={reset} disabled={busy || loadingRecord}><RotateCcw size={17} /></button></div>
        <div className="form-tools"><button className="text-button" onClick={loadExample} disabled={busy || loadingRecord}><WandSparkles size={15} />{loadingRecord ? 'Loading profile…' : 'Load dataset example'}</button><span>{schema.fields.length} inputs across {groups.length} sections</span></div>
        <div className="form-steps" role="tablist" aria-label="Profile sections">{groups.map((g, i) => <button key={g} type="button" id={`section-tab-${i}`} role="tab" aria-selected={i === activeGroup} aria-controls={`section-${i}`} tabIndex={i === activeGroup ? 0 : -1} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = (i + (e.key === 'ArrowRight' ? 1 : groups.length - 1)) % groups.length; setActiveGroup(next); document.getElementById(`section-tab-${next}`)?.focus(); } }} className={i === activeGroup ? 'active' : ''} onClick={() => setActiveGroup(i)}><span>{i + 1}</span>{g}</button>)}</div>
        <form ref={formRef} onSubmit={submit} onInvalidCapture={e => {
          const name = (e.target as HTMLInputElement).name;
          const field = schema.fields.find(f => f.name === name);
          if (field) { const group = groups.indexOf(field.group); setActiveGroup(group); setTimeout(() => (e.target as HTMLInputElement).focus(), 0); }
        }}>
          {groups.map((group, index) => <div key={group} id={`section-${index}`} role="tabpanel" aria-labelledby={`section-tab-${index}`} hidden={activeGroup !== index} className="form-section"><h3>{group}</h3><div className="fields-grid">{schema.fields.filter(f => f.group === group).map(field => <ProfileField key={field.name} field={field} value={values[field.name]} disabled={busy || loadingRecord} onChange={value => update(field.name, value)} />)}</div></div>)}
          <div className="form-bottom"><span>Section {activeGroup + 1} of {groups.length}</span><div className="button-row">{activeGroup > 0 && <button type="button" className="button secondary" onClick={() => setActiveGroup(g => g - 1)}><ChevronLeft size={15} />Back</button>}{activeGroup < groups.length - 1 && <button type="button" className="button secondary" onClick={() => setActiveGroup(g => g + 1)}>Next section <ArrowRight size={15} /></button>}<button type="submit" className="button primary" disabled={busy || loadingRecord} aria-busy={busy}>{busy ? 'Running model…' : 'Run prediction'}<ArrowRight size={16} /></button></div></div>
        </form>
        {error && <div className="form-error"><ErrorBox message={error} /></div>}
      </section>
      <aside className={`panel prediction-panel ${prediction ? 'has-result' : ''}`} ref={resultRef} tabIndex={-1} aria-label="Prediction result" aria-live="polite">
        <div className="panel-heading"><h2>Your model output</h2><span className="subtle-tag">Live inference</span></div>
        {prediction ? <div className="prediction-result"><div className={`result-label ${prediction.prediction ? 'leave' : 'stay'}`}><Check size={15} />{prediction.label}</div><div className="probability"><strong>{percent(prediction.probability)}</strong><span>Estimated probability of<br />job-change intention</span></div><div className="probability-scale"><span style={{ transform: `scaleX(${prediction.probability})` }} /><i style={{ left: `${prediction.threshold * 100}%` }} title={`Decision threshold ${percent(prediction.threshold)}`} /></div><div className="scale-labels"><span>0%</span><span>100%</span></div><dl className="result-details"><div><dt>Decision threshold</dt><dd>{percent(prediction.threshold, 2)}</dd></div><div><dt>Reference ID</dt><dd>#{prediction.employee_id}</dd></div><div><dt>Model</dt><dd>HistGradientBoosting</dd></div><div><dt>Calibration</dt><dd>Isotonic</dd></div></dl><p className="result-explainer">The saved model classifies a profile as “intention to leave” when its probability meets the original, F1-tuned threshold. A probability below 50% can still meet this threshold.</p>{prediction.warnings.map(w => <p className="input-warning" key={w}>{w}</p>)}<button className="button secondary full-width" onClick={() => saveText(JSON.stringify({ ...result, inputs: values }, null, 2), `workwell-assessment-${prediction.employee_id}.json`, 'application/json')}><ArrowDownToLine size={16} />Download assessment</button></div> : <div className="result-empty"><HeartLine /><h3>A little context goes a long way.</h3><p>Review the example inputs, explore a scenario, then run the model to see its calibrated estimate.</p><div className="result-process"><span><Check size={14} />Original preprocessing</span><span><Check size={14} />Calibrated probability</span><span><Check size={14} />Saved decision threshold</span></div></div>}
        <div className="result-note"><Info size={15} /><p>This is an estimate of stated job-change intention, not a diagnosis or a prediction of actual departure. Use with human review.</p></div>
      </aside>
    </div>
    <div className="data-note"><Info size={16} /><p>Values are prefilled, not inferred about a real person. The model requires every source field, including wellbeing categories. Scores and categories are separate inputs because that is how the original pipeline was trained.</p></div>
  </>;
}
function ProfileField({ field, value, disabled, onChange }: { field: Field; value: string | number; disabled: boolean; onChange: (v: string | number) => void }) {
  const binary = field.kind === 'integer' && field.min === 0 && field.max === 1;
  return <div className="field"><label htmlFor={`input-${field.name}`}>{field.label}</label>{field.kind === 'category' ? <select id={`input-${field.name}`} name={field.name} value={value} required disabled={disabled} onChange={e => onChange(e.target.value)}>{field.options?.map(o => <option key={o}>{o}</option>)}</select> : binary ? <select id={`input-${field.name}`} name={field.name} value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))}><option value="0">No</option><option value="1">Yes</option></select> : <><input id={`input-${field.name}`} name={field.name} type="number" required value={value} min={field.min} max={field.max} step={field.step} disabled={disabled} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} /><small>Dataset range: {formatNumber(field.min!)} to {formatNumber(field.max!)}</small></>}</div>;
}
function HeartLine() { return <svg width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden="true"><path d="M6 28h11l6-14 8 27 6-15h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

export function Batch() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [dragging, setDragging] = useState(false);
  const selectFile = (selected?: File) => { setResult(null); setError(''); setPage(1); if (!selected) { setFile(null); return; } if (!selected.name.toLowerCase().endsWith('.csv')) { setFile(null); setError('Choose a CSV file. Download the template to see the expected columns.'); return; } if (selected.size > 10 * 1024 * 1024) { setFile(null); setError('The CSV file must be 10 MB or smaller.'); return; } setFile(selected); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!file) return;
    setBusy(true); setResult(null); setError('');
    const form = new FormData(); form.append('file', file);
    try { setResult(await api<PredictionResult>('/predict/csv', { method: 'POST', body: form })); setPage(1); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const download = () => {
    if (!result) return;
    const header = 'employee_id,job_change_intention_prediction,probability,threshold';
    const lines = result.predictions.map(p => [p.employee_id, p.prediction, p.probability, p.threshold].join(','));
    saveText([header, ...lines].join('\n'), 'workwell-batch-predictions.csv');
  };
  return <><div className="batch-layout"><section className="panel batch-upload"><div className="panel-heading"><div><h2>Upload profiles</h2><p>Use a UTF-8 CSV with the original dataset columns.</p></div><Upload size={21} /></div><form onSubmit={submit}><label className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) selectFile(e.dataTransfer.files[0]); }}><FileSpreadsheet size={36} strokeWidth={1.3} /><strong>{file ? file.name : 'Choose a CSV or drop it here'}</strong><span>{file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'Up to 5,000 profiles and 10 MB per file'}</span><input type="file" accept=".csv,text/csv" aria-label="Choose prediction CSV" disabled={busy} onChange={e => selectFile(e.target.files?.[0])} /></label><div className="upload-actions"><a href={backendUrl("/api/template.csv")}  className="text-button"><ArrowDownToLine size={15} />Download CSV template</a><button className="button primary" type="submit" disabled={!file || busy} aria-busy={busy}>{busy ? 'Processing profiles…' : 'Generate predictions'}<ArrowRight size={16} /></button></div></form>{error && <ErrorBox message={error} />}</section><aside className="batch-guide"><h2>A good file starts here.</h2><ol><li><strong>Start with the template</strong><p>It includes all required fields and an example profile.</p></li><li><strong>Add your profiles</strong><p>Use the source categories and numeric ranges. Keep the header names unchanged.</p></li><li><strong>Run and export</strong><p>Get a probability and a threshold-based classification for each row.</p></li></ol><div className="data-note"><Info size={16} /><p>Uploaded profiles are processed in memory. This application does not save them.</p></div></aside></div>
    {result && <section className="panel batch-results" aria-live="polite"><div className="panel-heading"><div><h2>Batch results</h2><p>{formatNumber(result.count)} profiles processed with the original saved model</p></div><button className="button secondary" onClick={download}><ArrowDownToLine size={16} />Download results</button></div><div className="batch-summary"><div><span>Intention to leave</span><strong>{formatNumber(result.predictions.filter(p => p.prediction === 1).length)}</strong></div><div><span>Intention to stay</span><strong>{formatNumber(result.predictions.filter(p => p.prediction === 0).length)}</strong></div><div><span>Decision threshold</span><strong>{percent(result.threshold, 2)}</strong></div></div><div className="table-scroll"><table><thead><tr><th>Reference ID</th><th>Model classification</th><th>Job-change probability</th><th>Decision threshold</th></tr></thead><tbody>{result.predictions.slice((page - 1) * 10, page * 10).map((p, i) => <tr key={`${p.employee_id}-${i}`}><td>#{p.employee_id}</td><td><span className={`badge ${p.prediction ? 'badge-high' : 'badge-low'}`}>{p.label}</span></td><td>{percent(p.probability, 2)}</td><td>{percent(p.threshold, 2)}</td></tr>)}</tbody></table></div><div className="pagination"><span>Page {page} of {Math.ceil(result.count / 10)}</span><div className="button-row"><button className="button secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><button className="button secondary" disabled={page * 10 >= result.count} onClick={() => setPage(p => p + 1)}>Next</button></div></div></section>}
  </>;
}
