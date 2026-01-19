# Parfum Backend (Go + PostgreSQL)

## Быстрый старт

1) Запусти Postgres через Docker:

```
docker compose up -d
```

2) Примени миграции:

```
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/001_init.sql
```

3) Сгенерируй сид и загрузи каталог:

```
node scripts/seed_perfumes.mjs
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/002_seed_perfumes.sql
```

4) Запусти API:

```
export DATABASE_URL="postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable"
export JWT_SECRET="change-me"
export CORS_ORIGINS="http://localhost:3000"

go run ./cmd/api
```

Файлы будут сохраняться в `uploads/` и отдаваться через `/uploads/...`.
