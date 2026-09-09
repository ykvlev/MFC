# План: мобильное приложение «Единое окно студента» (iOS + Android + бэкенд)

## Контекст

Есть готовое ТЗ v1.0 на информационную систему «Единое окно студента» — один движок
заявок с конфигурируемыми типами, спецмодулями ячеек и бронирования, статусной машиной
и журналом событий. ТЗ полностью специфицирует **бэкенд** (NestJS + Prisma + PostgreSQL),
но раздел 1.2 явно выносит мобильное приложение за скобки («Только адаптивный веб»).

Отдельно есть готовый дизайн-прототип мобильного клиента (`Единое окно.dc.html`) на
дизайн-системе РСО: 4 роли (студент / сотрудник / преподаватель / администратор),
~14 экранов, кликабельные состояния, полный набор бренд-токенов (шрифты Actay Wide /
Stolzl / Onest, палитра `#0804FF / #FFFFFF / #EEEEEE / #000000`, контурные карточки,
радиусы 32/20/16, без теней).

**Задача:** реализовать это как полноценное нативное мобильное приложение для iOS и
Android с сильным бэкендом и опубликовать в App Store и Google Play. Дополнительно —
устанавливаемое десктоп-приложение (Windows/macOS) для сотрудников, оформляющих справки
(роль STAFF), а также для ADMIN и TEACHER: с мышью, клавиатурой, широкими таблицами и
прямой печатью PDF. Всё остальное в ТЗ (модель данных, API, статусная машина, права,
модули) реализуется как написано.

## Зафиксированные решения

| Вопрос | Решение |
|---|---|
| Объём | Полноценное приложение + бэкенд строго по ТЗ (раздел 2.1) |
| Бэкенд | NestJS 10 + Prisma 5 + PostgreSQL 16 + Redis 7 + BullMQ + MinIO, Docker, Swagger |
| iOS | Swift 5.9+, SwiftUI, минимальная цель iOS 16 |
| Android | Kotlin, Jetpack Compose, minSdk 26 / targetSdk 34 |
| Десктоп (для STAFF/ADMIN/TEACHER) | Устанавливаемое приложение на **Tauri 2** (Rust-оболочка + React/Vite/Tailwind/shadcn — ровно стек ТЗ 2.1), сборки под Windows (.msi) и macOS (.dmg), автообновление |
| Контракт клиент↔сервер | OpenAPI из NestJS Swagger → генерация моделей/клиента для Swift, Kotlin и TS |
| Роли в приложении | Все 4 (студент, сотрудник, преподаватель, администратор) на мобайле; десктоп — STAFF/ADMIN/TEACHER (студенту тоже доступен) |
| Доставка | iOS → App Store, Android → Google Play, десктоп → установщики .msi/.dmg с сайта вуза + автообновление |
| Команда | 5 человек, десктоп ведёт участник №5 совместно с №1 (см. «Разделение работ») |

## Отклонения от ТЗ (осознанные, помечать `// TZ-GAP`)

1. **Мобильные клиенты вместо `apps/web`.** Разделы 1.2 и 2.1 (React/Vite/Tailwind)
   не реализуются. Вся логика прав по-прежнему на сервере (ТЗ п. 0.3).
2. **Транспорт refresh-токена.** ТЗ: `httpOnly` cookie. Мобайл: refresh хранится в
   iOS Keychain / Android EncryptedSharedPreferences, передаётся в теле `POST /auth/refresh`.
   Ротация при каждом обновлении сохраняется; таблица `refresh_tokens` — без изменений.
3. **CORS/CSP/Helmet** (п. 13.1) применяются только к Swagger UI и служебным страницам;
   для мобильных клиентов вместо CORS — обязательная проверка `Authorization` и
   (опц.) сертификат-пиннинг на клиенте.
4. **Динамическая форма и админ-редакторы** (`FieldsSchemaEditor`, `RouteEditor`,
   аналитика, журнал) реализуются дважды — на SwiftUI и на Compose. Единый источник
   правды — JSON-схема `fields_schema` и правила из ТЗ п. 4.3–4.4.
5. **Десктоп-приложение** — реализуется React-фронт из ТЗ раздела 2.1 (Vite + React +
   TanStack Query + React Hook Form + Zod + Tailwind + shadcn/ui), упакованный в Tauri 2.
   То есть `apps/web` из ТЗ возвращается в объём, но как содержимое десктоп-оболочки, а
   не как публичный веб-сайт. Refresh-токен на десктопе — в Tauri secure store (OS
   keychain), не в cookie.

