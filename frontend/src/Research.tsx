import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpDown, BookOpen, ChevronLeft, ChevronRight, ExternalLink, FileText, Info, Play, Search } from 'lucide-react';
import { api, backendUrl, formatNumber, percent } from './api';
import type { RecordsResponse, Research } from './types';
import { ErrorBox, Loading } from './ui';

export function Dataset({ filterQuery, params, update, inspect }: { filterQuery: string; params: URLSearchParams; update: (v: Record<string, string>) => void; inspect: (id: number) => void }) {
  const [data, setData] = useState<RecordsResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const search = params.get('search') || '';
  const [draftSearch, setDraftSearch] = useState(search);
  const pageValue = Number(params.get('page'));
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const sort = params.get('sort_by') || 'employee_id';
  const direction = params.get('direction') || 'asc';
  useEffect(() => setDraftSearch(search), [search]);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError('');
    const query = new URLSearchParams(filterQuery); query.set('search', search); query.set('page', String(page)); query.set('sort_by', sort); query.set('direction', direction);
    api<RecordsResponse>(`/records?${query}`, { signal: controller.signal }).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [filterQuery, search, page, sort, direction, retry]);
  const toggleSort = (name: string) => update({ sort_by: name, direction: sort === name && direction === 'asc' ? 'desc' : 'asc', page: '1' });
  return <section className="panel dataset-panel"><div className="panel-heading"><div><h2>The research dataset</h2><p>Original observations from mental_health_burnout_tech_2026.csv</p></div><span className="subtle-tag">Observed responses</span></div><div className="dataset-toolbar"><form className="search-box" onSubmit={e => { e.preventDefault(); update({ search: draftSearch, page: '1' }); }}><Search size={16} /><label className="sr-only" htmlFor="record-search">Search profiles</label><input id="record-search" value={draftSearch} onChange={e => setDraftSearch(e.target.value)} placeholder="Search by ID, role, country, or burnout level" /><button className="text-button" type="submit">Search</button></form><span>{busy ? 'Loading…' : data ? `${formatNumber(data.count)} matching profiles` : 'Unavailable'}</span></div>
      {error ? <ErrorBox message={error} retry={() => setRetry(x => x + 1)} /> : busy ? <Loading label="Loading dataset records" /> : !data?.records.length ? <div className="empty-state"><Search size={28} /><h3>No matching profiles</h3><p>Try a broader search or change the cohort filters.</p><button className="button secondary" onClick={() => update({ search: '', page: '1' })}>Clear search</button></div> : <><div className="table-scroll"><table className="records-table"><thead><tr>{[['employee_id', 'Reference ID'], ['job_role', 'Job role'], ['country', 'Country'], ['work_mode', 'Work mode'], ['stress_score', 'Stress / 10'], ['burnout_level', 'Burnout'], ['job_change_intention', 'Job-change intention']].map(([name, title]) => <th key={name} aria-sort={sort === name ? direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button className="sort-button" onClick={() => toggleSort(name)}>{title}<ArrowUpDown size={12} /></button></th>)}<th><span className="sr-only">Assess profile</span></th></tr></thead><tbody>{data.records.map(r => <tr key={r.employee_id}><td className="muted">#{r.employee_id}</td><td className="strong-cell">{r.job_role}</td><td>{r.country}</td><td>{r.work_mode}</td><td>{r.stress_score.toFixed(1)}</td><td><span className={`badge badge-${r.burnout_level.toLowerCase()}`}>{r.burnout_level}</span></td><td>{r.job_change_intention ? 'Leave' : 'Stay'}</td><td><button className="icon-button" aria-label={`Assess profile ${r.employee_id}`} title="Assess this profile" onClick={() => inspect(r.employee_id)}><ArrowRight size={16} /></button></td></tr>)}</tbody></table></div><div className="pagination"><span>Showing {formatNumber((page - 1) * 10 + 1)} to {formatNumber(Math.min(page * 10, data.count))} of {formatNumber(data.count)}</span><div className="button-row"><button className="button secondary" disabled={page === 1} onClick={() => update({ page: String(page - 1) })}><ChevronLeft size={15} />Previous</button><button className="button secondary" disabled={page * 10 >= data.count} onClick={() => update({ page: String(page + 1) })}>Next<ChevronRight size={15} /></button></div></div></>}
      <div className="panel-footnote"><Info size={14} />“Leave” and “Stay” are recorded intentions. Open a profile to see the model’s separate prediction.</div>
    </section>;
}

export function ResearchView() {
  const [data, setData] = useState<Research | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setError('');
    api<Research>('/research', { signal: controller.signal }).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [retry]);
  if (error) return <ErrorBox message={error} retry={() => setRetry(x => x + 1)} />;
  if (!data) return <Loading label="Reading the research notebook" />;
  const video = data.files.find(f => f.kind === 'MP4');
  return <div className="research-view"><section className="model-banner"><div><BookOpen size={24} /><h2>HistGradientBoosting</h2><p>The winning model exported by your training notebook, with isotonic calibration.</p></div><dl><div><dt>Decision threshold</dt><dd>{percent(data.threshold, 2)}</dd></div><div><dt>Model features</dt><dd>{data.features}</dd></div><div><dt>Source inputs</dt><dd>{data.raw_features}</dd></div></dl></section>
    <section className="panel"><div className="panel-heading"><div><h2>From baseline to optimized</h2><p>Performance read directly from the notebook’s saved outputs</p></div><span className="subtle-tag">Recorded experiments</span></div><div className="table-scroll"><table className="model-table"><thead><tr><th>Experiment</th><th>Accuracy</th><th>F1 score</th><th>Roc auc</th><th>Test records</th></tr></thead><tbody>{data.models.map(m => <tr key={m.name} className={m.selected ? 'selected-model' : ''}><td className="strong-cell">{m.name}{m.selected && <span className="badge badge-low">Saved model</span>}</td><td>{m.accuracy.toFixed(2)}%</td><td><div className="model-score"><span className="rate-track"><span style={{ transform: `scaleX(${m.f1 / 100})` }} /></span>{m.f1.toFixed(2)}%</div></td><td>{m.auc.toFixed(4)}</td><td>{formatNumber(m.test_size)}</td></tr>)}</tbody></table></div><div className="panel-footnote"><Info size={14} />These are recorded results, not a fresh evaluation. Baseline and optimized experiments use different test splits.</div></section>
    <div className="research-columns"><section className="panel"><div className="panel-heading"><div><h2>Research library</h2><p>Supplied papers, notebook, and video</p></div></div><ul className="resource-list">{data.files.filter(f => f.url && f.kind !== 'MP4').map(f => <li key={f.name}><FileText size={21} /><div><a href={backendUrl(f.url!)} target="_blank" rel="noreferrer">{f.name.replaceAll('_', ' ')}<ExternalLink size={13} /></a><span>{f.kind} / {(f.bytes / 1024).toFixed(0)} KB</span></div></li>)}</ul>{video && <div className="video-resource"><button className="text-button" onClick={() => setShowVideo(v => !v)}><Play size={16} />{showVideo ? 'Close research video' : 'Watch the supplied research explainer'}</button>{showVideo && <video controls preload="metadata" src={backendUrl(video.url!)} aria-label="Supplied research explainer video" />}</div>}</section>
      <section className="research-context"><h2>Read the estimate in context.</h2><p>The model captures patterns in its training data. Its output needs interpretation.</p><ul>{data.limitations.map(text => <li key={text}>{text}</li>)}</ul></section></div>
    <details className="panel provenance"><summary>Artifact provenance and API access</summary><div><p>Model artifact: turnover_pipeline.pkl</p><p>SHA-256: <code>{data.model_sha256}</code></p><p>The backend recreates the two engineered features from the notebook before calling the original calibrated pipeline. It applies the saved decision threshold rather than the estimator’s default classification.</p><a className="text-button" href={backendUrl("/docs")} target="_blank" rel="noreferrer">Explore the FastAPI documentation<ExternalLink size={14} /></a><a className="text-button" href={backendUrl("/api/template.csv")}><ArrowDownToLine size={14} />Download the input template</a></div></details>
  </div>;
}
