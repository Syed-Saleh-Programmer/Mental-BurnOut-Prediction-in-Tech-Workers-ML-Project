"""Reproduce the notebook's untouched 15% test split; never retrain the artifact."""
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from threadpoolctl import threadpool_limits

from backend.service import ProjectService, ROOT

service = ProjectService()
data = service.prepare(service.df)
_, test = train_test_split(data, test_size=0.15, stratify=data.job_change_intention, random_state=42)
with threadpool_limits(limits=2):
    probabilities = service.pipeline.predict_proba(test[service.artifact['expected_columns']])[:, 1]
predictions = probabilities >= service.threshold
report = {
    'model_name': service.artifact['model_name'],
    'model_sha256': hashlib.sha256((ROOT / 'turnover_pipeline.pkl').read_bytes()).hexdigest(),
    'evaluation': 'Reconstructed original notebook test split, not an external holdout',
    'test_records': len(test),
    'threshold': service.threshold,
    'accuracy': accuracy_score(test.job_change_intention, predictions),
    'f1': f1_score(test.job_change_intention, predictions),
    'roc_auc': roc_auc_score(test.job_change_intention, probabilities),
    'confusion_matrix': confusion_matrix(test.job_change_intention, predictions).tolist(),
}
path = ROOT / 'docs/source-analysis/verified-model.json'
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