6. **Пуш-уведомления** добавляются как третий канал к `IN_APP` и `EMAIL`:
   `NotificationChannel` расширяется значением `PUSH`; APNs (iOS) и FCM (Android),
   отправка — в очереди BullMQ, токены устройств — новая таблица `device_tokens`.

## Архитектура и структура репозитория

Монорепозиторий (pnpm workspaces для JS-части + отдельные папки нативных клиентов):

```
edinoe-okno/
├── docker-compose.yml / docker-compose.prod.yml / .env.example
├── .github/workflows/            # ci-backend.yml, ci-ios.yml, ci-android.yml
├── packages/
│   └── shared/                   # TS-типы, Zod-схемы fields_schema, ALLOWED_TRANSITIONS,
│                                 # permissions — источник правды, из него же берётся
│                                 # генерация OpenAPI-описаний DTO
├── apps/
│   └── api/                      # NestJS — ровно как в ТЗ разделе 3 (modules/*, prisma/*)
├── clients/
│   ├── desktop/                  # Tauri 2: src-tauri/ (Rust) + src/ (React/Vite)
│   │   ├── src/                  # React: те же Features, что и мобайл, адаптированные
│   │   │                         # под мышь/клавиатуру и широкий экран; DynamicForm,
│   │   │                         # FieldsSchemaEditor, RouteEditor, очередь, ячейки,
│   │   │                         # реестр, аналитика, журнал
│   │   ├── src-tauri/            # updater, secure store, печать PDF, файловые диалоги
│   │   └── src/api/              # клиент из OpenAPI (TS) + перехват 401 → refresh
│   ├── ios/                      # Xcode-проект, SwiftUI, SPM-зависимости
│   │   ├── EdinoeOkno/
│   │   │   ├── DesignSystem/     # цвета, шрифты, Card, StatusBadge, RouteTimeline
│   │   │   ├── Networking/       # APIClient, TokenStore(Keychain), auth-refresh interceptor
│   │   │   ├── Generated/        # модели из OpenAPI
│   │   │   ├── Features/         # Auth, Applications, Catalog, DynamicForm, Cells,
│   │   │   │                     # Bookings, Registry, Admin, Notifications, Profile
│   │   │   └── App/              # роутинг по роли, таб-бары
│   │   └── EdinoeOknoTests/
│   └── android/                  # Gradle, Compose, Hilt, DataStore/EncryptedSharedPrefs
│       └── app/src/main/java/.../ {designsystem, network, generated, feature*, navigation}
├── design/                       # выгруженные шрифты РСО (.otf/.ttf), логотипы, токены
└── docs/                         # architecture.md, api.md, deployment.md, adr/
```

### Ключевой контракт

- NestJS отдаёт `/api/v1/openapi.json` (NestJS OpenAPI из декораторов, ТЗ п. 2.1).
- iOS: `swift-openapi-generator` (Apple) в build-плагине → типобезопасный клиент.
- Android: `openapi-generator` (kotlin, retrofit2 + kotlinx-serialization) в Gradle-таске.
- Контракт `fields_schema` (ТЗ п. 4.3) и `access_rule` (п. 4.4) описываются один раз в
  `packages/shared` и документируются в `docs/api.md`; клиенты реализуют рендер/проверку
  по этому документу.

## Бэкенд — по порядку реализации ТЗ (раздел 16)

Реализуется **строго по ТЗ**, без изобретения архитектуры. Кратко по этапам:

