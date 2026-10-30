import { ArrowRight, Info } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber, percent } from './api';
import type { Overview } from './types';

const shades = ['var(--chart-low)', 'var(--chart-moderate)', 'var(--chart-high)', 'var(--chart-severe)'];
export function Dashboard({ data, onAssess }: { data: Overview; onAssess: () => void }) {
  if (!data.count) return <div className="empty-state"><h2>No profiles in this cohort</h2><p>Choose a different combination of filters to explore the dataset.</p></div>;
  return <div className="dashboard">
    <div className="stats-row" aria-label="Cohort summary">
      <div className="stat"><span>Profiles in this cohort</span><strong>{formatNumber(data.count)}</strong><small>of {formatNumber(data.total_count)} dataset records</small></div>
      <div className="stat"><span>Intention to change jobs</span><strong>{percent(data.turnover_rate)}</strong><small>{formatNumber(data.leave_count)} self-reported responses</small></div>
      <div className="stat"><span>High or severe burnout</span><strong>{percent(data.high_burnout_rate)}</strong><small>Based on recorded burnout categories</small></div>
      <div className="stat"><span>Average stress score</span><strong>{data.average_stress.toFixed(1)}<em> / 10</em></strong><small>Across the selected cohort</small></div>
    </div>
    <div className="dashboard-top">
      <section className="panel burnout-panel"><div className="panel-heading"><div><h2>Wellbeing at a glance</h2><p>Burnout levels across the selected cohort</p></div><span className="subtle-tag">Observed data</span></div>
        <div className="burnout-content"><div className="donut-wrap" role="img" aria-label={`Burnout distribution: ${data.burnout_distribution.map(r => `${r.name}: ${formatNumber(r.count)}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height={230}><PieChart><Pie data={data.burnout_distribution} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={75} outerRadius={102} paddingAngle={3} cornerRadius={3} stroke="none" isAnimationActive={false}>{data.burnout_distribution.map((r, i) => <Cell key={r.name} fill={shades[i]} />)}</Pie><Tooltip formatter={value => formatNumber(Number(value))} /></PieChart></ResponsiveContainer>
          <div className="donut-center"><strong>{data.average_burnout.toFixed(1)}</strong><span>Avg. burnout / 10</span></div>
        </div><div className="burnout-legend">{data.burnout_distribution.map((r, i) => <div className={`legend-item shade-${i}`} key={r.name}><span className="legend-swatch" /><span>{r.name}</span><strong>{percent(r.count / data.count)}</strong><small>{formatNumber(r.count)}</small></div>)}</div></div>
        <div className="panel-footnote"><Info size={14} /><span>Categories are preserved from the source dataset.</span></div>
      </section>
      <section className="assessment-prompt"><div className="prompt-symbol"><ActivityMark /></div><h2>Make space for<br />a closer look.</h2><p>Explore how a profile’s work and wellbeing indicators relate to predicted job-change intention.</p><button className="button light" onClick={onAssess}>Run an assessment <ArrowRight size={16} /></button><div className="prompt-bottom"><span>Calibrated HistGradientBoosting</span><span>Original saved model</span></div></section>
    </div>
    <div className="chart-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Job-change intention by role</h2><p>Share of respondents reporting an intention to leave</p></div></div>
        <div className="role-chart" role="img" aria-label="Job-change intention rate by role. Values are also available in the dataset explorer."><ResponsiveContainer width="100%" height={300}><BarChart data={data.by_role.slice(0, 7)} layout="vertical" margin={{ left: 5, right: 32, top: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 4" horizontal={false} stroke="var(--color-rule)" /><XAxis type="number" tickFormatter={v => `${Math.round(v * 100)}%`} domain={[0, 0.5]} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} /><YAxis dataKey="name" type="category" width={144} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-ink-2)', fontSize: 12 }} /><Tooltip formatter={v => percent(Number(v))} cursor={{ fill: 'var(--color-paper-2)' }} /><Bar dataKey="turnover_rate" name="Intention to leave" fill="var(--color-accent)" radius={[0, 4, 4, 0]} barSize={15} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
        <div className="panel-footnote">Seven largest role groups by record count. Observed responses, not predictions.</div>
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>Stress and intention to leave</h2><p>Observed job-change intention by stress score band</p></div></div>
        <div className="stress-chart" role="img" aria-label={`Stress bands: ${data.stress_relationship.map(r => `${r.name}: ${percent(r.turnover_rate)}`).join(', ')}`}><ResponsiveContainer width="100%" height={256}><AreaChart data={data.stress_relationship} margin={{ left: -20, right: 15, top: 20, bottom: 0 }}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--color-rule)" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} /><YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} /><Tooltip formatter={v => percent(Number(v))} /><Area dataKey="turnover_rate" name="Intention to leave" type="monotone" stroke="var(--color-accent)" fill="var(--color-accent-soft)" strokeWidth={2.5} isAnimationActive={false} dot={{ r: 4, strokeWidth: 2, fill: 'var(--color-cotton)' }} /></AreaChart></ResponsiveContainer></div>
        <div className="mini-stats"><div><span>Average sleep</span><strong>{data.average_sleep.toFixed(1)} <small>hrs / night</small></strong></div><div><span>Average workweek</span><strong>{data.average_hours.toFixed(1)} <small>hrs / week</small></strong></div></div>
      </section>
    </div>
    <section className="panel workmode-panel"><div className="panel-heading"><div><h2>Different ways of working</h2><p>Compare observed wellbeing across work modes</p></div></div><div className="table-scroll"><table><thead><tr><th>Work mode</th><th>Profiles</th><th>Avg. stress / 10</th><th>Avg. burnout / 10</th><th>Intention to leave</th></tr></thead><tbody>{data.by_work_mode.map(r => <tr key={r.name}><td className="strong-cell">{r.name}</td><td>{formatNumber(r.count)}</td><td>{r.stress.toFixed(1)}</td><td>{r.burnout.toFixed(1)}</td><td><div className="rate-cell"><span className="rate-track"><span style={{ transform: `scaleX(${r.turnover_rate})` }} /></span>{percent(r.turnover_rate)}</div></td></tr>)}</tbody></table></div></section>
    <div className="data-note"><Info size={16} /><p>These are patterns in the supplied 2026 research dataset. They describe the selected cohort and do not establish cause and effect or diagnose a health condition.</p></div>
  </div>;
}
function ActivityMark() { return <svg width="46" height="46" viewBox="0 0 46 46" fill="none" aria-hidden="true"><path d="M4 24h10l6-14 7 27 6-16h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
