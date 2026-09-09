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
| 3 | ✅ | Движок: подача, `materialize` этапов, авто-этапы, статусная машина + тесты, согласование/возврат/отклонение, `resubmit` без пересогласования, подтверждение подписи, отмена, история; каждый переход — одна транзакция с журналом + уведомлением |
| 4 | ✅ | Файлы: S3(MinIO)/Local через DI, расширение + магические байты + тесты, лимит размера, отдача через контроллер |
| 5 | ✅ | Ячейки: `FOR UPDATE SKIP LOCKED`, `pickup_code`, TTL, `CellLockDriver`/`ManualLockDriver`, `/issue`, `/open` |
| 6 | ✅ | Брони: `FOR UPDATE` периода, квота/`WAITLIST`, `promoteNext` + пересчёт позиций + тесты, запрет пересечений |
| 7 | ✅ | Уведомления IN_APP + PUSH-канал (заглушка APNs/FCM), cron `expired-cells`/`sla-reminder` (`@nestjs/schedule`) |
| 8 | ✅ | PDF (Puppeteer, A4, поля 20 мм), `document/generate` + `document`, реестр освобождённых `/absences` + CSV |
| 9 | ✅ | `/admin/analytics/summary` (§11.8), `/admin/event-log` с фильтрами |
| 10 | ✅ | `device_tokens`, `POST/DELETE /devices`, push best-effort из уведомлений |

### Расширения сверх ТЗ

| Фича | Готово | Что |
|---|---|---|
| Обходной лист | ✅ | Параллельные этапы маршрута (`parallel_group`): 5 отделов согласуют одновременно, финальный этап — после всех. Тип `bypass` в seed |
| Объявления деканата | ✅ | Рассылка на всех / курс / группу → уведомление + push каждому адресату |
| Запись на приём (слоты) | ✅ | Приёмные окна с разбивкой на слоты, бронирование под блокировкой строки окна, отмена |

Проверено: `tsc --noEmit` и `nest build` зелёные; 40 юнит-тестов (`shared` 9, `api` 31).
Интеграционные тесты (§15.2 + обходной лист) написаны, гоняются в CI с Postgres.

## Статус (десктоп-клиент)

`clients/desktop` — Tauri 2 (Rust) + React 18 + Vite + Tailwind. Собирается фронт
(`pnpm --filter @edinoe-okno/desktop build`); сборка установщиков `.msi`/`.dmg`
требует Rust-тулчейна.

Готово: дизайн-система РСО, вход, очередь согласования, рассмотрение заявки
(маршрут, данные, вложения, согласование/возврат/отклонение, PDF, подпись,
карточка ячейки), ячейки, реестр освобождённых + CSV, типы заявок с предпросмотром
формы, аналитика, журнал событий, входящие, объявления, приёмные окна.

## Не сделано

- iOS и Android клиенты (нужны macOS/Xcode и Android SDK)
- email-канал через BullMQ (§10, опционально)
- e2e Playwright (§15.3)
- генерация первой Prisma-миграции (нужен запущенный Postgres); SQL-ограничения
  подготовлены в `apps/api/prisma/migrations/manual/0001_constraints.sql`

Дальше по `docs/plan.md` → «Порядок работ».
