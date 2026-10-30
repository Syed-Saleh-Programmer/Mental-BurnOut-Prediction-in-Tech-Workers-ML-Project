# Project analysis

Analysis of the seven files supplied in the original workspace. The application targets HR and people analytics teams, as requested. Original artifacts are retained unchanged.

The reorganized project stores the CSV in `data/datasets/`, the saved model in `data/models/`, the notebook in `data/notebooks/`, research PDFs in `doc/research/`, and the video in `doc/media/`. Shared paths are defined in `backend/paths.py`. Public resource filenames and the original inference contract are preserved.

## Inventory and role of each file

| Supplied file | Finding | Application use |
| --- | --- | --- |
| `mental_health_burnout_tech_2026.csv` | 100,000 rows, 36 columns; 35 input columns plus `job_change_intention` | Source for all observed analytics, filters, example profiles, schema categories/ranges, and exports |
| `turnover_pipeline.pkl` | Joblib dictionary; embedded scikit-learn version 1.6.1; calibrated HistGradientBoosting pipeline, expected columns, and tuned threshold | Actual inference engine, loaded once during API startup |
| `Mental_burnut_and_turn_over_latest.ipynb` | Ten cells, including baseline/SMOTE comparisons, tuned RF and HistGB, isotonic calibration, threshold search, export, and comparison plots | Exact feature-engineering contract and recorded experimental scores; available through research library |
| `Comparative Analysis of Tuned Random Forest and Hist Gradient Boosting.pdf` | Ten-page English research paper comparing RF/HistGB, SMOTE, and optimization; discusses minority-class F1 tradeoffs | Reference document, served in the research library; paper scores are not substituted for this notebook's results |
| `725-Article Text-3840-2-10-20260625.pdf` | Ten-page Indonesian/English version of the comparative paper | Additional original-language source in research library |
| `Broad Research for Improving Turnover Prediction Models.pdf` | Fifteen-page methodological report proposing cost-sensitive learning, Bayesian optimization, calibration, and threshold/cost analysis | Context for original improvements, retained as a reference; proposed models are not claimed to exist in this artifact |
| `Optimizing_Turnover_Prediction__Random_Forest_vs.mp4` | 63,168,421 bytes, 424.159 seconds (7 min 4 sec), AVC/H.264 video and AAC audio | Original explainer with native video controls and HTTP range support. Container metadata was inspected; no automated transcript was generated |

Extracted text for all three PDFs is in `doc/source-analysis`. `backend/scripts/inspect_project.py` regenerates text and machine-readable dataset/model metadata without executing notebook training cells.

## Dataset findings

- 67,998 records have target 0 (intention to stay); 32,002 have target 1 (intention to change jobs).
- No missing cells, no duplicated full rows, and 100,000 unique employee reference IDs.
- Ten categorical inputs and 25 numeric inputs; ten countries, twelve job roles, and three work modes.
- Burnout distribution: Low 25,807; Moderate 26,255; High 19,362; Severe 28,576. High/severe together account for 47,938 records.
- Mean stress 7.0554/10; mean burnout 5.4017/10; mean sleep 6.1024 hours/night; mean workweek 47.1041 hours.
- 18,101 profiles report more company tenure than total experience. This is retained as source data, with an input-consistency warning in corresponding model outputs.
- Burnout categories follow source score bands: Low 0-3.5, Moderate 3.6-5.5, High 5.6-7.0, Severe 7.1-10. The score and category are both model inputs, as are numeric PHQ-9/GAD-7 scores and their categories.
- The broad research report describes the dataset as synthetic. This application does not independently establish its collection process or represent the records as a live organization's workforce.

The frontend's cohort figures come from these records, not from model predictions or manually entered demo statistics. Filters are evaluated on the backend. Model input ranges are bounded to observed source ranges; external profiles outside those ranges need a separately reviewed extension.

## Notebook and model contract

### Original baseline experiments

The notebook one-hot encodes all non-target fields, uses an 80/20 stratified split with random state 42, trains RF and HistGB, then repeats after SMOTE. The initial CSV-not-found fallback generates random example data; serving never invokes that fallback. Missing source files cause startup to fail clearly.

### Improved experiments

The improved stage dynamically detects categorical columns and builds a `ColumnTransformer` containing a dense `OneHotEncoder(handle_unknown='ignore')` and numeric passthrough. The split is 69,997 training, 15,003 validation, and 15,000 test rows. Optuna explores each candidate with three-fold stratified CV. Both models use balanced class weights. Isotonic calibration fits on the held-out validation data; F1 threshold selection searches 100 values from 0.1 through 0.9. The winner is selected using test F1 and exported.

The exported object contains a calibrated pipeline and the exact feature list, but not the custom feature-engineering function. The API therefore recreates the notebook's function before passing features to that saved object:

