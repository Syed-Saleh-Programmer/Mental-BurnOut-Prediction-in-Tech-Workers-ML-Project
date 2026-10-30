import { lazy, Suspense } from 'react';
import { Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router';
import { ArrowLeftRight, BookOpen, CircleHelp, Database, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';
import { HrProvider, useHr } from './HrContext';
import { Brand, Loading } from './ui';
import { HrDashboard, HrEmployees, HrEmployee, HrImport, HrModel } from './HrPages';

const Research = lazy(() => import('./Research').then(m => ({ default: m.ResearchView })));
function Layout() {
  const { analysis, restoring } = useHr();
  const { pathname } = useLocation();
  return <div className="hr-app" data-theme="hr"><div className="hr-frame"><aside className="hr-sidebar"><Brand /><div className="workspace-label">People workspace</div><nav aria-label="HR navigation"><NavLink end to="/hr"><LayoutDashboard size={18} />Overview</NavLink><NavLink to="/hr/employees"><Users size={18} />Employees</NavLink><NavLink to="/hr/import"><Database size={18} />Data & imports</NavLink></nav><div className="sidebar-bottom"><div className="session-note"><ShieldCheck size={18} /><strong>A temporary workspace</strong><p>Data expires after 30 minutes of inactivity. Download what you need.</p></div><NavLink to="/hr/research"><BookOpen size={17} />Model & research</NavLink><Link to="/"><ArrowLeftRight size={17} />Switch experience</Link></div></aside>
    <div className="hr-body"><header className="workspace-top"><div className="workspace-breadcrumb">Workwell <span>/</span> <strong>{pathname.includes('employees') ? 'Employees' : pathname.includes('import') ? 'Data & imports' : pathname.includes('research') || pathname.includes('model-') ? 'Model information' : 'Overview'}</strong></div><div className="workspace-top-end">{analysis && <span className={`source-tag ${analysis.source_kind === 'demo' ? 'demo-tag' : ''}`}>{analysis.source_kind === 'demo' ? 'Demo data' : 'Your upload'}</span>}<span className="workspace-avatar" aria-label="HR workspace"><Users size={17} /></span></div></header><main id="main" className="hr-main">{restoring ? <Loading label="Restoring your temporary workspace" /> : <Suspense fallback={<Loading />}><Outlet /></Suspense>}</main><footer className="workspace-footer"><span>Perspective for better people decisions.</span><Link to="/hr/research"><CircleHelp size={14} />About the analysis</Link></footer></div></div></div>;
}
export default function HrWorkspace() {
  return <HrProvider><Routes><Route element={<Layout />}><Route index element={<HrDashboard />} /><Route path="import" element={<HrImport />} /><Route path="employees" element={<HrEmployees />} /><Route path="employees/:rowId" element={<HrEmployee />} /><Route path="research" element={<><div className="workspace-heading"><div><h1>The evidence behind the estimate.</h1><p>Original research, model provenance, and its practical limits.</p></div><Link to="/hr/model-assessment" className="button secondary">Open model sandbox</Link></div><Research /></>} /><Route path="model-assessment" element={<HrModel />} /><Route path="*" element={<div className="empty-state"><h1>This workspace page isn’t here.</h1><Link to="/hr" className="button primary">Return to overview</Link></div>} /></Route></Routes></HrProvider>;
}
