# Research Novelty Proposal

## Proposed Title

**An Explainable Framework for Understanding Employee Burnout and Turnover Intention and Identifying Preventive Actions**

**Research context:** Extension of the existing mental workload and turnover intention prediction study.  
**Proposal status:** Planned research; the analyses, interventions, and findings described below have not yet been established.

## 1. Proposal Overview

This research will extend the existing turnover prediction study by investigating which workplace and wellbeing factors are most strongly associated with employees' intention to leave, how those factors relate to work-related burnout, and which conditions could be targeted through practical preventive actions. The study will move from producing a prediction toward explaining the patterns behind that prediction and developing an evidence-informed basis for organizational support.

The proposed contribution will connect three activities: **identifying influential factors, examining their relationships with burnout and turnover intention, and prioritizing feasible actions for further evaluation**. The research will consider both adverse conditions that could be reduced and protective conditions that could be strengthened. Its intended outcome is a transparent framework that helps HR professionals understand where support may be needed and select appropriate actions to investigate.

## 2. Background and Research Gap

The existing research compares Random Forest and Histogram-based Gradient Boosting models for predicting job-change intention from employee mental workload and wellbeing indicators. The supplied model returns a calibrated probability and applies a selected classification threshold. Its target represents **self-reported intention to change jobs**, rather than a confirmed future departure. The original paper also discusses influential features, including burnout, deadline pressure, and stress. These findings provide a starting point for the proposed extension, rather than an unexplored topic in their own right. [1, 2]

The research opportunity is therefore to develop the explanation and prevention aspects beyond a prediction score or a single feature ranking. In particular, the proposed study will examine the direction, consistency, and combined patterns of relevant factors across burnout and turnover intention, distinguish potentially changeable workplace conditions from descriptive characteristics, and translate the findings into actions whose feasibility and outcomes can be evaluated.

## 3. Central Novelty Statement

> The proposed novelty is an integrated, explainable, and prevention-oriented extension of turnover intention prediction. The research will identify factors associated with both burnout and intention to leave, examine their individual and combined predictive relationships, and distinguish actionable workplace conditions from non-actionable attributes. It will then develop a structured framework for prioritizing supportive organizational actions and evaluating them where suitable follow-up data are available. This contribution will connect predictive analysis with interpretable findings and practical research on reducing adverse working conditions and strengthening employee support.

The intended novelty lies in the **integration and evaluation of these components within the present research context**. The study will not claim that feature importance analysis or employee wellbeing interventions are themselves new methods. A wider literature review will refine the originality claim before the final research submission.

## 4. Research Aim

To develop and evaluate an explainable analytical framework that identifies factors associated with employee burnout and turnover intention and supports the prioritization of practical, potentially modifiable workplace conditions for preventive action.

## 5. Research Objectives

1. **Identify influential factors:** Determine which workplace and wellbeing variables consistently contribute to turnover intention predictions and which are associated with reported burnout.
2. **Examine relationships:** Investigate the direction, shape, and combined patterns of these relationships, including differences across sufficiently represented employee groups.
3. **Connect the two outcomes:** Assess how reported burnout relates to turnover intention and whether including burnout improves predictive information beyond other workplace factors.
4. **Identify actionable conditions:** Separate potentially modifiable conditions, such as workload and manager support, from attributes that should not become intervention targets, such as age or gender.
5. **Develop preventive action proposals:** Translate robust findings into a transparent framework for selecting feasible organizational support measures.
6. **Evaluate the framework:** Assess predictive reliability, explanation stability, and practical usefulness; evaluate changes in outcomes through a follow-up study if appropriate data and organizational access become available.

## 6. Research Questions

| No. | Research question |
| --- | --- |
| RQ1 | Which factors are most consistently associated with turnover intention and reported burnout? |
| RQ2 | How do the direction and strength of these relationships vary across factor levels and employee groups? |
| RQ3 | What additional predictive information does reported burnout provide about turnover intention after accounting for other workplace conditions? |
| RQ4 | Which influential conditions are practically modifiable, and what supportive actions could address them? |
| RQ5 | How can the resulting action proposals be evaluated for feasibility and, with follow-up data, changes in employee outcomes? |

