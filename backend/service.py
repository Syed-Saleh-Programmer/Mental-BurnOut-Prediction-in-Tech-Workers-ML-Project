"""Model inference and cohort analytics using the supplied, immutable assets."""
from __future__ import annotations

import hashlib
import json
import re
from typing import Any

import joblib
import numpy as np
import pandas as pd
from pydantic import ConfigDict, Field, create_model
from threadpoolctl import threadpool_limits

from backend.paths import ROOT, DATASET_PATH, MODEL_PATH, NOTEBOOK_PATH, RESOURCE_PATHS
TARGET = 'job_change_intention'
DATA_FILE = 'mental_health_burnout_tech_2026.csv'
NOTEBOOK = 'Mental_burnut_and_turn_over_latest.ipynb'
BURNOUT_ORDER = ['Low', 'Moderate', 'High', 'Severe']
GROUPS = {
    'Employee profile': ['employee_id', 'age', 'gender', 'country', 'job_role', 'seniority_level', 'years_experience', 'years_at_company', 'company_size', 'industry', 'work_mode', 'salary_usd', 'team_size'],
    'Work and recovery': ['work_hours_per_week', 'meetings_per_day', 'sleep_hours_per_night', 'exercise_days_per_week', 'vacation_days_taken', 'ai_tools_daily'],
    'Workplace experience': ['manager_support_score', 'work_life_balance_score', 'job_satisfaction_score', 'social_support_score', 'deadline_pressure_score', 'autonomy_score'],
    'Wellbeing indicators': ['stress_score', 'burnout_score', 'burnout_level', 'phq9_score', 'phq9_category', 'gad7_score', 'gad7_category', 'therapy_access', 'uses_therapy', 'seeks_mental_health_support'],
}
LABELS = {'employee_id': 'Reference ID', 'salary_usd': 'Annual salary (USD)', 'phq9_score': 'PHQ-9 score', 'phq9_category': 'PHQ-9 category', 'gad7_score': 'GAD-7 score', 'gad7_category': 'GAD-7 category', 'ai_tools_daily': 'Uses AI tools daily', 'therapy_access': 'Has access to therapy', 'uses_therapy': 'Uses therapy', 'seeks_mental_health_support': 'Seeks mental health support'}