| Этап | Содержание | Файлы (ТЗ раздел 3) |
|---|---|---|
| 0 | Репо, docker-compose (Postgres/Redis/MinIO), CI, `.env` + валидация при старте (п. 18) | `docker-compose.yml`, `apps/api/src/config/*` |
| 1 | Prisma-схема (вся модель данных п. 4), миграции, `seed.ts` (п. 14), auth (JWT access+refresh, argon2id), `JwtAuthGuard` / `RolesGuard` / `ApplicationAccessGuard` | `prisma/`, `modules/auth`, `modules/users`, `common/guards` |
| 2 | `application_types`: `fields_schema` + `access_rule` + `access-rule.evaluator.ts`, CRUD + `PUT /:id/route` | `modules/application-types` |
| 3 | Движок: подача, копирование этапов в `application_stages`, `application-state.machine.ts` c `ALLOWED_TRANSITIONS`, `route-engine`, авто-этапы, `event_log` — каждый переход в одной транзакции (п. 6.6) | `modules/applications`, `modules/events` |
| 4 | Файлы: `storage.interface` + `s3.storage` / `local.storage`, проверка расширения **и** магических байт, отдача только через контроллер с проверкой прав (п. 13.1) | `modules/files` |
| 5 | Модуль ячеек: `SELECT ... FOR UPDATE SKIP LOCKED`, `pickup_code`, TTL, `CellLockDriver` + `ManualLockDriver` через DI-токен `CELL_LOCK_DRIVER` (п. 7) | `modules/cells` |
| 6 | Модуль бронирования: блокировка строки периода `FOR UPDATE`, квота/лист ожидания, продвижение из очереди с пересчётом позиций, запрет пересекающихся броней (п. 8) | `modules/bookings` |
| 7 | Уведомления (`in-app` + `email` + `push`), фоновые задачи `expired-cells.job`, `sla-reminder.job` на BullMQ; все события из п. 10 | `modules/notifications`, `modules/jobs` |
| 8 | Генерация PDF (Puppeteer, A4, поля 20 мм, кириллица), реестр освобождённых `absences` + экспорт CSV (п. 9) | `modules/documents`, `modules/absences` |
| 9 | Аналитика `/admin/analytics/summary` (п. 11.8), журнал событий `/admin/event-log` | `modules/analytics` |
| 10 | `device_tokens` + отправка APNs/FCM из очереди `push.channel` | `modules/notifications/channels` |

Единый формат ошибок (`http-exception.filter.ts`, п. 11.7), структурные JSON-логи с
`requestId`, `GET /health` (БД/Redis/хранилище), rate-limit (`/auth/login` 5/15 мин).

## iOS-клиент (SwiftUI)

- **Слой сети:** `APIClient` поверх сгенерированного клиента; `TokenStore` в Keychain;
  interceptor на 401 → `POST /auth/refresh` → повтор; при провале refresh — выход на логин.
- **Дизайн-система (`DesignSystem/`):** регистрация шрифтов Actay Wide / Stolzl / Onest
  (Info.plist `UIAppFonts`), `Color` extension с бренд-палитрой, семантические токены
  (`surfacePage`, `textAccent`, `alert`), примитивы: `OutlinedCard` (radius 32, border
  `#CCCCCC`, без тени), `StatusBadge` (карта статусов из прототипа: `DRAFT…CANCELLED`),
  `RouteTimeline` (вертикальный степпер с точками/линиями), `PillButton`, `ChipRow`,
  `SkeletonRow`, `EmptyState`, `Toast`. Анимации: 160 мс, `.easeOut`-подобная кривая.
- **Навигация по роли** (из прототипа):
  - Логин: реальный `email` + пароль (демо-роли прототипа заменяются реальным входом).
  - `STUDENT`: таб-бар Заявки / Каталог / Входящие / Профиль. Экраны: список заявок
    (skeleton/empty/error/data — ТЗ п. 13.4), каталог типов (с флагом `available` +
    `denyMessage`), `DynamicFormView` (рендер по `fields_schema`: TEXT/TEXTAREA/NUMBER/
    DATE/DATE_RANGE/SELECT/CHECKBOX/FILE), детали заявки (маршрут, карточка ячейки с
    кодом, данные, действия: отмена / повторная подача / скачать PDF / загрузить скан),
    экран отказа 403.
  - `STAFF`: Очередь / Ячейки / Входящие / Профиль. Согласование этапа, возврат на
    доработку (комментарий ≥ 10 символов), отклонение, подтверждение выдачи; сетка ячеек
    со статусами FREE/OCCUPIED/MAINTENANCE.
  - `TEACHER`: Реестр освобождённых (фильтры группа/курс/даты, поиск по ФИО), экспорт
    CSV (share sheet), только чтение.
  - `ADMIN`: Типы заявок / Аналитика / Журнал / Профиль. `FieldsSchemaEditor` и
    `RouteEditor` (создание типа и маршрута через API — проверка архитектурного принципа
    ТЗ п. 17), дашборд аналитики (bar-строки как в прототипе), лента `event_log`.
