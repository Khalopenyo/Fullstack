# Parfum

Веб‑магазин парфюмов: фронтенд на React (CRA), бэкенд на Go + PostgreSQL.

## Быстрый старт (локально)

### 1) База и API (терминал #1)

```
cd backend
cp .env.example .env

docker compose up -d

psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/001_init.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/003_allow_guest_orders.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/004_add_order_phone.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/005_presets.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/006_preset_groups.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/007_seed_presets_defaults.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/008_refresh_tokens.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/009_stats_daily.sql
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/010_add_stock_qty.sql

node scripts/seed_perfumes.mjs
psql "postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable" -f migrations/002_seed_perfumes.sql

export DATABASE_URL="postgres://parfum:parfum@localhost:5432/parfum?sslmode=disable"
export JWT_SECRET="change-me"
export CORS_ORIGINS="http://localhost:3000"
go run ./cmd/api
```

### 2) Фронтенд (терминал #2)

```
cd ..
cp .env.example .env.local
npm install
npm start
```

Открой `http://localhost:3000`.

Если фронт запустился на 3001, обнови CORS для API:
```
export CORS_ORIGINS="http://localhost:3001"
```

## Переменные окружения

Фронтенд (`.env.local`):
- `REACT_APP_API_URL=http://localhost:8080`

Бэкенд (`backend/.env`):
- `ADDR=:8080`
- `DATABASE_URL=postgres://...`
- `JWT_SECRET=change-me`
- `UPLOAD_DIR=./uploads`
- `CORS_ORIGINS=http://localhost:3000`
- `COOKIE_SECURE=false`

## Админ‑доступ

Назначение админа делается через защищенный endpoint:

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
DATABASE_URL="postgres://..." ./backend/scripts/set_admin.sh you@example.com true
```

## Деплой

Смотри `DEPLOY.md`.




Ниже — аудит проекта в формате code‑review: сначала проблемы (по серьёзности), потом вопросы/предположения и список того, чего не хватает для «полноценного магазина».

Критические / безопасность

JWT хранится в localStorage → риск XSS‑кражи токена. Любой XSS даёт полный доступ к аккаунту/админке. Файл: api.js. Рекомендация: httpOnly cookie + CSRF‑токен или хотя бы storage‑in‑memory + refresh.
Нет механизма отзыва токенов / сессий. Токен живёт 7 дней, и если украден — не отозвать. Файл: server.go. Нужен refresh‑token + blacklist/rotation.
Нет подтверждения email и восстановления пароля. Аккаунт без верификации легко перехватывается/ошибочно указан. Файлы: handlers.go (register/login), AuthPage.js.
Высокий приоритет (стабильность/масштаб)

Список товаров/заказов/пользователей без пагинации. При росте базы админка и каталог будут тормозить. Файлы: handlers.go (list endpoints), AdminPage.js, CatalogPage.js.
Статистика /api/stats без защиты от злоупотреблений кроме простого rate‑limit по IP. Можно спамить события и раздувать таблицу. Файл: handlers.go.
Uploads без ресайза/сжатия. Большие изображения будут грузиться медленно, а CDN не используется. Файл: server.go (upload).
Средний приоритет (бизнес‑логика)

Нет управления складом/остатками. Есть только inStock, но нет количества, резервирования и списания. Файлы: handlers.go (orders/perfumes), схема 001_init.sql.
Нет оплаты/статуса оплаты. Заказы создаются без платежной логики, нет «оплачен / не оплачен / отменён». Файл: handlers.go (orders).
Нет уведомлений (email/Telegram) о новом заказе. Сейчас админ узнаёт только в админке. Файлы: handlers.go.
Отсутствует логирование и аудит действий админки. Кто редактировал товар/заказ не фиксируется.
Низкий приоритет / UX

Структурные данные (schema.org) с example.com. Нужно заменить на реальный домен перед продом. Файл: index.html.
Слабые правила пароля. Минимум 6 символов, без сложности. Файл: handlers.go.
Что обычно нужно для «полноценного интернет‑магазина»

Платёжная система (ЮKassa/CloudPayments/Stripe).
Статусы оплаты, подтверждение, webhooks.
Склад и остатки
Количество, резерв, списание, отчёт по складу.
Доставка
Стоимость, зона доставки, самовывоз, статус доставки.
Уведомления
Email/Telegram админке и клиенту.
Аккаунт клиента
История заказов, повтор заказа, профиль.
Верификация/сброс пароля
Email‑ссылка + токены.
Политика конфиденциальности и оферта
Требуется для оплаты и маркетинга.
SEO/маркетинг
Реальный домен в schema.org, актуальный sitemap, микроразметка товара.
Мониторинг и бэкапы
Логи, алерты, регулярные бэкапы Postgres.

cd /opt/parfum/Fullstack
docker-compose -f docker-compose.prod.yml --env-file .env.prod rm -fsv db
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d db
