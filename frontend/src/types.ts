export type RecordInput = Record<string, string | number>;
export interface Field { name: string; label: string; group: string; kind: 'category' | 'integer' | 'number'; options?: string[]; min?: number; max?: number; step?: number }
export interface Schema { fields: Field[]; defaults: RecordInput; threshold: number; categories: Record<string, string[]> }
export interface Group { name: string; count: number; turnover_rate: number; stress: number; burnout: number }
export interface Overview {
  count: number; total_count: number; turnover_rate: number; high_burnout_rate: number; average_stress: number; average_burnout: number; average_sleep: number; average_hours: number; leave_count: number; stay_count: number;
  burnout_distribution: { name: string; count: number }[]; by_work_mode: Group[]; by_role: Group[]; by_country: Group[];
  stress_relationship: { name: string; count: number; turnover_rate: number }[]; correlations: { name: string; value: number }[];
}
export interface Prediction { employee_id: number; probability: number; prediction: number; label: string; threshold: number; warnings: string[] }
export interface PredictionResult { model_name: string; threshold: number; count: number; predictions: Prediction[]; filename?: string }
export interface Research {
  models: { name: string; accuracy: number; f1: number; auc: number; selected: boolean; source: string; test_size: number }[];
  files: { name: string; kind: string; bytes: number; url: string | null }[];
  model_name: string; threshold: number; model_sha256: string; features: number; raw_features: number; limitations: string[];
}
export interface DatasetRecord { employee_id: number; job_role: string; country: string; work_mode: string; stress_score: number; burnout_score: number; burnout_level: string; job_change_intention: number }
export interface RecordsResponse { count: number; page: number; page_size: number; records: DatasetRecord[] }

export interface CheckInQuestion { id: string; text: string; label: string; options: string[]; reverse: boolean }
export interface CheckInFactor { id: string; label: string; question: string; kind: 'rating' | 'number'; min: number; max: number; low_label?: string; high_label?: string; unit: string; description: string }
export interface CheckInSource { title: string; url: string }
export interface CheckInSchema { version: string; questions: CheckInQuestion[]; factors: CheckInFactor[]; sources: CheckInSource[]; attribution: string; method: string }
export interface CheckInResult {
  version: string;
  burnout: { instrument: string; score: number; scale_max: number; items: { id: string; label: string; question: string; answer: string; points: number; reverse_scored: boolean }[] };
  factors: (CheckInFactor & { value: number | null })[];
  suggestions: { title: string; text: string }[];
  method: string; suggestion_method: string; privacy: string; attribution: string; sources: CheckInSource[];
}
