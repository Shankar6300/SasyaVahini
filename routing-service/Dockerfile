FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY routing-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY routing-service/main.py ./main.py
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
