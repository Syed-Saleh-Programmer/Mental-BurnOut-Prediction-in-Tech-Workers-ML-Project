import io

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture(scope='module')
def client():
    with TestClient(app) as instance:
        yield instance


@pytest.fixture
def profile(client):
    return client.get('/api/schema').json()['defaults'].copy()


def test_health_and_schema(client):
    health = client.get('/api/health')
    assert health.status_code == 200
    assert health.json()['dataset_rows'] == 100000
    schema = client.get('/api/schema').json()
    assert len(schema['fields']) == 35
    assert len(schema['defaults']) == 35
    assert 0 < schema['threshold'] < 0.5


def test_overview_matches_source_not_model_predictions(client):
    overview = client.get('/api/overview').json()
    source = app.state.service.df
    assert overview['count'] == len(source)
    assert overview['leave_count'] == int(source.job_change_intention.sum())
    assert sum(r['count'] for r in overview['burnout_distribution']) == len(source)
    assert overview['turnover_rate'] == round(source.job_change_intention.mean(), 3)


def test_combined_cohort_filters_match_dataframe(client):
    response = client.get('/api/overview?work_mode=Remote&country=India&job_role=Software%20Engineer')
    source = app.state.service.df
    expected = source[(source.work_mode == 'Remote') & (source.country == 'India') & (source.job_role == 'Software Engineer')]
    assert response.status_code == 200
    assert response.json()['count'] == len(expected)
    assert response.json()['leave_count'] == int(expected.job_change_intention.sum())


def test_unknown_cohort_rejected(client):
    assert client.get('/api/overview?country=Unknown').status_code == 422


def test_prediction_matches_original_pipeline_and_engineering(client):
    service = app.state.service
    source = service.df.head(5).drop(columns='job_change_intention')
    # Independent reconstruction of the notebook's exact inference features.
    original = source.copy()
    original['work_hours_to_sleep_ratio'] = original.work_hours_per_week / (original.sleep_hours_per_night * 7 + 1e-5)
    original['total_mental_load'] = original.stress_score
    expected = service.pipeline.predict_proba(original[service.artifact['expected_columns']])[:, 1]
    response = client.post('/api/predict', json={'records': source.to_dict('records')})
    assert response.status_code == 200, response.text
    actual = response.json()['predictions']
    np.testing.assert_allclose([r['probability'] for r in actual], expected, atol=1e-8)
    assert [r['prediction'] for r in actual] == (expected >= service.threshold).astype(int).tolist()
    assert all(r['threshold'] == service.threshold for r in actual)


@pytest.mark.parametrize('field,value', [('sleep_hours_per_night', 0), ('age', -1), ('stress_score', 11), ('therapy_access', 2), ('employee_id', 0), ('country', 'Moon'), ('age', 30.5), ('stress_score', None)])
def test_invalid_profile_is_rejected(client, profile, field, value):
    profile[field] = value
    response = client.post('/api/predict', json={'records': [profile]})
    assert response.status_code == 422


def test_missing_and_extra_features_are_rejected(client, profile):
    del profile['sleep_hours_per_night']
    assert client.post('/api/predict', json={'records': [profile]}).status_code == 422
    profile['sleep_hours_per_night'] = 7
    profile['made_up_field'] = 1
    assert client.post('/api/predict', json={'records': [profile]}).status_code == 422


def test_empty_batch_is_rejected(client):
    assert client.post('/api/predict', json={'records': []}).status_code == 422


def test_json_batch_limit(client, profile):
    assert client.post('/api/predict', json={'records': [profile] * 501}).status_code == 422


def test_template_roundtrip_and_batch_agree_with_json(client):
    template = client.get('/api/template.csv')
    assert template.status_code == 200
    assert 'attachment' in template.headers['content-disposition']
    csv_result = client.post('/api/predict/csv', files={'file': ('profiles.csv', template.content, 'text/csv')})
    assert csv_result.status_code == 200, csv_result.text
    record = pd.read_csv(io.BytesIO(template.content)).to_dict('records')
    json_result = client.post('/api/predict', json={'records': record})
    assert csv_result.json()['predictions'] == json_result.json()['predictions']


def test_original_csv_target_is_ignored_at_inference(client):
    source = app.state.service.df.head(3)
    response = client.post('/api/predict/csv', files={'file': ('source.csv', source.to_csv(index=False), 'text/csv')})
    assert response.status_code == 200
    assert response.json()['count'] == 3


@pytest.mark.parametrize('filename,content', [('test.txt', 'hello'), ('test.csv', ''), ('test.csv', 'age\n30'), ('test.csv', 'age,age\n20,30'), ('test.csv', b'\xff\xfe\xfd')])
def test_invalid_csv_returns_actionable_error(client, filename, content):
    response = client.post('/api/predict/csv', files={'file': (filename, content)})
    assert response.status_code == 422, response.text
    assert 'detail' in response.json()


def test_large_csv_is_rejected(client):
    response = client.post('/api/predict/csv', files={'file': ('big.csv', b'x' * (10 * 1024 * 1024 + 1))})
    assert response.status_code == 413


def test_export_respects_cohort(client):
    response = client.get('/api/export.csv?country=Canada&work_mode=Hybrid')
    exported = pd.read_csv(io.StringIO(response.text))
    assert len(exported) > 0
    assert set(exported.country) == {'Canada'}
    assert set(exported.work_mode) == {'Hybrid'}