- **Пуши:** запрос разрешения, регистрация APNs-токена → `POST /devices`, обработка тапа
  по уведомлению → deep-link на заявку.
- **Загрузка файлов:** `PHPicker` / `UIDocumentPicker` / камера → multipart на
  `POST /applications/:id/files`.
- **Состояния и доступность:** каждый экран — загрузка/пусто/ошибка/данные; контраст
  ≥ 4.5:1; поддержка Dynamic Type в пределах макета; VoiceOver-подписи к полям формы.

## Android-клиент (Jetpack Compose)

Зеркало iOS по фичам и экранам:

- **Сеть:** Retrofit + OkHttp `Authenticator` для refresh; токены в
  `EncryptedSharedPreferences`; `kotlinx.serialization`.
- **DI:** Hilt. **Навигация:** Navigation-Compose, граф по роли, нижний бар как в прототипе.
- **Дизайн-система (`designsystem/`):** шрифты РСО в `res/font`, `Theme` с бренд-палитрой
  (свой `Colors`, не Material dynamic color), примитивы `OutlinedCard`, `StatusBadge`,
  `RouteTimeline`, `PillButton`, `ChipRow`, `Skeleton`, `EmptyState`, `AppToast`.
- **Формы:** `DynamicForm` composable — тот же набор типов полей и та же клиентская
  валидация (обязательность, min/max, accept/maxSizeMb), что и на сервере.
- **Пуши:** Firebase Cloud Messaging, `FirebaseMessagingService` → регистрация токена,
  каналы уведомлений, deep links.
- **Файлы:** `ActivityResultContracts.GetContent` / `TakePicture` → multipart.
- **Состояния/доступность:** loading/empty/error/data; `contentDescription`, поддержка
  TalkBack, контраст по WCAG AA.

## Десктоп-клиент (Tauri 2 + React)

- **Стек ТЗ 2.1:** Vite + React 18 + React Router 6 + TanStack Query 5 + React Hook Form
  + Zod + Tailwind + shadcn/ui. `packages/shared` подключается напрямую — те же Zod-схемы
  `fields_schema` и `ALLOWED_TRANSITIONS`, что и на бэкенде.
- **Оболочка Tauri:** установщики `.msi` (Windows) и `.dmg` (macOS); встроенный
  `tauri-plugin-updater` (проверка манифеста на сайте вуза); `tauri-plugin-stronghold`
  или OS keychain для refresh-токена; нативные диалоги открытия файлов; **печать PDF
  заявления напрямую** (ключевое удобство для сотрудников, оформляющих справки) через
  системный диалог печати.
- **Экраны:** приоритет — рабочее место сотрудника: очередь согласования с фильтрами и
  поиском (широкая таблица вместо карточек), экран рассмотрения заявки (маршрут, данные,
  вложения с предпросмотром, согласование / возврат с комментарием / отклонение),
  управление ячейками (сетка + список, назначение, подтверждение выдачи, открытие
  замка через `CellLockDriver`), генерация и печать PDF. Плюс полный ADMIN
  (`FieldsSchemaEditor` с JSON-редактором и предпросмотром формы, `RouteEditor`,
  аналитика, журнал событий с фильтрами и пагинацией) и реестр освобождённых для TEACHER
  с экспортом CSV. Кабинет студента тоже доступен (тот же React-код), но не является
  целью десктопа.
- **Дизайн-система:** те же бренд-токены РСО, но десктопная плотность — Tailwind-конфиг
  с бренд-палитрой и шрифтами (`@font-face` на локальные `.otf/.ttf` из `design/`),
  компоненты shadcn перекрашены под `#0804FF` / контурные карточки / без теней /
  радиусы 32-20-16 / переходы 120–200 мс.
- **Состояния:** loading (скелетоны) / пусто / ошибка / данные на каждом экране;
  блокировка кнопок действий на время запроса; подтверждения на все переходы статуса.

## Дизайн-система → нативные токены

Из `_ds/.../tokens/` и прототипа. Общая таблица соответствия (в `docs/architecture.md`):

