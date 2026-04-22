# Backend Dockerfile - FastAPI
FROM python:3.11-slim

WORKDIR /app

# Kopiuj wymagania i instaluj zależności
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiuj kod aplikacji
COPY . .

# Eksponuj port
EXPOSE 8000

# Uruchom aplikację
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
