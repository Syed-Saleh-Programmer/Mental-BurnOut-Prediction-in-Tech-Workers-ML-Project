# Workwell workspaces

The application implements two experiences behind a shared landing page. The role choice controls navigation, not identity or authorization. There is no account system or database.

## Routes and state

| Route | Experience |
| --- | --- |
| `/` | Choose Individual or HR Dashboard; no data requests |
| `/hr` | Upload-first overview; explicit demo option |
| `/hr/import` | File, worksheet, mapping, validation, acceptance, analysis |
| `/hr/employees` | Filter, search, sort, paginate, export |
| `/hr/employees/:rowId` | Supplied employee fields and eligible model result |
| `/hr/research` | Original research and model limitations |
| `/hr/model-assessment` | Advanced original-model sandbox |
| `/individual` | Three-stage CBI and optional wellbeing questions |
| `/individual/results` | Current score, indicators, prompts, text download |
| `/individual/explore` | Current versus target indicators and text download |

React Router provides navigation, browser history, legacy query redirects, and deep links. FastAPI serves the SPA for both route families, while unknown API paths still return 404. Route-level lazy loading keeps HR charts out of the initial individual bundle. DM Sans fonts are self-hosted.

`HrContext` stores only the active opaque analysis reference in session storage. Metadata is restored from FastAPI after a refresh. Filters and employee list controls are URL parameters. An expired reference produces a clear upload state, never a silent fallback to research data.

`IndividualContext` holds answers, current results, and scenario targets in React memory. No employee answers are put in browser storage or HR analyses. Results and explorer routes require an existing result. Refresh, switching experience, and reset discard this state.

## HR import and analysis

1. Accept a UTF-8 comma-separated CSV or `.xlsx` file, up to 10 MB, 200 columns, and 5,000 nonempty employee rows. Excel uses read-only, cached-value parsing; formulas are not executed. Excessive expanded archive sizes are rejected.
2. Preview up to 20 rows, infer aliases, and let the user confirm column mappings. Excel users select a worksheet. Burnout 0–10 and CBI 0–100 remain distinct measures; users declare the source scale.
3. Validate supplied values. Missing optional indicators stay missing. Mapped duplicate/empty IDs, invalid numerics, and rows with no usable wellbeing indicator are rejected. Source row references identify rows when no ID is mapped.
4. Show counts and downloadable issues. If any rows are rejected, the user must explicitly accept exclusion before analysis.
5. Analyze valid profiles. Descriptive analytics work with partial input. Saved-model predictions require all 35 compatible raw fields; the backend recomputes engineered features using the original notebook behavior.
6. Replace the active analysis only after success. Delete the prior analysis, support explicit clear, and provide summary, employee, and issue CSV downloads. Spreadsheet formula prefixes are escaped in exports.

Every chart and statistic in the HR overview comes from the selected analysis and cohort. Means include individual response counts. Unavailable chart types are omitted. Group charts show up to 12 largest groups. Reported scores/categories, observed job-change intention, and saved-model estimates are labeled separately. No causal attribution or future burnout probability is invented.

The explicit demo uses the first 5,000 original records and is labeled as a sample of 100,000 research records. Original research and inference APIs remain available separately and the original assets are unchanged.

## Temporary storage

`TemporaryStore` uses opaque random references, a lock, a 30-minute sliding inactivity expiry, and a capacity of 12 combined draft/analysis entries. The least recently used entry is evicted at capacity. A background task sweeps expired entries every minute; reads also enforce expiry. Server shutdown clears memory. Expired, evicted, and cleared references return HTTP 410. Draft bytes and accepted analysis records are not written to application storage.

Run a single backend worker because state is process-local. Closing a browser tab does not immediately delete server data; expiry handles abandoned sessions. References are not authentication. This implementation is intended for a trusted local environment, served on loopback by default.

## Individual measurement

The seven original CBI work-related questions produce a current exhaustion score with the energy question reverse-scored. Six optional indicators provide context and transparent prompts. The what-if endpoint compares current and target values; it leaves the measured score unchanged and does not predict future burnout. See `SELF_ASSESSMENT.md` for scoring, sources, and boundaries.

## Verification

API tests cover original model parity plus HR import, units, row acceptance, missing-aware analytics, employee scope, Excel worksheets, exports, limits, expiry, eviction, deep links, and scenario arithmetic. Chrome tests exercise the actual UI through FastAPI, including CSV/Excel imports, model output, downloads, reload behavior, error recovery, role isolation, and mobile layouts. See `VERIFICATION.md` for observed results.
