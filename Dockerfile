FROM node:22-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json tsconfig.json vite.config.ts ./
COPY frontend ./frontend
RUN npm ci && npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 OMP_NUM_THREADS=2
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY turnover_pipeline.pkl mental_health_burnout_tech_2026.csv Mental_burnut_and_turn_over_latest.ipynb ./
COPY *.pdf *.mp4 ./
COPY --from=frontend /build/dist ./dist
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
