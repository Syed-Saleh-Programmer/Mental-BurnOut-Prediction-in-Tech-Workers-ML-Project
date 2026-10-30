from __future__ import annotations

import io
import asyncio
import logging
import os
from contextlib import asynccontextmanager, suppress
from typing import Annotated

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from starlette.concurrency import run_in_threadpool

from backend.service import DATA_FILE, ROOT, ProjectService
from backend.paths import FRONTEND_DIR, RESOURCE_PATHS
from backend.self_assessment import router as self_assessment_router
from backend.hr import router as hr_router, TemporaryStore

logger = logging.getLogger('workwell')


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.service = ProjectService()
    app.state.hr_store = TemporaryStore()
    async def cleanup():
        while True:
            await asyncio.sleep(60)
            app.state.hr_store.cleanup()
    task = asyncio.create_task(cleanup())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        app.state.hr_store.items.clear()


app = FastAPI(title='Workwell People Analytics API', version='1.0.0', lifespan=lifespan,
              description='Dataset analytics and calibrated job-change intention predictions using the supplied research model.')


def configure_cors(application: FastAPI):
    """Allow explicitly configured frontend origins for a separately hosted API."""
    origins = [value.strip().rstrip('/') for value in os.environ.get('WORKWELL_ALLOWED_ORIGINS', '').split(',') if value.strip()]
    if origins:
        application.add_middleware(CORSMiddleware, allow_origins=origins,
                                   allow_methods=['GET', 'POST', 'DELETE'], allow_headers=['Content-Type'])


configure_cors(app)
app.include_router(self_assessment_router)
app.include_router(hr_router)


@app.middleware('http')
async def response_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'same-origin'
    if request.url.path.startswith('/api'):
        response.headers['Cache-Control'] = 'no-store'
    return response


@app.exception_handler(Exception)
async def handle_unexpected(request, exc):
    logger.exception('Request failed: %s', request.url.path)
    return JSONResponse(status_code=500, content={'detail': 'The request could not be completed. Check the server logs and retry.'})


def service() -> ProjectService:
    return app.state.service


def filters(work_mode: str | None = None, country: str | None = None, job_role: str | None = None):
    for column, value in [('work_mode', work_mode), ('country', country), ('job_role', job_role)]:
        if value and value not in set(service().df[column]):
            raise HTTPException(422, detail=f'Unknown {column}: {value}')
    return service().cohort(work_mode, country, job_role)


@app.get('/api/health')
def health():
    s = service()
    return {'status': 'ready', 'model_loaded': True, 'model_name': s.artifact['model_name'], 'dataset_rows': len(s.df)}


@app.get('/api/schema')
def schema():
    s = service()
    return {'fields': s.fields, 'defaults': s.defaults, 'threshold': s.threshold, 'json_schema': s.Record.model_json_schema(), 'categories': {f['name']: f['options'] for f in s.fields if f['kind'] == 'category'}}


@app.get('/api/overview')
def overview(work_mode: str | None = None, country: str | None = None, job_role: str | None = None):
    return service().analytics(filters(work_mode, country, job_role))


@app.get('/api/records')
def records(work_mode: str | None = None, country: str | None = None, job_role: str | None = None,
            page: Annotated[int, Query(ge=1)] = 1, page_size: Annotated[int, Query(ge=1, le=100)] = 10,
            search: Annotated[str, Query(max_length=100)] = '',
            sort_by: str = 'employee_id', direction: str = 'asc'):
    data = filters(work_mode, country, job_role)
    allowed = ['employee_id', 'job_role', 'country', 'work_mode', 'stress_score', 'burnout_score', 'burnout_level', 'job_change_intention']
    if sort_by not in allowed or direction not in ['asc', 'desc']:
        raise HTTPException(422, detail='Invalid sort field or direction.')
    if search:
        mask = data.employee_id.astype(str).str.contains(search, regex=False)
        for c in ['job_role', 'country', 'work_mode', 'burnout_level']:
            mask |= data[c].str.contains(search, case=False, regex=False)
        data = data[mask]
    data = data.sort_values(sort_by, ascending=direction == 'asc', kind='stable')
    selected = data.iloc[(page-1)*page_size:page*page_size][allowed]
    return {'count': len(data), 'page': page, 'page_size': page_size, 'records': selected.to_dict(orient='records')}


