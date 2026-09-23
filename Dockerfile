# Build the React application.
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Run FastAPI and serve the compiled frontend from the same public origin.
FROM python:3.12-slim AS application
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIST=/app/frontend_dist \
    DATABASE_URL=sqlite:////app/backend/data/aquasentinel.db

WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
RUN mkdir -p data \
    && python ml/generate_demo_data.py \
    && python ml/train_model.py \
    && python seed_data.py

COPY --from=frontend-build /app/frontend/dist /app/frontend_dist
EXPOSE 10000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
