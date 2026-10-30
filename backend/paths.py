"""Project paths resolved from source locations, independent of the working directory."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'
DOC_DIR = ROOT / 'doc'
FRONTEND_DIR = ROOT / 'frontend'
DATASET_PATH = DATA_DIR / 'datasets' / 'mental_health_burnout_tech_2026.csv'
MODEL_PATH = DATA_DIR / 'models' / 'turnover_pipeline.pkl'
NOTEBOOK_PATH = DATA_DIR / 'notebooks' / 'Mental_burnut_and_turn_over_latest.ipynb'

# Resource filenames remain stable in the public API after the directory move.
RESOURCE_PATHS = {path.name: path for path in [
    NOTEBOOK_PATH,
    *(DOC_DIR / 'research').glob('*.pdf'),
    *(DOC_DIR / 'media').glob('*.mp4'),
]}
