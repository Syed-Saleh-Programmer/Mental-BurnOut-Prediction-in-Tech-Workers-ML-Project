import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Analysis } from './hr-types';

const KEY = 'workwell-active-analysis';
interface HrState { analysis: Analysis | null; restoring: boolean; notice: string; adopt: (analysis: Analysis) => void; clear: () => Promise<void>; expire: () => void }
const Context = createContext<HrState | null>(null);
export function HrProvider({ children }: { children: ReactNode }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [restoring, setRestoring] = useState(() => Boolean(sessionStorage.getItem(KEY)));
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const id = sessionStorage.getItem(KEY);
    if (!id) { setRestoring(false); return; }
    const controller = new AbortController();
    api<Analysis>(`/hr/analyses/${id}`, { signal: controller.signal }).then(setAnalysis).catch(e => {
      if (!controller.signal.aborted) { sessionStorage.removeItem(KEY); setNotice(e.message); }
    }).finally(() => { if (!controller.signal.aborted) setRestoring(false); });
    return () => controller.abort();
  }, []);
  function adopt(next: Analysis) {
    const previous = sessionStorage.getItem(KEY);
    sessionStorage.setItem(KEY, next.analysis_id); setAnalysis(next); setNotice('');
    if (previous && previous !== next.analysis_id) void api(`/hr/analyses/${previous}`, { method: 'DELETE' }).catch(() => {});
  }
  async function clear() {
    const id = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY); setAnalysis(null); setNotice('');
    if (id) await api(`/hr/analyses/${id}`, { method: 'DELETE' }).catch(() => setNotice('The local reference was cleared. Server-side session data will expire automatically.'));
  }
  function expire() { sessionStorage.removeItem(KEY); setAnalysis(null); setNotice('Your temporary analysis expired. Upload your file again to continue.'); }
  return <Context.Provider value={{ analysis, restoring, notice, adopt, clear, expire }}>{children}</Context.Provider>;
}
export function useHr() { const value = useContext(Context); if (!value) throw new Error('Missing HR context'); return value; }
