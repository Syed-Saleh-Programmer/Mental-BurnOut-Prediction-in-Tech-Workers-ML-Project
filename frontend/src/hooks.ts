import { useEffect, useState } from 'react';
import { api, ApiError } from './api';

export function useRemote<T>(path: string | null, refresh = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  useEffect(() => {
    if (!path) { setLoading(false); setData(null); return; }
    const controller = new AbortController();
    setLoading(true); setError(null); setData(null);
    api<T>(path, { signal: controller.signal }).then(setData).catch(e => { if (!controller.signal.aborted) setError(e); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, refresh]);
  return { data, error, loading };
}