def test_records_search_sort_pagination_and_profile(client):
    response = client.get('/api/records?search=India&page=2&page_size=7&sort_by=stress_score&direction=desc')
    assert response.status_code == 200
    records = response.json()['records']
    assert len(records) == 7
    assert all(r['country'] == 'India' for r in records)
    assert records[0]['stress_score'] >= records[-1]['stress_score']
    profile = client.get(f"/api/records/{records[0]['employee_id']}").json()
    assert len(profile) == 35
    assert 'job_change_intention' not in profile
    assert client.get('/api/records/0').status_code == 404
    assert client.get('/api/records?page=0').status_code == 422
    assert client.get('/api/records?sort_by=unknown').status_code == 422


def test_research_reads_six_actual_notebook_results(client):
    response = client.get('/api/research')
    assert response.status_code == 200
    data = response.json()
    assert len(data['models']) == 6
    selected = next(m for m in data['models'] if m['selected'])
    assert selected['f1'] == 53.99
    assert selected['auc'] == 0.6859
    assert len(data['files']) == 7
    assert len(data['model_sha256']) == 64


def test_resource_access_is_allowlisted(client):
    research = client.get('/api/research').json()
    paper = next(f for f in research['files'] if f['kind'] == 'PDF')
    assert client.get(paper['url']).headers['content-type'] == 'application/pdf'
    assert client.get('/resources/turnover_pipeline.pkl').status_code == 404
    assert client.get('/resources/requirements.txt').status_code == 404


def test_api_responses_are_not_cached(client):
    response = client.get('/api/health')
    assert response.headers['cache-control'] == 'no-store'
    assert response.headers['x-content-type-options'] == 'nosniff'


def burnout_answers(value=2, energy=2):
    return dict(emotional_exhaustion=value, burnt_out=value, frustration=value, end_of_day=value, morning=value, every_hour=value, energy=energy)


@pytest.mark.parametrize('answer,energy,expected', [(0, 4, 0), (4, 0, 100), (2, 2, 50), (3, 1, 75)])
def test_cbi_scale_endpoints_and_reverse_scoring(client, answer, energy, expected):
    response = client.post('/api/self-assessment', json={'burnout_answers': burnout_answers(answer, energy)})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['burnout']['score'] == expected
    assert result['burnout']['items'][-1]['points'] == (4 - energy) * 25
    assert result['burnout']['items'][-1]['reverse_scored'] is True
    assert result['burnout']['scale_max'] == 100


def test_cbi_mixed_answers_are_averaged_without_risk_categories(client):
    answers = dict(zip(burnout_answers(), [0, 1, 2, 3, 4, 0, 3]))
    result = client.post('/api/self-assessment', json={'burnout_answers': answers}).json()
    assert result['burnout']['score'] == 39.29
    assert [item['points'] for item in result['burnout']['items']] == [0, 25, 50, 75, 100, 0, 25]
    assert 'risk_level' not in result['burnout']
    assert 'prediction' not in result
    assert 'probability' not in result


@pytest.mark.parametrize('invalid', [-1, 5, 1.5, True, '2', None])
def test_cbi_rejects_invalid_answer_values(client, invalid):
    answers = burnout_answers()
    answers['energy'] = invalid
    assert client.post('/api/self-assessment', json={'burnout_answers': answers}).status_code == 422


def test_self_assessment_requires_complete_cbi_and_rejects_identifiers(client):
    answers = burnout_answers()
    del answers['morning']
    assert client.post('/api/self-assessment', json={'burnout_answers': answers}).status_code == 422
    assert client.post('/api/self-assessment', json={'burnout_answers': burnout_answers(), 'employee_id': 123}).status_code == 422
    assert client.post('/api/self-assessment', json={'burnout_answers': {**burnout_answers(), 'extra': 0}}).status_code == 422


@pytest.mark.parametrize('field,value', [('sleep_hours', -1), ('sleep_hours', 25), ('sleep_hours', 'NaN'), ('work_hours', 169), ('stress', 11), ('manager_support', True), ('job_satisfaction', 2.2)])
def test_self_assessment_validates_optional_factors(client, field, value):
    response = client.post('/api/self-assessment', json={'burnout_answers': burnout_answers(), 'wellbeing': {field: value}})
    assert response.status_code == 422


def test_self_assessment_optional_blank_and_zero_are_distinct(client):
    result = client.post('/api/self-assessment', json={'burnout_answers': burnout_answers(0, 4), 'wellbeing': {'stress': 0, 'sleep_hours': 0, 'manager_support': None}}).json()
    factors = {f['id']: f['value'] for f in result['factors']}
    assert factors['stress'] == 0
    assert factors['sleep_hours'] == 0
    assert factors['manager_support'] is None
    assert factors['work_hours'] is None
    assert any(s['title'] == 'Make room for rest' for s in result['suggestions'])
    assert not any(s['title'] == 'Name the main source of stress' for s in result['suggestions'])


def test_self_assessment_does_not_call_turnover_model(client, monkeypatch):
    def unexpected_predict(*args, **kwargs):
        raise AssertionError('Self-assessment must not infer missing turnover-model fields')
    monkeypatch.setattr(app.state.service, 'predict', unexpected_predict)
    response = client.post('/api/self-assessment', json={'burnout_answers': burnout_answers(0, 4)})
    assert response.status_code == 200
    assert all(f['value'] is None for f in response.json()['factors'])


def test_employee_questionnaire_has_source_attribution_and_no_prefilled_answers(client):
    response = client.get('/api/self-assessment')
    assert response.status_code == 200
    data = response.json()
    assert len(data['questions']) == 7
    assert len(data['factors']) == 6
    assert 'Borritz' in data['attribution']
    assert data['sources'][0]['url'] == 'https://nfa.dk/media/a4wheblj/cbi-scales.pdf'
    assert 'defaults' not in data
    assert data['questions'][-1]['reverse'] is True
    assert response.headers['cache-control'] == 'no-store'