| Токен | Значение | iOS | Android |
|---|---|---|---|
| brand/blue | `#0804FF` | `Color.brandBlue` | `BrandColors.Blue` |
| grey / border / hairline | `#EEEEEE` / `#CCCCCC` / `#A8A8A8` | — | — |
| alert | `#F23838` | — | — |
| text-muted | `#818C99` | — | — |
| Титульный | Actay Wide Bold | шрифт-ассет | `res/font` |
| Заголовки / метки / числа | Stolzl (Medium / Light для чисел) | | |
| Текст | Onest Regular | | |
| Радиусы | 32 / 20 / 16 | `RoundedRectangle` | `RoundedCornerShape` |
| Тени | нет | — | `tonalElevation = 0` |
| Движение | 120–200 мс, `cubic-bezier(.22,.61,.36,1)`, только opacity/цвет | | |

Карта статусов заявки (badge bg/fg) и цвета этапов маршрута берутся из объекта `ST` и
функции рендера прототипа (`Единое окно.dc.html`).

## Публикация в сторы

- **iOS:** Apple Developer Program ($99/год) — оформляет заказчик. App ID, bundle
  `local.university.edinoe-okno`, provisioning через Xcode Cloud или fastlane. TestFlight
  для беты, затем App Store: privacy nutrition labels (сбор ФИО, email, файлы — для
  функционирования), иконка 1024, скриншоты 6.7"/6.5"/5.5", возрастной рейтинг, описание
  на русском. NB: приложение для вуза — при ревью, вероятно, попросят демо-аккаунт и
  пояснение, что регистрация закрытая (импорт студентов из CSV).
- **Android:** Google Play Console ($25 разово) — заказчик. `applicationId`,
  подпись через Play App Signing, `aab` через Gradle/fastlane. Внутренний трек → закрытый
  → продакшн. Data safety form, privacy policy URL (нужна страница политики),
  таргет API актуальный.
- **Общее, что нужно от заказчика заранее:** домен для API (HTTPS), страница политики
  конфиденциальности, юр. лицо для аккаунтов разработчика, иконка/брендинг в высоком
  разрешении, тексты для сторов.
- CI: `ci-ios.yml` (build + test + TestFlight по тегу), `ci-android.yml` (build + test +
  internal track по тегу), `ci-backend.yml` (lint → test → docker build → deploy),
  `ci-desktop.yml` (Tauri build под Windows+macOS → подписанные `.msi`/`.dmg` +
  `latest.json` для автообновления, публикуются на статику сайта вуза по тегу).
- **Десктоп-подпись:** Windows — code signing сертификат (EV или OV) заказчика;
  macOS — Developer ID + нотаризация Apple (тот же аккаунт $99/год). Без подписи
  установщики будут ругаться SmartScreen / Gatekeeper.

## Разделение работ (4–5 человек)

| # | Зона | Что делает |
|---|---|---|
| 1 | Бэкенд-ядро | Prisma-схема, миграции, seed, auth+guards, движок заявок, статусная машина, маршруты, `event_log`, OpenAPI |
| 2 | Бэкенд-модули | Файлы+хранилище, ячейки+драйвер замков, бронирование с блокировками, уведомления (+push), фоновые задачи, PDF, реестр, аналитика |
| 3 | iOS | Весь клиент SwiftUI: дизайн-система, сеть, все 4 роли, пуши, публикация в App Store |
| 4 | Android | Весь клиент Compose: дизайн-система, сеть, все 4 роли, пуши, публикация в Google Play |
| 5 | Десктоп + контракт + качество | Tauri-клиент (React) для STAFF/ADMIN/TEACHER, `packages/shared`, генерация клиентов из OpenAPI, тесты (юнит/интеграционные/e2e по ТЗ п. 15), CI, `docs/`, деплой бэкенда, координация стыков |

Десктоп-фронт делит React-компоненты фич с участником №1 в части бизнес-логики форм
и статусной машины; при нехватке рук у №5 админ-редакторы на десктопе берёт №1.

Точки стыковки первой недели: OpenAPI-контракт (все), формат `fields_schema` (1, 3, 4, 5),
`CellLockDriver` (2, 5), схема пуш-токенов (2, 3, 4), Tauri secure store + updater-манифест (5).

## Порядок работ (общий)

1. **Неделя 1:** этап 0–1 бэкенда; каркасы iOS/Android (проект, дизайн-система, экран
   логина, сеть с refresh); зафиксировать OpenAPI-контракт и `fields_schema`.
   Каркас Tauri-десктопа: оболочка, secure store, вход, дизайн-система shadcn.