@app.get('/api/records/{employee_id}')
def record(employee_id: int):
    data = service().df[service().df.employee_id == employee_id]
    if data.empty:
        raise HTTPException(404, detail='Reference ID not found.')
    return data.iloc[0][service().raw_columns].to_dict()


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    records: list[dict] = Field(min_length=1, max_length=500)


@app.post('/api/predict')
def predict(body: PredictionRequest):
    return service().predict(body.records)


MAX_UPLOAD = 10 * 1024 * 1024
MAX_BATCH = 5000


@app.post('/api/predict/csv')
async def predict_csv(file: Annotated[UploadFile, File()]):
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(422, detail='Upload a CSV file.')
    try:
        content = await file.read(MAX_UPLOAD + 1)
    finally:
        await file.close()
    if len(content) > MAX_UPLOAD:
        raise HTTPException(413, detail='CSV files must be 10 MB or smaller.')
    try:
        # Read only the bounded number of rows, reject duplicate/missing headers.
        import csv
        decoded = content.decode('utf-8-sig')
        header = next(csv.reader(io.StringIO(decoded)), [])
        if len(header) != len(set(header)):
            raise HTTPException(422, detail='CSV column names must be unique.')
        data = pd.read_csv(io.StringIO(decoded), nrows=MAX_BATCH+1)
    except (UnicodeError, pd.errors.ParserError, pd.errors.EmptyDataError, ValueError) as exc:
        raise HTTPException(422, detail='The CSV could not be read. Use a UTF-8 CSV with a header row.') from exc
    if len(data) == 0 or len(data) > MAX_BATCH:
        raise HTTPException(422, detail=f'Upload between 1 and {MAX_BATCH:,} rows.')
    missing = sorted(set(service().raw_columns) - set(data.columns))
    if missing:
        raise HTTPException(422, detail=f"Missing required columns: {', '.join(missing)}. Download the template for the expected format.")
    allowed = set(service().raw_columns) | {'job_change_intention', 'work_hours_to_sleep_ratio', 'total_mental_load'}
    extra = sorted(set(data.columns) - allowed)
    if extra:
        raise HTTPException(422, detail=f"Unexpected columns: {', '.join(extra)}.")
    result = await run_in_threadpool(service().predict, data[service().raw_columns].to_dict(orient='records'))
    result['filename'] = file.filename
    return result


@app.get('/api/template.csv')
def template():
    return csv_response(pd.DataFrame([service().defaults]), 'workwell-prediction-template.csv')


def csv_response(data: pd.DataFrame, filename: str):
    # Escape spreadsheet formula prefixes in text columns exported from the source.
    data = data.copy()
    for c in data.select_dtypes('object'):
        data[c] = data[c].map(lambda x: "'" + x if isinstance(x, str) and x.startswith(('=', '+', '-', '@', '\t', '\r')) else x)
    return Response(data.to_csv(index=False), media_type='text/csv', headers={'Content-Disposition': f'attachment; filename="{filename}"'})


@app.get('/api/export.csv')
def export(work_mode: str | None = None, country: str | None = None, job_role: str | None = None):
    return csv_response(filters(work_mode, country, job_role), 'workwell-cohort.csv')


@app.get('/api/research')
def research():
    return service().research()


RESOURCE_FILES = RESOURCE_PATHS


@app.get('/resources/{filename}')
def resource(filename: str):
    if filename not in RESOURCE_FILES:
        raise HTTPException(404, detail='Resource not found.')
    return FileResponse(RESOURCE_FILES[filename])


# Production serves the React build and API on the same origin.
if (FRONTEND_DIR / 'dist' / 'assets').exists():
    app.mount('/assets', StaticFiles(directory=FRONTEND_DIR / 'dist' / 'assets'), name='assets')


@app.get('/', include_in_schema=False)
@app.get('/hr', include_in_schema=False)
@app.get('/hr/{ui_path:path}', include_in_schema=False)
@app.get('/individual', include_in_schema=False)
@app.get('/individual/{ui_path:path}', include_in_schema=False)
def frontend():
    path = FRONTEND_DIR / 'dist' / 'index.html'
    if not path.exists():
        return JSONResponse(status_code=503, content={'detail': 'Frontend not built. Run npm --prefix frontend ci and npm --prefix frontend run build, then restart the server. The API is available at /docs.'})
    return FileResponse(path)
