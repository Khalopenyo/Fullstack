# Parfum Backend (Go + PostgreSQL)

## Быстрый старт

1) Запусти Postgres через Docker:

```
docker compose up -d
```

2) Примени миграции:

```
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/001_init.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/003_allow_guest_orders.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/004_add_order_phone.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/005_presets.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/006_preset_groups.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/007_seed_presets_defaults.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/008_refresh_tokens.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/009_stats_daily.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/010_add_stock_qty.sql
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
export COOKIE_SECURE="false"
go run ./cmd/api
```

Если фронт запущен на другом порту (например, 3001) — обнови `CORS_ORIGINS`.

Файлы будут сохраняться в `uploads/` и отдаваться через `/uploads/...`.

## Админ-доступ

Только админ может управлять каталогом, пользователями и заказами. Чтобы назначить админа:

```
PUT /api/users/{id}/admin
Authorization: Bearer <token_admin>
Content-Type: application/json

{"isAdmin": true}
```

Первого админа можно назначить напрямую в БД:

```
UPDATE users SET is_admin = true WHERE email = 'you@example.com';
```

Или через скрипт:

```
DATABASE_URL="postgres://..." ./scripts/set_admin.sh you@example.com true
```
