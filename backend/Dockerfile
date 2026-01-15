# Wellsafer Backend Dockerfile
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    libmariadb-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 환경 변수
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# 포트 노출
EXPOSE 5000

# 실행
CMD ["python", "-m", "gunicorn", "--worker-class", "eventlet", "-w", "1", "-b", "0.0.0.0:5000", "main:app"]
