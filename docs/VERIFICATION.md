# Verification report

Two-workspace implementation verified locally on 30 October 2026 using the supplied source assets, Python 3.12.14, Node.js 24.19.0, and installed Google Chrome. Original model evaluation below was reproduced on 26 October and retained unchanged.

**Story:** the landing screen branches into a dark upload-first HR dashboard and a light individual check-in. HR users import CSV/XLSX files, review mapped rows, and explore their chosen analysis. Individuals get a current CBI score and compare optional what-if targets. Both flows call FastAPI and return explained, downloadable results.

## Observed results

| Check | Result | Evidence |
| --- | --- | --- |
| Production build | Passed | TypeScript and Vite complete successfully; app, vendor, and chart bundles are separate |
| Backend dependency consistency | Passed | `python -m pip check`: `No broken requirements found.` |
| Model and dataset startup | Passed | `/api/health`: `status=ready`, `model_loaded=true`, `dataset_rows=100000` |
| API integration tests | **74 passed** | `python -m pytest tests/test_api.py tests/test_hr.py tests/test_cors.py -q`; original 51, 21 HR/scenario cases, and two CORS boundary cases |
| Chrome end-to-end tests | **13 scenarios passed** | CSV/XLSX imports, accepted/rejected rows, filters, profiles, exports, replacement/clear, demo/model, expiry, role isolation, responsive routes, employee scoring/recovery, and what-if targets |
| Original holdout evaluation reproduction | Passed | Exact calibrated artifact evaluated on reconstructed original 15,000-row test split |
| Responsive behavior | Passed | Landing, HR overview/import, and individual check-in fit 320, 390, 1280, and 1920px; individual results and what-if targets also fit 320px |
| Visual inspection | Completed | New landing, uploaded HR dashboard, individual summary, and what-if screen reviewed from live Chrome screenshots |
| Pages build and routing | Passed locally | Repository-subpath static builds with hash navigation/reload, keyboard skip navigation, and explicit missing-service handling |
| Separate backend connection | Passed locally | Pages build submits a real HR import and CBI assessment to a separate FastAPI origin; downloads and research resources use that origin |
| Pages workflow | YAML checked | Every-push/manual triggers, default-branch deployment dependency, scoped token permissions, and full action SHAs checked; remote deployment awaits repository configuration |

Actual render verification used Playwright with installed Chrome and the live FastAPI server. Self-hosted DM Sans, separate light/dark workspace surfaces, and unavailable-chart suppression are part of the current build.

## Boundaries verified

| Boundary | Status | Evidence |
| --- | --- | --- |
| UI rendering | Passed | Both route families, landing, live HR charts, employee summaries, and what-if comparisons render; screenshots in `output/screenshots` |
| UI to API | Passed | Browser submits import preview/validation/analysis, individual assessment/scenario, and original model prediction requests through FastAPI |
| Uploaded cohort scope | Passed | Three accepted fixture rows yield exactly three profiles; Engineering filtering yields two; replacing data yields one and clear returns upload-first state |
| Excel and units | Passed | Browser switches worksheets and declares CBI 0–100; two values 50/75 yield mean 62.5 /100 without conversion to 0–10 |
| Temporary retention | Passed | API tests enforce sliding expiry, bounded LRU eviction, clear, and 410 responses; browser restores active references on refresh and handles expired references |
| What-if boundary | Passed | Target stress 0 and sleep 7.5 produce differences -8 and +2; a missing current support value yields no difference; measured CBI stays 50.0; reset and refresh behave correctly |
| API to source data | Passed | Cohort counts and target totals match independent dataframe calculations; source profile loading works |
| API to model | Passed | API probabilities agree with independently reconstructed original preprocessing and `pipeline.predict_proba()` within `1e-8` |
| Model classification | Passed | Every tested output uses the artifact's original `0.2535353535353535` threshold |
| Response to UI | Passed | Probability, classification, threshold, and reference ID display; edits clear old results |
| Export and download | Passed | Cohort CSV, input template, batch prediction CSV, and assessment JSON download in Chrome |
| Input validation | Passed | Missing/extra fields, unknown categories, numeric bounds, fractional integers, empty batches, malformed CSVs, duplicate CSV headers, oversized uploads, and missing source IDs return appropriate errors |
| Research resources | Passed | Six notebook experiments and four document/notebook resources display; MP4 loads with HTTP 206 and browser ready state 4 |
| Failure recovery | Passed | Individual questionnaire and submit failures preserve the flow and retry successfully; expired HR analyses return upload state with a notice |
| Employee burnout scoring | Passed | Scores 0, 50, 75, and 100; mixed answers; and the reversed energy item match independent expected calculations |
| Employee optional factors | Passed | Missing values remain null, valid zero values remain zero, invalid ratings/hours are rejected |
| Employee result and privacy | Passed | Complete questionnaire renders its summary, exports readable text, retains answers when stepping back, and clears on a new check-in; no name/ID is accepted |
| Employee error recovery | Passed | Questionnaire-load and summary-submit failures display actionable messages; retry succeeds without losing answers |
| Separate inference paths | Passed | Self-assessment works even when the turnover prediction method is replaced with a failure in the test; no invented model inputs |

## Reproduced model evaluation

The original notebook test split was reconstructed using a 15% stratified split and random state 42. The artifact was not retrained.

| Metric | Reproduced value |
| --- | --- |
| Test rows | 15,000 |
| Threshold | 0.2535353535353535 |
| Accuracy | 0.5684666666666667 |
| F1 | 0.539910441395977 |
| ROC AUC | 0.6858837214052289 |
| True negatives | 4,729 |
| False positives | 5,471 |
| False negatives | 1,002 |
| True positives | 3,798 |

Rounded metrics reproduce the notebook's 56.85% accuracy, 53.99% F1, and 0.6859 ROC AUC. This is reproduction of an existing test set, not external validation.

Machine-readable evidence is in `docs/source-analysis/verified-model.json`; the artifact SHA-256 is `eb386590deabeda2a9a86a68d4f996053fac80b30fb01a6778f0625d4afb1d19`.

## Findings resolved during verification

- Wrapped the source CSV filename inside the mobile dataset panel.
- Added a positioned containing block to scrollable tables so the offscreen accessible table label does not expand the document's scroll width.
- Split chart/vendor/application bundles, removing Vite's initial large-chunk warning.
- Preserved all original model inputs and engineering semantics, including the notebook's naming defect, rather than making a serving-only change that disagrees with training.

The API test run emits two non-failing dependency/environment notices: Starlette's TestClient reports an upcoming HTTP-client change, and joblib cannot detect physical CPU cores in this environment and falls back to logical cores. Model results remain verified. Playwright reports the environment's `NO_COLOR`/`FORCE_COLOR` conflict; this affects terminal colors only.

## Practical limits

- The running service is local at `http://127.0.0.1:8000`; no public deployment or authentication was configured.
- Docker configuration is provided, but container execution was not tested here.
- The 100,000 source observations are research data, not a live employee database. The model estimates job-change intention; clinical diagnosis and actual departures are outside its target.
- Source research, evaluation caveats, and data-quality findings are documented in `docs/PROJECT_ANALYSIS.md` and in the frontend research view.
- `requirements-lock.txt` records the exact Python environment used during verification. `package-lock.json` records frontend packages.

## Repeat

```powershell
.venv\Scripts\python.exe -m pytest tests/test_api.py tests/test_hr.py tests/test_cors.py -q
npm run build
.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
# In another terminal:
npm run test:e2e
.venv\Scripts\python.exe scripts/verify_model.py
```

Use `.\start.ps1` or `start.cmd` for normal startup. Keep the server terminal running.
