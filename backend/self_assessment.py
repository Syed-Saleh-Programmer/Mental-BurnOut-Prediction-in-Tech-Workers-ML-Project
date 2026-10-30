"""Employee reflection tools, separate from the turnover inference pipeline.

CBI work-related items and scoring: NFA's English PUMA questionnaire.
Free use is permitted with attribution to Borritz et al. (2006).
https://nfa.dk/media/a4wheblj/cbi-scales.pdf
"""
from typing import Annotated

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter(prefix='/api/self-assessment', tags=['Employee self-assessment'])

Answer = Annotated[int, Field(ge=0, le=4, strict=True)]
Rating = Annotated[int, Field(ge=0, le=10, strict=True)]
Sleep = Annotated[float, Field(ge=0, le=24, allow_inf_nan=False)]
Hours = Annotated[float, Field(ge=0, le=168, allow_inf_nan=False)]

DEGREE = ['To a very low degree', 'To a low degree', 'Somewhat', 'To a high degree', 'To a very high degree']
FREQUENCY = ['Never/almost never', 'Seldom', 'Sometimes', 'Often', 'Always']
QUESTIONS = [
    {'id': 'emotional_exhaustion', 'text': 'Is your work emotionally exhausting?', 'label': 'Emotional exhaustion', 'options': DEGREE, 'reverse': False},
    {'id': 'burnt_out', 'text': 'Do you feel burnt out because of your work?', 'label': 'Burnout because of work', 'options': DEGREE, 'reverse': False},
    {'id': 'frustration', 'text': 'Does your work frustrate you?', 'label': 'Frustration with work', 'options': DEGREE, 'reverse': False},
    {'id': 'end_of_day', 'text': 'Do you feel worn out at the end of the working day?', 'label': 'Exhaustion after work', 'options': FREQUENCY, 'reverse': False},
    {'id': 'morning', 'text': 'Are you exhausted in the morning at the thought of another day at work?', 'label': 'Exhaustion before work', 'options': FREQUENCY, 'reverse': False},
    {'id': 'every_hour', 'text': 'Do you feel that every working hour is tiring for you?', 'label': 'Tiring working hours', 'options': FREQUENCY, 'reverse': False},
    {'id': 'energy', 'text': 'Do you have enough energy for family and friends during leisure time?', 'label': 'Lack of energy outside work', 'options': FREQUENCY, 'reverse': True},
]
FACTORS = [
    {'id': 'stress', 'label': 'Stress at work', 'question': 'How stressed do you feel at work?', 'kind': 'rating', 'min': 0, 'max': 10, 'low_label': 'No stress', 'high_label': 'Extreme stress', 'unit': '/ 10', 'description': 'Your own rating of stress at work.'},
    {'id': 'sleep_hours', 'label': 'Sleep', 'question': 'How much sleep do you usually get per night?', 'kind': 'number', 'min': 0, 'max': 24, 'unit': 'hours / night', 'description': 'Your reported average nightly sleep.'},
    {'id': 'work_hours', 'label': 'Workweek', 'question': 'How many hours do you usually work per week?', 'kind': 'number', 'min': 0, 'max': 168, 'unit': 'hours / week', 'description': 'Your reported weekly working hours.'},
    {'id': 'work_life_balance', 'label': 'Work-life balance', 'question': 'How well does work fit with the rest of your life?', 'kind': 'rating', 'min': 0, 'max': 10, 'low_label': 'Very poorly', 'high_label': 'Very well', 'unit': '/ 10', 'description': 'Higher means a better balance in your own assessment.'},
    {'id': 'manager_support', 'label': 'Manager support', 'question': 'How supported do you feel by your manager?', 'kind': 'rating', 'min': 0, 'max': 10, 'low_label': 'Not supported', 'high_label': 'Very supported', 'unit': '/ 10', 'description': 'Higher means more support. Leave blank if this does not apply.'},
    {'id': 'job_satisfaction', 'label': 'Job satisfaction', 'question': 'How satisfied are you with your current job?', 'kind': 'rating', 'min': 0, 'max': 10, 'low_label': 'Not satisfied', 'high_label': 'Very satisfied', 'unit': '/ 10', 'description': 'Higher means greater satisfaction in your own assessment.'},
]
SOURCES = [
    {'title': 'CBI questionnaire and scoring (NFA)', 'url': 'https://nfa.dk/media/a4wheblj/cbi-scales.pdf'},
    {'title': 'CBI use and attribution (NFA)', 'url': 'https://nfa.dk/vaerktoejer/spoergeskemaer/spoergeskema-til-maaling-af-udbraendthed-cbi/copenhagen-burnout-inventory-cbi'},
    {'title': 'Understanding burnout (WHO)', 'url': 'https://www.who.int/standards/classifications/frequently-asked-questions/burn-out-an-occupational-phenomenon'},
    {'title': 'Stress and work (CDC/NIOSH)', 'url': 'https://www.cdc.gov/niosh/topics/mentalhealth/default.html'},
]
ATTRIBUTION = 'Borritz M et al. Burnout among employees in human service work: design and baseline findings of the PUMA study. Scandinavian Journal of Public Health. 2006;34:49–58.'
METHOD = 'Each CBI answer is scored 0, 25, 50, 75, or 100. The energy-for-family-and-friends item is reversed. Your score is the mean of all seven items. Higher scores indicate more reported work-related exhaustion; the score is not a probability or a diagnosis. This app does not assign clinical risk categories.'


class BurnoutAnswers(BaseModel):
    model_config = ConfigDict(extra='forbid')
    emotional_exhaustion: Answer
    burnt_out: Answer
    frustration: Answer
    end_of_day: Answer
    morning: Answer
    every_hour: Answer
    energy: Answer


