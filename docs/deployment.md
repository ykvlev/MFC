# Деплой

## Бэкенд

- `docker compose -f docker-compose.prod.yml up -d` — API + Postgres + Redis + MinIO.
- Образ API (`apps/api/Dockerfile`) при старте выполняет `prisma migrate deploy`,
  затем запускает сервер (ТЗ 13.3).
- Обязательные секреты (падение при отсутствии — ТЗ 18): `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, `S3_*`, `SEED_ADMIN_PASSWORD`.
- Нужен HTTPS-домен (обратный прокси: Caddy / nginx + TLS).
- Ручная доработка первой миграции — `apps/api/prisma/migrations/README.md`.

## iOS

- Apple Developer Program ($99/год).
- `fastlane` или Xcode Cloud: сборка → TestFlight по git-тегу `ios-v*`.
- App Store Connect: privacy labels (ФИО, email, файлы — для работы приложения),
  иконка 1024², скриншоты, демо-аккаунт для ревью (регистрация закрытая, импорт из CSV).

## Android

- Google Play Console ($25 разово), Play App Signing.
- `fastlane`: `bundleRelease` → internal track по тегу `android-v*`.
- Data safety form, ссылка на политику конфиденциальности.

## Десктоп

- CI (`ci-desktop.yml`) собирает под Windows и macOS, подписывает `.msi` / `.dmg`,
  нотаризует macOS-сборку, публикует артефакты + `latest.json` на статику сайта вуза.
- Клиент проверяет `latest.json` через `tauri-plugin-updater`.
- Windows: code-signing сертификат (EV/OV). macOS: Developer ID (тот же Apple-аккаунт).

## Что нужно от заказчика заранее

1. Домен для API + место под статику десктоп-установщиков.
2. Юр. лицо и оплата аккаунтов Apple / Google + сертификат Windows.
3. Страница политики конфиденциальности.
4. SMTP-реле (или запуск только с `IN_APP` + `PUSH`).
5. Брендинг в высоком разрешении, тексты для сторов.
