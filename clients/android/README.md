# Android — Единое окно студента

Пока не инициализирован. Каркас создаётся на неделе 1 (см. `docs/plan.md`).

## План каркаса

- Gradle-проект, Jetpack Compose, minSdk 26 / targetSdk 34, Hilt, Navigation-Compose.
- `openapi-generator` (kotlin, retrofit2 + kotlinx-serialization) как Gradle-таск;
  источник — `apps/api` `openapi.json`.
- `designsystem/` — шрифты из `design/fonts` в `res/font`, `Theme` с бренд-палитрой
  (без Material dynamic color), примитивы по `docs/architecture.md`.
- `network/` — Retrofit + OkHttp `Authenticator` (refresh), токены в
  `EncryptedSharedPreferences`.
- `feature*` модули: те же экраны, что на iOS.
- Пуши: Firebase Cloud Messaging.
- Публикация: Google Play Console, Play App Signing, internal → closed → production.