class WellbeingAnswers(BaseModel):
    model_config = ConfigDict(extra='forbid')
    stress: Rating | None = None
    sleep_hours: Sleep | None = None
    work_hours: Hours | None = None
    work_life_balance: Rating | None = None
    manager_support: Rating | None = None
    job_satisfaction: Rating | None = None


class SelfAssessmentRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    burnout_answers: BurnoutAnswers
    wellbeing: WellbeingAnswers = Field(default_factory=WellbeingAnswers)


class ScenarioRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    current: WellbeingAnswers
    scenario: WellbeingAnswers


@router.post('/scenario')
def explore_scenario(body: ScenarioRequest):
    current, planned = body.current.model_dump(), body.scenario.model_dump()
    comparisons = [{**factor, 'current': current[factor['id']], 'planned': planned[factor['id']],
                    'delta': round(planned[factor['id']] - current[factor['id']], 2)
                    if planned[factor['id']] is not None and current[factor['id']] is not None else None}
                   for factor in FACTORS]
    prompts = []
    if planned['work_hours'] is not None:
        prompts.append({'title': 'Make your workload target concrete', 'text': f"You chose a {planned['work_hours']:g}-hour workweek. What priorities, staffing, or after-hours expectations would need to change to make this feasible?"})
    if planned['sleep_hours'] is not None:
        prompts.append({'title': 'Plan time for recovery', 'text': f"You chose {planned['sleep_hours']:g} hours of nightly sleep. Consider which work or evening commitments affect the time you can set aside."})
    if planned['manager_support'] is not None or planned['work_life_balance'] is not None:
        prompts.append({'title': 'Turn a target into a conversation', 'text': 'Choose one specific request or boundary to discuss, such as clearer priorities, a regular check-in, or agreed hours of availability.'})
    if not prompts:
        prompts.append({'title': 'Choose one change to explore', 'text': 'Set a target that matters to you, then consider what support or practical changes it would require.'})
    return {'comparisons': comparisons, 'suggestions': prompts,
            'method': 'Scenario values are targets you selected. Differences compare your entries; they are not predicted health outcomes. Your measured CBI score is unchanged. This tool does not forecast future burnout.'}


@router.get('')
def questionnaire():
    return {'version': 'cbi-work-v1', 'questions': QUESTIONS, 'factors': FACTORS, 'sources': SOURCES, 'attribution': ATTRIBUTION, 'method': METHOD}


@router.post('')
def assess(body: SelfAssessmentRequest):
    answers = body.burnout_answers.model_dump()
    items = []
    for question in QUESTIONS:
        answer = answers[question['id']]
        points = (4 - answer if question['reverse'] else answer) * 25
        items.append({'id': question['id'], 'label': question['label'], 'question': question['text'], 'answer': question['options'][answer], 'points': points, 'reverse_scored': question['reverse']})
    values = body.wellbeing.model_dump()
    factors = [{**factor, 'value': values[factor['id']]} for factor in FACTORS]
    suggestions = []

    def add(title, text):
        suggestions.append({'title': title, 'text': text})

    # These are conversation prompts, not medical thresholds or validated risk bands.
    if any(item['points'] >= 75 for item in items):
        add('Talk about the strain you described', 'Some exhaustion responses are at the upper end of the scale. Consider talking with someone you trust, an occupational health service, or a qualified health professional if this is persistent or affecting daily life.')
    if values['stress'] is not None and values['stress'] >= 7:
        add('Name the main source of stress', f"You rated work stress {values['stress']}/10. Identify one demand, deadline, or uncertainty you would like help addressing.")
    if values['sleep_hours'] is not None and values['sleep_hours'] < 7:
        add('Make room for rest', f"You reported {values['sleep_hours']:g} hours of sleep per night. Consider whether work schedules or after-hours demands are limiting time for rest. Seek qualified advice for ongoing sleep difficulties.")
    if values['work_hours'] is not None and values['work_hours'] > 40:
        add('Review your working time', f"You reported a {values['work_hours']:g}-hour workweek. Consider discussing priorities, breaks, and after-hours expectations with your manager.")
    if values['work_life_balance'] is not None and values['work_life_balance'] <= 4:
        add('Protect time outside work', f"You rated work-life balance {values['work_life_balance']}/10. Pick one boundary or scheduling change you would like to explore.")
    if values['manager_support'] is not None and values['manager_support'] <= 4:
        add('Find a workable source of support', f"You rated manager support {values['manager_support']}/10. Consider a specific request, such as clearer priorities or a regular check-in. A trusted colleague or employee support service may also help.")
    if values['job_satisfaction'] is not None and values['job_satisfaction'] <= 4:
        add('Reflect on what would improve your work', f"You rated job satisfaction {values['job_satisfaction']}/10. Write down one aspect of your role you would like to change and one you would like to keep.")
    if not suggestions:
        add('Notice what helps you recover', 'Consider which routines, boundaries, and sources of support are working for you. A lower score does not rule out difficulties; revisit this check-in if your experience changes.')
    return {
        'version': 'cbi-work-v1',
        'burnout': {'instrument': 'Copenhagen Burnout Inventory: work-related burnout', 'score': round(sum(item['points'] for item in items) / 7, 2), 'scale_max': 100, 'items': items},
        'factors': factors,
        'suggestions': suggestions,
        'method': METHOD,
        'suggestion_method': 'Suggestions use simple reflection rules: CBI item scores of 75+, stress of 7+, sleep below 7 hours, a workweek above 40 hours, or balance/support/satisfaction ratings of 4 or below. These are prompts to reflect, not clinical cutoffs, legal limits, or predicted outcomes.',
        'attribution': ATTRIBUTION, 'sources': SOURCES,
        'privacy': 'Answers are processed in memory and are not saved by this application.',
    }
