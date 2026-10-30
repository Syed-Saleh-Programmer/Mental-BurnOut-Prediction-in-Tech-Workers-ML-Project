"""Exercise the cross-origin boundary used by a separately hosted Pages frontend."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.main import configure_cors


def test_configured_pages_origin_can_submit_json_and_delete(monkeypatch):
    monkeypatch.setenv('WORKWELL_ALLOWED_ORIGINS', ' https://example.github.io/, https://workwell.example.org ')
    app = FastAPI()
    configure_cors(app)
    with TestClient(app) as client:
        for method in ['POST', 'DELETE']:
            response = client.options('/api/self-assessment', headers={
                'Origin': 'https://example.github.io',
                'Access-Control-Request-Method': method,
                'Access-Control-Request-Headers': 'content-type',
            })
            assert response.status_code == 200
            assert response.headers['access-control-allow-origin'] == 'https://example.github.io'
            assert 'access-control-allow-credentials' not in response.headers
        denied = client.options('/api/self-assessment', headers={
            'Origin': 'https://unrelated.example.org', 'Access-Control-Request-Method': 'POST',
        })
        assert denied.status_code == 400
        assert 'access-control-allow-origin' not in denied.headers


def test_default_server_does_not_allow_cross_origin_requests(monkeypatch):
    monkeypatch.delenv('WORKWELL_ALLOWED_ORIGINS', raising=False)
    app = FastAPI()
    configure_cors(app)
    with TestClient(app) as client:
        response = client.options('/api/self-assessment', headers={
            'Origin': 'https://example.github.io', 'Access-Control-Request-Method': 'POST',
        })
        assert 'access-control-allow-origin' not in response.headers