## 7. Proposed Conceptual Framework

The research will examine the following proposed relationship:

```text
Workplace demands and available support
                    ↓
Reported employee wellbeing and burnout
                    ↓
             Turnover intention
                    ↓
Identification of potentially actionable conditions
                    ↓
Supportive action proposals and outcome evaluation
```

The arrows represent a **research hypothesis**, not a causal pathway already demonstrated by the available data. Some workplace factors may relate directly to turnover intention as well as through their association with burnout. Establishing temporal pathways or mediation would require an appropriate longitudinal design and explicit causal assumptions.

## 8. Proposed Methodology

### Phase 1: Review and Prepare the Research Data

The study will review the existing paper, notebook, dataset, and saved model to establish a reproducible baseline. Data quality checks will examine inconsistent records, missing values, correlated indicators, and overlapping score/category fields. The source data's limitations and provenance will be documented. The supplied methodological report describes the dataset as synthetic; findings from it will therefore require appropriate real-world validation. [1–3]

New models will be developed separately from the original saved artifact. Any corrections to preprocessing or changes to the predictor set will be documented and evaluated without silently changing the existing baseline.

### Phase 2: Analyze Burnout and Turnover Intention Separately

The analysis will define two distinct outcomes: reported burnout and job-change intention. Models or statistical analyses for each will use clearly documented predictor sets.

When burnout is the outcome, its own score, its directly derived category, and any features containing that score will be excluded from predictors. For turnover intention, analyses with and without burnout indicators will be compared to assess their additional predictive contribution. This comparison will not, by itself, establish that burnout causes turnover intention.

### Phase 3: Explain Influential Factors and Their Patterns

The study will combine descriptive analysis with model explanation techniques. Candidate methods include permutation importance and SHAP-based explanations, selected according to the fitted model and validated against its actual outputs. SHAP provides feature-level explanations of model predictions; its use here will explain model behavior rather than establish real-world causal effects. [4]

The analysis will examine whether important factors show consistent relationships, whether patterns are nonlinear, and whether combinations such as workload and recovery warrant closer investigation. Rankings will be checked across data splits and alternative predictor sets, particularly where indicators overlap. Correlated features and the distinction between observational and intervention-based interpretations will be considered explicitly. [5]

### Phase 4: Prioritize Potentially Modifiable Conditions

Candidate conditions will be assessed using four considerations:

- **Evidence:** How consistent is the association or predictive contribution?
- **Modifiability:** Can an organization realistically influence the condition?
- **Feasibility:** What resources and operational changes would an action require?
- **Employee relevance:** Would the proposed action address a need identified by employees and relevant stakeholders?

Importance alone will not determine priority. A strong predictive variable may be non-actionable, reflect another underlying condition, or be unsuitable as a basis for intervention.

### Phase 5: Develop and Review Supportive Action Proposals

The following are **candidate directions for investigation**, not established findings or proven remedies:

| Condition to investigate | Possible organizational action to review |
| --- | --- |
| Excessive workload or deadline pressure | Review staffing, workload allocation, priorities, and deadline feasibility |
| Limited recovery or work-life balance | Review scheduling, break opportunities, and after-hours expectations |
| Low manager support | Review communication practices, role clarity, and opportunities for regular support |
| Low autonomy or job satisfaction | Explore employee participation, role design, and development opportunities |

HR professionals and employee representatives will be invited to review the relevance and feasibility of shortlisted actions where access is available. Model-based what-if comparisons may help explore scenarios, but changes in predicted scores will not be presented as evidence that an intervention will improve actual wellbeing or retention.

### Phase 6: Evaluate Findings and Proposed Actions

Predictive evaluation will use held-out data that are not reused for model selection or threshold tuning. Turnover intention models will be assessed using metrics appropriate to class imbalance and probability quality, while burnout models will use measures appropriate to the selected outcome definition. Explanation stability and uncertainty will be reported alongside performance.

Practical evaluation will assess whether stakeholders can understand the explanations and use the framework to identify feasible support measures. If longitudinal data and organizational participation are available, a pilot will measure outcomes before and after an action, preferably with a suitable comparison group. Burnout, intention to leave, and any subsequently observed departures will remain separate outcomes.

