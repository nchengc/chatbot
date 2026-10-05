# syntax=docker/dockerfile:1.6
# ---- builder ----
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into a prefix we can reuse in the runtime stage
COPY pyproject.toml ./
RUN pip install --upgrade pip \
    && pip install --prefix=/install \
        "fastapi>=0.115.0" \
        "uvicorn[standard]>=0.30.0" \
        "pydantic>=2.7.0" \
        "pydantic-settings>=2.4.0" \
        "python-dotenv>=1.0.1"

# ---- runtime ----
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Copy installed deps from builder
COPY --from=builder /install /usr/local

# Copy app source
COPY app ./app
COPY pyproject.toml ./

# data/ for sqlite (parse 2+)
RUN mkdir -p /app/data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/v1/health', timeout=3).raise_for_status()" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]