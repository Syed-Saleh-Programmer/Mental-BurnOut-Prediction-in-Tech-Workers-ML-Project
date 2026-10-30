import { Activity, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';

export function Brand() { return <Link className="brand" to="/" aria-label="Workwell home"><span className="brand-mark"><Activity size={24} strokeWidth={2} /></span>workwell</Link>; }

export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-box" role="alert"><Activity size={19} /><div><strong>Something needs attention</strong><p>{message}</p>{retry && <button className="text-button" onClick={retry}>Try again <RefreshCw size={14} /></button>}</div></div>;
}
export function Loading({ label = 'Loading your workspace' }: { label?: string }) {
  return <div className="loading-state" role="status" aria-live="polite"><span className="loading-line" /><span className="loading-line short" /><span className="loading-block" /><p>{label}…</p></div>;
}
