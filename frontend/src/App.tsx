import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { ArrowRight, ArrowUpRight, ChartNoAxesCombined, Leaf, ShieldCheck } from 'lucide-react';
import { Brand, Loading } from './ui';
import './workspace.css';

const HrWorkspace = lazy(() => import('./HrWorkspace'));
const IndividualWorkspace = lazy(() => import('./IndividualWorkspace'));
// Pages cannot rewrite deep SPA routes. Local/FastAPI serving keeps clean URLs.
const Router = import.meta.env.VITE_PAGES === 'true' ? HashRouter : BrowserRouter;

function Landing() {
  const location = useLocation();
  const old = new URLSearchParams(location.search);
  const view = old.get('view');
  const routes: Record<string, string> = { overview: '/hr', assessment: '/hr/model-assessment', batch: '/hr/import', dataset: '/hr/employees', research: '/hr/research', 'self-assessment': '/individual' };
  if (view && routes[view]) { old.delete('view'); return <Navigate to={`${routes[view]}${old.size ? `?${old}` : ''}`} replace />; }
  return <div className="landing"><header className="landing-header"><Brand /><span>Workplace wellbeing, with perspective.</span></header>
    <main id="main" className="landing-main"><div className="landing-heading"><h1>Better work starts<br />with understanding.</h1><p>A clearer view of your people. A little space for yourself.<br className="desktop-break" /> Choose where you’d like to begin.</p></div>
      <div className="role-choices"><Link className="role-card role-individual" to="/individual"><div className="role-card-top"><span className="role-icon"><Leaf size={27} strokeWidth={1.5} /></span><ArrowUpRight size={24} /></div><div><h2>For you.</h2><p>Pause, check in, and understand how work is affecting your wellbeing.</p></div><ul><li>A guided burnout check-in</li><li>Your stress, energy, and recovery</li><li>Space to explore a different balance</li></ul><span className="role-cta">Individual <ArrowRight size={17} /></span></Link>
      <Link className="role-card role-hr" to="/hr"><div className="role-card-top"><span className="role-icon"><ChartNoAxesCombined size={27} strokeWidth={1.5} /></span><ArrowUpRight size={24} /></div><div><h2>For your people.</h2><p>Turn your employee data into a focused view of workforce wellbeing.</p></div><ul><li>CSV and Excel uploads</li><li>Workforce insights and clear comparisons</li><li>Employee profiles, when you need detail</li></ul><span className="role-cta">HR Dashboard <ArrowRight size={17} /></span></Link></div>
      <div className="landing-note"><ShieldCheck size={16} /><span>No account needed. Temporary workspaces. Your choice of perspective.</span></div>
    </main><footer className="landing-footer"><span>Thoughtful data. Human decisions.</span><span>Workwell</span></footer></div>;
}
function PageNotFound() { return <main id="main" className="not-found"><Brand /><h1>That page isn’t here.</h1><p>Choose a workspace to find your way back.</p><Link className="button primary" to="/">Choose a workspace<ArrowRight size={16} /></Link></main>; }
function ScrollAndTitle() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.title = pathname.startsWith('/hr') ? 'Workwell | HR workspace' : pathname.startsWith('/individual') ? 'Workwell | Your wellbeing' : 'Workwell | Choose your perspective'; }, [pathname]); return null; }
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="not-found"><h1>This view could not be displayed.</h1><p>Reload the app to start a fresh workspace.</p><a className="button primary" href={import.meta.env.BASE_URL}>Return to Workwell</a></main> : this.props.children; }
}
export default function App() {
  return <ErrorBoundary><Router><ScrollAndTitle /><a href="#main" className="skip-link" onClick={event => { event.preventDefault(); const main = document.getElementById('main'); if (main) { main.tabIndex = -1; main.focus(); main.scrollIntoView(); } }}>Skip to content</a><Suspense fallback={<main id="main" className="shell"><Loading /></main>}><Routes><Route path="/" element={<Landing />} /><Route path="/hr/*" element={<HrWorkspace />} /><Route path="/individual/*" element={<IndividualWorkspace />} /><Route path="*" element={<PageNotFound />} /></Routes></Suspense></Router></ErrorBoundary>;
}
