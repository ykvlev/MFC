# API — контракт

Полный список эндпоинтов — в ТЗ раздел 11. Живая спецификация после запуска бэкенда:
`http://localhost:3000/api/v1/docs` (Swagger), `.../api/v1/openapi.json` (для генерации
клиентов).

## Аутентификация (мобайл/десктоп — TZ-GAP)

```
POST /api/v1/auth/login    { email, password } -> { accessToken, refreshToken, user }
POST /api/v1/auth/refresh  { refreshToken }     -> { accessToken, refreshToken }
POST /api/v1/auth/logout   { refreshToken }     -> 204
GET  /api/v1/auth/me       -> User
```

Отличие от ТЗ 11.1: `refreshToken` возвращается в теле ответа и передаётся в теле
запроса `refresh` (не в `httpOnly` cookie). Клиент хранит его в защищённом хранилище ОС.
Ротация refresh при каждом обновлении сохраняется (ТЗ 13.1).

## fields_schema

Формат — ТЗ 4.3. Канонические типы и Zod-валидация: `packages/shared/src/schemas/`.
Клиент строит форму динамически; серверная валидация `data` идёт **по `fields_schema`
типа** через `buildFormSchema()`, лишние ключи отбрасываются.

## access_rule

Формат — ТЗ 4.4. Операторы `eq|neq|in|gte|lte`, комбинаторы `all|any`, вложенность до
2 уровней, поля пользователя `is_budget|role|course|group_name|department`.
`GET /application-types` возвращает каждый тип с `available: boolean` и, при отказе,
`denyMessage`.

## Пуш-токены (TZ-GAP)

```
POST   /api/v1/devices     { platform: IOS|ANDROID, token } -> 204
DELETE /api/v1/devices     { token } -> 204
```

## Подпись (TZ-GAP endpoint)

ТЗ §9 п.7 не задаёт эндпоинт явно:

```
POST /api/v1/applications/:id/confirm-signature   [STAFF|ADMIN]
     -> AWAITING_SIGNATURE -> APPROVED -> ISSUED (или READY при uses_cell)
```
Требует загруженный `SIGNED_SCAN` и сотрудника подразделения последнего этапа.

## Реализованные эндпоинты (этапы 1–10)

auth (login/refresh/logout/me/change-password), admin/users (+import CSV),
application-types (CRUD + route), applications (+stages approve/return/reject,
files, document/generate, confirm-signature, history), cells, booking-periods,
bookings, absences (+export), notifications, devices, admin/analytics/summary,
admin/event-log, health. Полное описание — Swagger `/api/v1/docs`.

## Расширения сверх ТЗ

### Обходной лист — параллельные этапы маршрута

`route_steps.parallel_group` (int, nullable). Шаги с одинаковым значением
активируются одновременно и закрывают группу только когда согласованы **все**.
Шаг без группы — обычный последовательный этап. Копируется в
`application_stages.parallel_group` при подаче.

Тип `bypass` в seed: 5 параллельных отделов (библиотека, общежитие, бухгалтерия,
военно-учётный стол, спортклуб) → финальный этап деканата.

### Объявления деканата

```
GET  /api/v1/announcements                     -> Announcement[]
POST /api/v1/announcements   [STAFF|ADMIN]     { title, body, scope: ALL|COURSE|GROUP, value? }
```
Публикация создаёт уведомление каждому адресату (IN_APP + best-effort PUSH)
и запись `announcement.published` в журнале.

### Модуль слотов — запись на приём

```
GET  /api/v1/slot-windows            ?scope=mine|available  -> SlotWindow[]
POST /api/v1/slot-windows            [STAFF|TEACHER|ADMIN]
     { title, location?, date, startTime, endTime, slotMinutes, capacity }
GET  /api/v1/slot-windows/:id/slots  -> { window, slots: [{ slotStart, capacity, booked, free }] }
GET  /api/v1/slot-bookings           -> мои записи
POST /api/v1/slot-bookings           { windowId, slotStart, comment? }
POST /api/v1/slot-bookings/:id/cancel
```
Бронирование — в транзакции с `SELECT ... FOR UPDATE` строки окна: вместимость
слота и запрет повторной записи на одно окно проверяются под блокировкой.