class ProjectService:
    def __init__(self):
        self.df = pd.read_csv(DATASET_PATH)
        # Only the project's local artifact is loaded. Uploads never accept models.
        self.artifact = joblib.load(MODEL_PATH)
        self.pipeline = self.artifact['pipeline']
        self.threshold = float(self.artifact['optimal_threshold'])
        self.raw_columns = [c for c in self.df if c != TARGET]
        self.defaults: dict[str, Any] = {}
        self.fields = []
        definitions = {}
        for col in self.raw_columns:
            values = self.df[col]
            group = next((g for g, cols in GROUPS.items() if col in cols), 'Other')
            meta: dict[str, Any] = {'name': col, 'label': LABELS.get(col, col.replace('_', ' ').capitalize()), 'group': group}
            if values.dtype == 'object':
                options = sorted(values.dropna().unique().tolist())
                default = str(values.mode().iloc[0])
                meta.update(kind='category', options=options)
                definitions[col] = (str, Field(..., min_length=1, max_length=100))
            else:
                lo, hi = float(values.min()), float(values.max())
                integral = pd.api.types.is_integer_dtype(values)
                default = int(values.median()) if integral else round(float(values.median()), 1)
                if col == 'employee_id':
                    default = 50000
                meta.update(kind='integer' if integral else 'number', min=lo, max=hi, step=1 if integral else 0.1)
                constraints = {'ge': lo, 'le': hi}
                if not integral:
                    constraints['allow_inf_nan'] = False
                definitions[col] = (int if integral else float, Field(..., **constraints))
            self.defaults[col] = default
            self.fields.append(meta)
        self.Record = create_model('EmployeeRecord', __config__=ConfigDict(extra='forbid', str_strip_whitespace=True), **definitions)
        missing = set(self.artifact['expected_columns']) - set(self.prepare(self.df.head(1)).columns)
        if missing:
            raise RuntimeError(f'Missing model features: {sorted(missing)}')
        self.model_hash = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()

    def prepare(self, data: pd.DataFrame) -> pd.DataFrame:
        """Reproduce prepare_features from notebook cell 4, including its naming issue."""
        result = data.copy()
        result['work_hours_to_sleep_ratio'] = result['work_hours_per_week'] / (result['sleep_hours_per_night'] * 7 + 1e-5)
        components = [c for c in ['stress_score', 'job_burnout_score', 'depression_score', 'anxiety_score'] if c in result.columns]
        result['total_mental_load'] = result[components].sum(axis=1)
        return result

    def validate(self, rows: list[dict]) -> list[dict]:
        from fastapi import HTTPException
        from pydantic import ValidationError
        validated = []
        for index, row in enumerate(rows):
            try:
                record = self.Record.model_validate(row).model_dump()
            except ValidationError as exc:
                errors = [{**e, 'loc': ['records', index, *e['loc']]} for e in exc.errors(include_context=False, include_url=False, include_input=False)]
                raise HTTPException(422, detail=errors) from exc
            for field in self.fields:
                if field['kind'] == 'category' and record[field['name']] not in field['options']:
                    raise HTTPException(422, detail=f"Row {index+1}: {field['label']} must be one of {', '.join(field['options'])}.")
            # The source dataset contains independent categories; preserve explicit values.
            validated.append(record)
        return validated

    def predict(self, rows: list[dict]) -> dict:
        records = self.validate(rows)
        frame = self.prepare(pd.DataFrame(records))[self.artifact['expected_columns']]
        with threadpool_limits(limits=2):
            probabilities = self.pipeline.predict_proba(frame)[:, list(self.pipeline.classes_).index(1)]
        predictions = []
        for record, probability in zip(records, probabilities):
            predicted = int(probability >= self.threshold)
            warnings = []
            if record['years_at_company'] > record['years_experience']:
                warnings.append('Company tenure exceeds reported experience. This pattern also occurs in the source dataset; review the inputs.')
            predictions.append({
                'employee_id': record['employee_id'],
                'probability': round(float(probability), 8),
                'prediction': predicted,
                'label': 'Intention to leave' if predicted else 'Intention to stay',
                'threshold': self.threshold,
                'warnings': warnings,
            })
        return {'model_name': self.artifact['model_name'], 'threshold': self.threshold, 'count': len(records), 'predictions': predictions}

    def cohort(self, work_mode: str | None, country: str | None, job_role: str | None) -> pd.DataFrame:
        result = self.df
        for col, value in [('work_mode', work_mode), ('country', country), ('job_role', job_role)]:
            if value:
                result = result[result[col] == value]
        return result

    def analytics(self, data: pd.DataFrame) -> dict:
        def mean(col):
            return round(float(data[col].mean()), 3) if len(data) else 0

        def groups(col, order=None):
            result = data.groupby(col, observed=True).agg(count=(TARGET, 'size'), turnover_rate=(TARGET, 'mean'), stress=('stress_score', 'mean'), burnout=('burnout_score', 'mean')).reset_index()
            rows = [{'name': str(r[col]), 'count': int(r['count']), 'turnover_rate': round(float(r['turnover_rate']), 5), 'stress': round(float(r['stress']), 2), 'burnout': round(float(r['burnout']), 2)} for _, r in result.iterrows()]
            return sorted(rows, key=lambda r: order.index(r['name'])) if order else sorted(rows, key=lambda r: -r['count'])

        counts = data.burnout_level.value_counts()
        bins = []
        for low, high in [(1, 3), (3, 5), (5, 7), (7, 9), (9, 10.01)]:
            selected = data[(data.stress_score >= low) & (data.stress_score < high)]
            bins.append({'name': f'{low}-{min(int(high), 10)}', 'count': len(selected), 'turnover_rate': round(float(selected[TARGET].mean()), 5) if len(selected) else 0})
        correlations = data.select_dtypes('number').corr()[TARGET].drop([TARGET, 'employee_id']).dropna()
        correlations = correlations.reindex(correlations.abs().sort_values(ascending=False).index).head(8)
        return {
            'count': len(data), 'total_count': len(self.df), 'turnover_rate': mean(TARGET),
            'high_burnout_rate': round(float(data.burnout_level.isin(['High', 'Severe']).mean()), 5) if len(data) else 0,
            'average_stress': mean('stress_score'), 'average_burnout': mean('burnout_score'),
            'average_sleep': mean('sleep_hours_per_night'), 'average_hours': mean('work_hours_per_week'),
            'leave_count': int(data[TARGET].sum()), 'stay_count': int(len(data) - data[TARGET].sum()),
            'burnout_distribution': [{'name': name, 'count': int(counts.get(name, 0))} for name in BURNOUT_ORDER],
            'by_work_mode': groups('work_mode'), 'by_role': groups('job_role'),
            'by_country': groups('country'), 'stress_relationship': bins,
            'correlations': [{'name': LABELS.get(k, k.replace('_', ' ').capitalize()), 'value': round(float(v), 4)} for k, v in correlations.items()],
        }

    def research(self) -> dict:
        notebook = json.loads(NOTEBOOK_PATH.read_text(encoding='utf-8'))
        outputs = {}
        for i in [1, 2, 6]:
            outputs[i] = ''.join(''.join(o.get('text', [])) for o in notebook['cells'][i].get('outputs', []) if o.get('name') == 'stdout')
        models = []
        for cell, names in [(1, ['Random Forest baseline', 'HistGB baseline']), (2, ['Random Forest + SMOTE', 'HistGB + SMOTE']), (6, ['HistGB optimized', 'Random Forest optimized'])]:
            pattern = r'(?:Test )?Accuracy:\s*([\d.]+)%.*?(?:Test )?F1-Score:\s*([\d.]+)%.*?(?:Test )?ROC-AUC:\s*([\d.]+)'
            matches = re.findall(pattern, outputs[cell], re.S)
            for name, values in zip(names, matches):
                models.append({'name': name, 'accuracy': float(values[0]), 'f1': float(values[1]), 'auc': float(values[2]), 'selected': name == 'HistGB optimized', 'source': 'Notebook saved outputs', 'test_size': 15000 if cell == 6 else 20000})
        files = []
        for path in sorted([DATASET_PATH, MODEL_PATH, *RESOURCE_PATHS.values()]):
            files.append({'name': path.name, 'kind': path.suffix[1:].upper(), 'bytes': path.stat().st_size, 'url': f'/resources/{path.name}' if path.suffix in ['.pdf', '.mp4', '.ipynb'] else None})
        return {'models': models, 'files': files, 'model_name': self.artifact['model_name'], 'threshold': self.threshold, 'model_sha256': self.model_hash, 'features': len(self.artifact['expected_columns']), 'raw_features': len(self.raw_columns), 'limitations': [
            'The target is self-reported intention to change jobs, not observed employee departure or a clinical diagnosis.',
            'Comparison scores are saved notebook outputs. Baselines use a 20% test split; optimized models use a 15% test split, so these are not identical evaluations.',
            'The notebook selects the winning model using test F1. A fresh external holdout is needed for an unbiased final assessment.',
            'The original model includes reference ID, demographic attributes, and overlapping wellbeing scores. Review suitability and fairness before workplace use.',
            'The total_mental_load feature equals stress_score in this dataset because the other component names in the notebook do not match the CSV columns.',
            'Prediction batches are processed in memory and are not saved by this application.',
        ]}
