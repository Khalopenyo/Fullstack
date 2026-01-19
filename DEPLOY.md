# Deploy (VPS + managed Postgres + Nginx)

## 1) Подготовь VPS
- Установи Docker и Docker Compose.
- Открой порт 80 (и 443, если планируешь HTTPS).

## 2) Managed Postgres
- Создай БД в облаке.
- Сохрани строку подключения в формате:
  `postgres://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require`

## 3) Настрой переменные
На VPS в каталоге проекта создай `.env.prod` (или скопируй `deploy/.env.prod.example`):
```
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
JWT_SECRET=change-me
CORS_ORIGINS=https://your-domain.com
PUBLIC_API_URL=https://your-domain.com
```

## 4) Запуск контейнеров
```
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 5) Миграции и сид
Запусти один раз:
```
docker run --rm -it \
  -v "$PWD/backend/migrations:/migrations" \
  postgres:16 \
  psql "${DATABASE_URL}" \
  -f /migrations/001_init.sql

node backend/scripts/seed_perfumes.mjs

docker run --rm -it \
  -v "$PWD/backend/migrations:/migrations" \
  postgres:16 \
  psql "${DATABASE_URL}" \
  -f /migrations/002_seed_perfumes.sql
```

## 6) HTTPS
Самый простой вариант:
- поставить Nginx на VPS (host) и проксировать на контейнер `web:80`,
- выпустить сертификат через certbot.

## 7) CI/CD (GitHub Actions)
Нужные secrets в репозитории:
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY` (private key)
- `VPS_SSH_PORT` (опционально)
- `VPS_APP_PATH` (например `/opt/parfum`)
- `VPS_REPO_URL` (SSH URL репозитория)

Workflow уже в `.github/workflows/deploy.yml`.
