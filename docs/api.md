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
