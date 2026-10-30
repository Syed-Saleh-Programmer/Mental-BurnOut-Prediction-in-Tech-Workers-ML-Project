import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CheckInResult, CheckInSchema } from './types';

export interface IndividualData { answers: Record<string, number>; wellbeing: Record<string, string>; result: CheckInResult | null; schema: CheckInSchema | null; scenario: Record<string, string> | null }
const EMPTY: IndividualData = { answers: {}, wellbeing: {}, result: null, schema: null, scenario: null };
const Context = createContext<{ data: IndividualData; setData: (value: IndividualData) => void; reset: () => void } | null>(null);
export function IndividualProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<IndividualData>(EMPTY);
  return <Context.Provider value={{ data, setData, reset: () => setData({ ...EMPTY }) }}>{children}</Context.Provider>;
}
export function useIndividual() { const value = useContext(Context); if (!value) throw new Error('Missing individual context'); return value; }