2. **Недели 2–3:** бэкенд этапы 2–4; мобильные клиенты — каталог, динамическая форма,
   список и детали заявки (роль студента целиком); десктоп — очередь и экран рассмотрения.
3. **Недели 3–4:** бэкенд этапы 5–6 (ячейки, брони + конкурентный тест ТЗ п. 15.2);
   клиенты — роль сотрудника (очередь, согласование, ячейки); десктоп — управление
   ячейками, назначение и подтверждение выдачи.
4. **Неделя 5:** бэкенд этапы 7–8 (уведомления, пуши, PDF, реестр); клиенты — реестр
   преподавателя, экспорт CSV, пуши.
5. **Неделя 6:** бэкенд этап 9 (аналитика, журнал); клиенты — админ-роль (редакторы
   типов/маршрутов, аналитика, журнал); десктоп — `FieldsSchemaEditor` с предпросмотром,
   `RouteEditor`, печать PDF.
6. **Неделя 7:** тесты до целевого покрытия ядра ≥ 80 %, e2e-сценарии ТЗ п. 15.3,
   доводка UI по дизайн-системе, деплой бэкенда на прод-домен.
7. **Неделя 8:** сборки в TestFlight и внутренний трек Google Play; подписанные
   `.msi`/`.dmg` десктопа + канал автообновления; метаданные сторов, политика
   конфиденциальности, отправка на ревью.

## Верификация

- **Бэкенд:** `docker compose up` разворачивает систему с нуля с seed-данными; Swagger
  на `/api/v1/docs` описывает все эндпоинты; `GET /health` зелёный. Vitest + Supertest:
  критерии ТЗ п. 15.1–15.2, включая конкурентный тест (50 параллельных запросов на
  период с квотой 10 → ровно 10 `CONFIRMED`) и проверку прав (чужая заявка → 403).
- **Контракт:** генерация клиентов из `openapi.json` проходит в CI обоих клиентов без
  ручных правок моделей.
- **iOS:** прогон на симуляторе и устройстве по сценарию защиты из прототипа: студент
  подаёт справку → сотрудник согласует оба этапа → движок назначает ячейку и код →
  студент видит код → сотрудник подтверждает выдачу → статус `ISSUED`. Проверка ширины
  макета на iPhone SE. XCTest на дизайн-примитивы и парсер `fields_schema`.
- **Android:** тот же сценарий на эмуляторе и устройстве; Compose UI-тесты на
  `DynamicForm` и навигацию по ролям; проверка на экране 360 px.
- **Десктоп:** сборка `.msi` ставится на чистую Windows, `.dmg` — на macOS; сотрудник
  проходит полный цикл справки (очередь → согласование обоих этапов → назначение ячейки
  → печать PDF → подтверждение выдачи); проверка автообновления (поднять версию, собрать,
  убедиться что клиент подтягивает); Playwright-e2e по React-слою.
- **Ключевой архитектурный тест (ТЗ п. 17):** админ создаёт новый тип заявки с
  собственными полями и маршрутом через приложение — студент видит его в каталоге и
  подаёт, без единой правки кода клиента или ядра.
- **Пуши:** реальная доставка APNs (TestFlight-сборка) и FCM на каждое событие из ТЗ п. 10.
- **Публикация:** сборки принимаются в TestFlight и Google Play internal track;
  прохождение ревью сторов.

## Открытые вопросы (уточнить по ходу, не блокируют старт)

1. Домен и хостинг прод-бэкенда (VPS / облако вуза / managed) + место под статику
   десктоп-установщиков и `latest.json`.
2. Юр. лицо и оплата: Apple Developer ($99/год, покрывает iOS и нотаризацию macOS),
   Google Play ($25 разово), code-signing сертификат для Windows (EV ~$300–600/год).
3. Источник страницы политики конфиденциальности (обяз. для обоих сторов).
7. Целевые ОС десктопа: подтвердить Windows 10/11 + macOS 12+; нужна ли сборка под Linux
   (Tauri умеет `.AppImage`/`.deb`, но не заявлено).
4. SMTP-реле для email-канала уведомлений (или только IN_APP + PUSH на старте).
5. Нужна ли поддержка тёмной темы (прототип и брендбук — светлые; предлагаю светлую
   тему как единственную, это соответствует брендбуку РСО).
6. Локализация: только русский (по ТЗ п. 0.6) — англ. интерфейс не делаем.