Without a suitable intervention study, the research will report **prioritized proposals and observed associations**, rather than claim demonstrated reductions in burnout or turnover.

## 9. Expected Research Contributions

| Contribution | Intended addition to the existing study |
| --- | --- |
| Explainable findings | A reproducible account of influential factors, their direction, and the stability of their predictive relationships |
| Analysis of both outcomes | Separate examination of reported burnout and turnover intention, with their relationship assessed explicitly |
| Actionability framework | A documented method for distinguishing important predictors from feasible support targets |
| Prevention-oriented proposals | A prioritized set of organizational actions grounded in findings and stakeholder review |
| Evaluation pathway | A clear distinction between predictive evidence, practical feasibility, and demonstrated intervention outcomes |

The research will not assume that the same factors or actions are equally relevant across all roles, work modes, or organizations.

## 10. Scope and Responsible Interpretation

The initial empirical scope will be the supplied technology-worker research data. Its burnout measure will be treated as a source-reported indicator; it will not be assumed equivalent to the application's separate Copenhagen Burnout Inventory score. Any collection of new questionnaire data will specify the instrument, consent process, and measurement consistency.

Analyses will distinguish prediction, association, and causation throughout. Demographic information may be examined for fairness or differences in model performance, but it will not be treated as a condition employees should change. Any practical evaluation will emphasize voluntary participation, privacy, and supportive organizational decisions rather than punitive employee screening.

## 11. Proposal Summary for Academic Use

> This proposed study will extend employee turnover intention prediction by investigating the workplace and wellbeing factors associated with both burnout and intention to leave. It will use explainable analytical methods to assess influential factors, examine their directional and combined patterns, and distinguish modifiable workplace conditions from non-actionable characteristics. These findings will inform a structured framework for prioritizing feasible organizational support measures. Where suitable follow-up data are available, the research will evaluate whether selected actions are associated with improved employee outcomes. The intended contribution is an integrated approach connecting prediction, explanation, and prevention-oriented decision support, while maintaining a clear distinction between observed associations and demonstrated intervention effects.

## 12. References and Project Sources

1. **Yelmi, Kusrini, and Indra Gunawan (2026).** *Analisis Komparatif Algoritma Tuned Random Forest dan Hist Gradient Boosting untuk Prediksi Niat Pindah Kerja Berdasarkan Indikator Beban Mental Karyawan.* JIIFKOM, 5(2), 7–16. [Supplied journal article](research/725-Article%20Text-3840-2-10-20260625.pdf); [supplied English rendering](research/Comparative%20Analysis%20of%20Tuned%20Random%20Forest%20and%20Hist%20Gradient%20Boosting.pdf). DOI: [10.51901/jiifkom.v5i02.725](https://doi.org/10.51901/jiifkom.v5i02.725).
2. **Existing project artifacts.** [Research notebook](../data/notebooks/Mental_burnut_and_turn_over_latest.ipynb), [source dataset](../data/datasets/mental_health_burnout_tech_2026.csv), and [saved turnover intention model](../data/models/turnover_pipeline.pkl). Supporting interpretation and known limitations: [Project Analysis](PROJECT_ANALYSIS.md).
3. **Supplied methodological report.** *Advanced Machine Learning Architectures for Cost-Sensitive Employee Turnover Prediction: A Comprehensive Analysis and Methodological Blueprint.* [Broad Research for Improving Turnover Prediction Models.pdf](research/Broad%20Research%20for%20Improving%20Turnover%20Prediction%20Models.pdf). Used as project background and a source of proposed research directions; publication metadata is not established here.
4. **Lundberg, S. M., and Lee, S.-I. (2017).** *A Unified Approach to Interpreting Model Predictions.* [Original research paper](https://arxiv.org/abs/1705.07874).
5. **Janzing, D., Minorics, L., and Bloebaum, P. (2020).** *Feature relevance quantification in explainable AI: A causal problem.* Proceedings of AISTATS, PMLR 108, 2907–2916. [Original research paper](https://proceedings.mlr.press/v108/janzing20a.html).
