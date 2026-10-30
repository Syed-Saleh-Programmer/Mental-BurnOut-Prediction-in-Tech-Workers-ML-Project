# Employee self-assessment

Open `http://127.0.0.1:8000/individual`, or choose **Individual** on the landing page. The individual workspace has its own light layout and navigation; HR imports and model tools are available in the separate HR workspace. The old `?view=self-assessment` URL redirects here.

## What employees can do

1. Answer three questions about how work feels.
2. Answer four questions about work-related energy and exhaustion.
3. Optionally report stress, sleep, working hours, work-life balance, manager support, and job satisfaction.
4. Read a burnout questionnaire score, expandable item breakdown, reported indicators, and personalized reflection prompts.
5. Download a readable text summary, review responses, or start a fresh check-in.
6. Explore target changes in `/individual/explore`, compare entries, and download a separate scenario summary.

No name, reference ID, demographic details, or employer identifier is requested. Answers start blank and are held in workspace memory. Summary submission sends answers to the local API; the app does not persist them or add them to the HR or research dataset. Answers survive navigation between the check-in, results, and explorer within the workspace. Refreshing, switching experience, or starting a new check-in clears them. Downloading a summary creates a file only when the employee explicitly chooses that action.

## What-if explorer

`POST /api/self-assessment/scenario` accepts current and target values for the six optional indicators. It returns the supplied values, arithmetic differences, and transparent reflection prompts. Blank values remain missing; a difference is unavailable unless both values were provided. Zero is a valid entry. Reset restores the original optional answers and does not alter CBI responses.

The measured CBI score remains unchanged. This feature does not estimate intervention effects, a future burnout score, or the probability of developing burnout. The supplied saved model predicts job-change intention and cannot substantiate such a forecast. Direct links to results or the explorer redirect to the check-in if there is no current result.

## Questionnaire and permitted use

The burnout section uses the **work-related burnout subscale of the Copenhagen Burnout Inventory (CBI)**, with the original seven English questions and their degree/frequency response formats. Response options appear from lower to higher frequency/degree; their numeric keys preserve the published scoring.

The National Research Centre for the Working Environment (NFA) permits commercial and non-commercial CBI use with clear attribution to:

> Borritz M et al. Burnout among employees in human service work: design and baseline findings of the PUMA study. Scandinavian Journal of Public Health. 2006;34:49-58.

The page includes this attribution, source links, and scoring explanation.

- [Original English questionnaire and scoring, NFA](https://nfa.dk/media/a4wheblj/cbi-scales.pdf)
- [CBI use conditions and PUMA source attribution, NFA](https://nfa.dk/vaerktoejer/spoergeskemaer/spoergeskema-til-maaling-af-udbraendthed-cbi/copenhagen-burnout-inventory-cbi)
- [Burnout as an occupational phenomenon, WHO](https://www.who.int/standards/classifications/frequently-asked-questions/burn-out-an-occupational-phenomenon)
- [Stress and work, CDC/NIOSH](https://www.cdc.gov/niosh/topics/mentalhealth/default.html)

## Scoring contract

`burnout_answers` contains seven required integers from 0 through 4. These correspond to the displayed response choices in ascending degree/frequency order. The first six answers contribute `answer * 25` points. The final question asks about energy outside work and contributes `(4 - answer) * 25` points.

The result is the mean of all seven point scores, rounded to two decimal places for transport and displayed to one decimal. For example, six answers of 3 and an energy answer of 4 yield `(6 * 75 + 0) / 7 = 64.2857...`, returned as 64.29 and displayed as 64.3/100.

All seven burnout questions are required in this app. The published instrument also describes partial-response rules; this app deliberately requires complete responses and does not implement partial scoring. The result is a continuous questionnaire score. It is not a probability, diagnosis, or a clinical severity category. No arbitrary low/moderate/high clinical bands are introduced.

The six additional indicators are independent optional self-reports. Ratings run from 0 to 10. Sleep accepts finite values from 0 to 24 hours; weekly working time accepts finite values from 0 to 168 hours. Omitted answers remain null, distinct from a genuine zero. They do not alter the CBI score.

## Reflection prompts

Suggestions are deterministic prompts to consider a conversation or change, not predicted treatment effects. The method is disclosed in the UI and downloaded summary. Prompts are selected when a CBI item scores at least 75, work stress is at least 7/10, sleep is below seven hours, weekly work exceeds 40 hours, or balance/support/satisfaction is at most 4/10. These are app reflection rules, not medical cutoffs, country-specific legal limits, or validated risk bands. A default reflection prompt is shown when none of the rules applies.

## Separation from the existing model

The supplied artifact predicts job-change intention from 35 raw research fields. It is not a trained burnout classifier. This new workflow therefore does not manufacture missing demographic/clinical fields, translate CBI scores into the dataset's unrelated burnout score, or call the turnover pipeline. The existing job-change model remains available as a separate assessment.

## API and validation

- `GET /api/self-assessment`: versioned questions, response labels, optional factors, method, attribution, and sources.
- `POST /api/self-assessment`: accepts `burnout_answers` and optional `wellbeing`; returns the scored breakdown, self-reported factors, suggestions, method, and sources.

Extra fields are forbidden. Missing burnout answers, non-integer/boolean/out-of-range answer values, invalid optional ratings, and nonfinite/out-of-range hours are rejected with HTTP 422. The existing API middleware prevents caching of responses. Submitted answers are not logged by this code or saved to disk.

## Verification

The original API suite includes 22 self-assessment cases for scoring, reverse scoring, optional blanks/zeroes, validation, attribution, and separation from turnover inference. Browser scenarios cover questionnaire completion and text download, mobile completion with optional answers skipped, back/reset behavior, load/submit recovery, and the what-if target workflow. Current project verification covers 74 API tests and 13 browser scenarios, plus static-host checks; see [VERIFICATION.md](VERIFICATION.md).

GitHub-ready screenshots and capture provenance are in [screenshots](screenshots). They use fictional illustrative responses submitted through the actual interface. Additional browser-test screenshots are written to `frontend/test-results/screenshots`.
