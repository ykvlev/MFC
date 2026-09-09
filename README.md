# Единое окно студента

Информационная система единой точки входа для студенческих заявлений: один движок
заявок с конфигурируемыми типами, модули ячеек выдачи и бронирования мест.

- **Бэкенд** (`apps/api`) — NestJS + Prisma + PostgreSQL, реализуется строго по
  `TZ_full_edinoe_okno.md`.
- **Мобильные клиенты** (`clients/ios`, `clients/android`) — SwiftUI и Jetpack Compose,
  все 4 роли, публикация в App Store / Google Play.
- **Десктоп** (`clients/desktop`) — Tauri 2 + React для сотрудников, администраторов и
  преподавателей.
- **Общий код** (`packages/shared`) — TS-типы, Zod-схемы `fields_schema`, статусная
  машина, матрица прав. Источник правды для всех клиентов и бэкенда.

План работ: `docs/plan.md` (копия одобренного плана).

## Быстрый старт (бэкенд)

```bash
pnpm install
cp .env.example .env          # заполнить JWT_*_SECRET и SEED_ADMIN_PASSWORD
docker compose up -d          # postgres, redis, minio
pnpm --filter @edinoe-okno/api prisma:migrate --name init
pnpm --filter @edinoe-okno/api prisma:seed
pnpm dev:api                  # http://localhost:3000/api/v1 · Swagger /api/v1/docs
```

После генерации первой миграции — доработать её вручную по
`apps/api/prisma/migrations/README.md` (частичные индексы, GIN, CHECK,
неизменяемость `event_log`).

## Статус (бэкенд)

| Этап ТЗ | Готово | Что |
|---|---|---|
| 0 | ✅ | Монорепо, docker-compose (PG/Redis/MinIO), CI, `.env` + валидация при старте |
| 1 | ✅ | Prisma-схема (§4), seed (§14), auth (JWT access+refresh, argon2id, ротация), `JwtAuthGuard`/`RolesGuard`/`ApplicationAccessGuard`, users + импорт CSV, `event_log` |
| 2 | ✅ | `application_types`: CRUD, `fields_schema`/`access_rule` (Zod), `access-rule.evaluator` + тесты, `PUT /:id/route` |
| 3 | ⏳ | Движок заявок: подача, этапы, статусная машина, маршруты |
| 4–10 | ⏳ | Файлы, ячейки, брони, уведомления, PDF, реестр, аналитика, пуши |

Проверено: `tsc --noEmit` и `nest build` зелёные; юнит-тесты `packages/shared` (9) и
`api` (5) проходят. Запуск против БД — после установки Docker (`docker compose up`).

Клиенты (iOS/Android/десктоп) — после готовности бэкенда, на машинах с нужным SDK.

Дальше по `docs/plan.md` → «Порядок работ».
