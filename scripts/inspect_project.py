"""Inspect supplied research artifacts without executing notebook cells."""
import json
from pathlib import Path

import joblib
import pandas as pd
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
out = ROOT / 'docs' / 'source-analysis'
out.mkdir(parents=True, exist_ok=True)
df = pd.read_csv(ROOT / 'mental_health_burnout_tech_2026.csv')
artifact = joblib.load(ROOT / 'turnover_pipeline.pkl')
details = {k: v for k, v in artifact.items() if k != 'pipeline'}
details['pipeline_type'] = str(type(artifact['pipeline']))
details['shape'] = list(df.shape)
details['missing'] = df.isna().sum().to_dict()
details['categories'] = {c: sorted(df[c].dropna().unique().tolist()) for c in df.select_dtypes('object')}
details['numeric_ranges'] = {c: {'min': float(df[c].min()), 'max': float(df[c].max()), 'median': float(df[c].median())} for c in df.select_dtypes('number')}
details['target_counts'] = df.job_change_intention.value_counts().to_dict()
(out / 'data-and-model.json').write_text(json.dumps(details, indent=2, default=str), encoding='utf-8')
for path in ROOT.glob('*.pdf'):
    reader = PdfReader(path)
    text = '\n\n'.join(f'PAGE {i+1}\n{page.extract_text()}' for i, page in enumerate(reader.pages))
    (out / (path.stem + '.txt')).write_text(text, encoding='utf-8')
    print(path.name, len(reader.pages), 'pages', len(text), 'characters')
print(json.dumps(details, indent=2, default=str))
