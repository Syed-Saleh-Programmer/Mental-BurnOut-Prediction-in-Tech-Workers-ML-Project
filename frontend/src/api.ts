const backendBase = (import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/+$/, '');
export const backendConfigured = import.meta.env.VITE_PAGES !== 'true' || Boolean(backendBase);

/** API, downloads, docs, and research resources share the configured backend. */
export function backendUrl(path: string): string | undefined {
  return backendConfigured ? `${backendBase}${path}` : undefined;
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  if (!backendConfigured) {
    throw new ApiError('The analysis service is not connected for this deployment. HR analysis and personal assessment results will be available when the service is connected.', 503);
  }
  const response = await fetch(backendUrl(`/api${path}`)!, options);
  if (!response.ok) {
    let message = `Request failed (${response.status}). Please retry.`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.slice(0, 5).map((e: { loc: (string | number)[]; msg: string }) => `${e.loc.join(' / ')}: ${e.msg}`).join('; ');
    } catch { /* Preserve the useful HTTP error when no JSON is available. */ }
    throw new ApiError(message, response.status);
  }
  return response.json();
}
export const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
export const percent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
export function saveText(text: string, filename: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError'; }
}