```python
work_hours_to_sleep_ratio = work_hours_per_week / (sleep_hours_per_night * 7 + 1e-5)
total_mental_load = sum(existing columns among [
    'stress_score', 'job_burnout_score', 'depression_score', 'anxiety_score'
])
```

Only `stress_score` exists under those exact names in this CSV. The other source columns are named `burnout_score`, `phq9_score`, and `gad7_score`. Thus `total_mental_load` duplicates stress. This is a real training defect, preserved to keep inference consistent. Correcting it requires a new training run and a new artifact; the application does not silently change the model's learned inputs.

All 35 raw source inputs are required. The two engineered inputs are computed server-side, resulting in 37 expected input features before one-hot expansion. The source target is excluded from inference. JSON requests cannot supply unexpected columns. CSVs may include the source target and old engineered fields, which are discarded before recomputing features.

### Recorded notebook results

| Experiment | Accuracy | F1 | ROC AUC | Test rows |
| --- | --- | --- | --- | --- |
| Random Forest baseline | 68.52% | 25.51% | 0.6680 | 20,000 |
| HistGB baseline | 69.25% | 27.90% | 0.6817 | 20,000 |
| Random Forest + SMOTE | 67.30% | 35.87% | 0.6592 | 20,000 |
| HistGB + SMOTE | 68.98% | 32.66% | 0.6782 | 20,000 |
| HistGB optimized | 56.85% | 53.99% | 0.6859 | 15,000 |
| Random Forest optimized | 55.96% | 53.69% | 0.6807 | 15,000 |

The API extracts these values from saved cell outputs, rather than copying the paper's 52.60% optimized HistGB F1 into the app. PDF and notebook experiments are distinct. The PDF abstracts also disagree about the class ratio (68:32 versus 78:22); the actual CSV is 67.998:32.002.

`backend/scripts/verify_model.py` independently reconstructs the notebook's test split and evaluates the saved artifact without retraining. Its output is `doc/source-analysis/verified-model.json`. This reproduces an existing evaluation and is not a new external validation set.

## Interpretation and limitations

The predicted target is self-reported **job-change intention**. It is not observed departure, a clinical diagnosis, or a separately trained burnout classifier. The UI displays observed burnout categories and actual turnover-model outputs under separate labels.

The saved F1 threshold is below 0.5. Classification must use that original threshold; using `pipeline.predict()` or an arbitrary 0.5 boundary would produce different decisions. A classification of intention to leave does not necessarily mean the model gives leave a greater than 50% probability.

Comparison caveats: baseline/SMOTE and optimized runs use different test splits; selection of the winning model uses test F1; calibration and threshold search share the validation fold; no independent external holdout is supplied. The existing reference ID and demographic attributes also need suitability and fairness review for any real workplace application. The app does not invent feature attribution, intervention effects, or a diagnostic interpretation.

The research report proposes additional approaches, including CatBoost/LightGBM, PR AUC, cost-sensitive objectives, and external explanations. These are potential follow-up experiments, not implemented or reported as existing trained models.

## Delivered architecture

React 19 + TypeScript + Vite, Lucide icons, and Recharts form the frontend. FastAPI serves the production build and all JSON/CSV endpoints from one origin. A local Python virtual environment uses scikit-learn 1.6.1, matching the artifact's embedded version. Development uses Vite's API proxy.

The service loads the dataset and original model at startup. It validates all required model inputs, refuses unknown categories and out-of-range/nonfinite values, enforces batch limits, and never accepts an uploaded serialized model. Uploaded profiles are not persisted. Dataset export escapes spreadsheet formula prefixes. Supporting resources are allowlisted rather than exposing arbitrary files.

The landing page branches into two routed workspaces. HR users import CSV/XLSX data, confirm mappings and rejected rows, explore scoped cohort analytics, and open uploaded employee profiles. The demo is an explicitly selected 5,000-row sample of the original research data. Employee users complete a personal check-in, read their current score, and explore target changes without predicting future health. Outputs include analysis/employee/issue CSVs, personal summary and scenario text files, model assessment JSON, and original research materials. Empty, loading, validation, request-error, and success states are implemented.

`backend/hr.py` holds uploaded analyses in a bounded, expiring in-memory store. HR statistics use actual supplied indicators and per-metric response counts. Rows with all 35 compatible model fields receive saved-model predictions; partial profiles retain their descriptive analytics without fabricated defaults. Uploaded analyses never replace the original research dataframe. See `doc/WORKSPACES.md` for routes, API boundaries, and retention behavior.

The employee self-assessment is a separate questionnaire workflow described in `doc/SELF_ASSESSMENT.md`. It uses the CBI work-related subscale and optional self-reported context. It does not convert questionnaire answers into inputs for the saved turnover model or infer demographic/clinical fields.
