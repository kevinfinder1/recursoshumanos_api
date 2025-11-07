FROM python:3.11-slim-bullseye

WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias de Python (psycopg2-binary no necesita compilación)
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código
COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]