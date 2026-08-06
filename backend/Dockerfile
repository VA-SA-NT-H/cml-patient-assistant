FROM python:3.12

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir --default-timeout=1000 --retries 10 -r requirements.txt || \
    pip install --no-cache-dir --default-timeout=1000 --retries 10 -r requirements.txt || \
    pip install --no-cache-dir --default-timeout=1000 --retries 10 -r requirements.txt

RUN mkdir -p /app/data

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]