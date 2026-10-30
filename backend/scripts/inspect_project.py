"""Inspect supplied research artifacts without executing notebook cells."""
import json
import sys
from pathlib import Path

import joblib
import pandas as pd
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from backend.paths import DATASET_PATH, MODEL_PATH, DOC_DIR

out = DOC_DIR / 'source-analysis'
out.mkdir(parents=True, exist_ok=True)
df = pd.read_csv(DATASET_PATH)
artifact = joblib.load(MODEL_PATH)
details = {k: v for k, v in artifact.items() if k != 'pipeline'}
details['pipeline_type'] = str(type(artifact['pipeline']))
details['shape'] = list(df.shape)
details['missing'] = df.isna().sum().to_dict()
details['categories'] = {c: sorted(df[c].dropna().unique().tolist()) for c in df.select_dtypes('object')}
details['numeric_ranges'] = {c: {'min': float(df[c].min()), 'max': float(df[c].max()), 'median': float(df[c].median())} for c in df.select_dtypes('number')}
details['target_counts'] = df.job_change_intention.value_counts().to_dict()
(out / 'data-and-model.json').write_text(json.dumps(details, indent=2, default=str), encoding='utf-8')
for path in (DOC_DIR / 'research').glob('*.pdf'):
    reader = PdfReader(path)
    text = '\n\n'.join(f'PAGE {i+1}\n{page.extract_text()}' for i, page in enumerate(reader.pages))
    (out / (path.stem + '.txt')).write_text(text, encoding='utf-8')
    print(path.name, len(reader.pages), 'pages', len(text), 'characters')
print(json.dumps(details, indent=2, default=str))
