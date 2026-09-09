# Полное техническое задание: информационная система «Единое окно студента»

Версия документа: 1.0
Статус: готово к реализации

---

## 0. Инструкция исполнителю (LLM / разработчику)

Этот документ — исчерпывающая спецификация. Реализуй строго по нему.

Правила работы с документом:

1. **Не изобретай архитектуру.** Все ключевые решения уже приняты и зафиксированы ниже. Если чего-то не хватает — выбери минимальное решение и оставь комментарий `// TZ-GAP: <описание>`.
2. **Порядок реализации** задан в разделе 16. Не начинай с UI. Сначала база и ядро.
3. **Каждый эндпоинт проверяет права на сервере.** Скрытая кнопка на фронтенде правом доступа не является.
4. **Любое изменение статуса заявки — транзакция**, включающая запись в журнал событий и создание уведомления.
5. Именование: таблицы БД — `snake_case` во множественном числе; поля — `snake_case`; классы — `PascalCase`; методы и переменные — `camelCase` (TS) / `snake_case` (Python — если выбран вариант Б стека).
6. Все пользовательские тексты — на русском. Код, комментарии, названия сущностей — на английском.

---

## 1. Назначение системы

Веб-система единой точки входа для подачи студенческих заявлений. Заменяет обход кабинетов: студент подаёт заявку онлайн, она автоматически идёт по маршруту согласования, статус виден в личном кабинете, результат выдаётся физически (через ячейку) или фиксируется в системе (место в списке, подтверждённое освобождение).

### 1.1 Ключевой архитектурный принцип

Система — это **один движок заявок** с конфигурируемыми типами, а не набор независимых модулей.

Тип заявки = конфигурация:
- JSON-схема полей формы (`fields_schema`)
- маршрут согласования (набор `route_steps`)
- правило доступа (`access_rule`)
- флаги подключения спецмодулей (`uses_cell`, `uses_booking`, `requires_signature`)

Добавление нового типа заявки **не должно требовать изменения кода ядра** — только новой записи конфигурации через админку. Это главный критерий качества архитектуры и главный аргумент на защите проекта.

Поверх ядра — два спецмодуля:
- **Модуль ячеек** — физическая выдача документов
- **Модуль бронирования** — распределение ограниченного ресурса (места в профилактории)

### 1.2 Что НЕ входит в объём работ

- Запись на пересдачи и консультации к преподавателям. Архитектура должна позволять добавить это позже как ещё один тип заявки с модулем бронирования, но в MVP не реализуется.
- Интеграция с 1С / АСУ вуза в реальном времени. Данные студентов загружаются импортом CSV.
- Электронная цифровая подпись (ЭЦП). Подпись — офлайн, в системе фиксируется скан.
- Мобильное приложение. Только адаптивный веб.

---

## 2. Технологический стек

### 2.1 Основной вариант (рекомендуемый)

| Слой | Технология | Версия | Обоснование |
|---|---|---|---|
| Язык бэкенда | TypeScript | 5.x | Один язык на весь проект, общие типы между фронтом и бэком |
| Рантайм | Node.js | 20 LTS | Стабильность |
| Фреймворк | NestJS | 10.x | Модульность, DI, готовые guards/pipes — прямо ложится на структуру задачи |
| ORM | Prisma | 5.x | Декларативная схема, миграции из коробки, типобезопасность |
| БД | PostgreSQL | 16 | JSONB для `fields_schema` и `data`, транзакции с блокировками для квот |
| Кеш / очередь | Redis | 7 | Сессии, фоновые задачи (уведомления, просроченные ячейки) |
| Очередь задач | BullMQ | 5.x | На Redis, для cron-задач |
| Фронтенд | React + TypeScript | 18.x | — |
| Сборка фронта | Vite | 5.x | — |
| Роутинг | React Router | 6.x | — |
| Состояние/данные | TanStack Query | 5.x | Кеширование серверного состояния, инвалидация |
| Формы | React Hook Form + Zod | — | Динамическая генерация формы по `fields_schema` |
| UI | Tailwind CSS + shadcn/ui | — | Быстро, адаптивно, без дизайнера |
| Валидация (общая) | Zod | 3.x | Одна схема валидации на фронт и бэк |
| Генерация PDF | Puppeteer (HTML→PDF) | — | Шаблон — HTML, что проще правки чем LaTeX/docx |
| Файлы | MinIO (S3-совместимый) | — | Локально в Docker, легко заменить на облако |
| Аутентификация | JWT (access + refresh) | — | Access 15 мин, refresh 30 дней в httpOnly cookie |
| Хеширование паролей | argon2id | — | — |
| Тесты | Vitest + Supertest + Playwright | — | Юнит, интеграционные, e2e |
| Документация API | Swagger (NestJS OpenAPI) | — | Автогенерация из декораторов |
| Контейнеризация | Docker + docker-compose | — | — |
| CI | GitHub Actions | — | lint → test → build |

### 2.2 Альтернативный вариант (если команда не знает TypeScript)

| Слой | Технология |
|---|---|
| Бэкенд | Python 3.12 + FastAPI |
| ORM | SQLAlchemy 2.x + Alembic |
| Валидация | Pydantic v2 |
| Очередь | Celery + Redis |
| PDF | WeasyPrint |
| Остальное | без изменений (React, PostgreSQL, MinIO, Docker) |

Выбрать **один** вариант и не смешивать. Далее в документе примеры даны для варианта 2.1.

---

## 3. Структура репозитория

Монорепозиторий, workspaces через pnpm.

```
edinoe-okno/
├── README.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json                    # pnpm workspaces root
├── pnpm-workspace.yaml
│
├── packages/
│   └── shared/                     # общий код фронта и бэка
│       ├── package.json
│       └── src/
│           ├── types/
│           │   ├── application.ts  # ApplicationStatus, StageStatus, ...
│           │   ├── user.ts         # UserRole
│           │   ├── field-schema.ts # FieldSchema, FieldType
│           │   └── index.ts
│           ├── schemas/
│           │   ├── field-schema.zod.ts   # валидация fields_schema
│           │   └── build-form-schema.ts  # fields_schema -> Zod-схема формы
│           └── constants/
│               ├── statuses.ts     # переходы статусной машины
│               └── permissions.ts
│
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── package.json
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts             # начальные данные, см. раздел 14
│   │   ├── templates/              # HTML-шаблоны генерируемых документов
│   │   │   ├── absence.html
│   │   │   └── _base.css
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── config/
│   │       │   ├── configuration.ts
│   │       │   └── validation.ts   # проверка .env при старте
│   │       ├── common/
│   │       │   ├── guards/
│   │       │   │   ├── jwt-auth.guard.ts
│   │       │   │   ├── roles.guard.ts
│   │       │   │   └── application-access.guard.ts
│   │       │   ├── decorators/
│   │       │   │   ├── roles.decorator.ts
│   │       │   │   └── current-user.decorator.ts
│   │       │   ├── filters/
│   │       │   │   └── http-exception.filter.ts   # единый формат ошибок
│   │       │   ├── interceptors/
│   │       │   │   └── logging.interceptor.ts
│   │       │   └── pipes/
│   │       │       └── zod-validation.pipe.ts
│   │       ├── prisma/
│   │       │   ├── prisma.module.ts
│   │       │   └── prisma.service.ts
│   │       └── modules/
│   │           ├── auth/
│   │           │   ├── auth.module.ts
│   │           │   ├── auth.controller.ts
│   │           │   ├── auth.service.ts
│   │           │   ├── jwt.strategy.ts
│   │           │   └── dto/
│   │           ├── users/
│   │           │   ├── users.module.ts
│   │           │   ├── users.controller.ts
│   │           │   ├── users.service.ts
│   │           │   ├── users-import.service.ts   # импорт CSV
│   │           │   └── dto/
│   │           ├── application-types/
│   │           │   ├── application-types.module.ts
│   │           │   ├── application-types.controller.ts
│   │           │   ├── application-types.service.ts
│   │           │   ├── access-rule.evaluator.ts  # проверка access_rule
│   │           │   └── dto/
│   │           ├── applications/
│   │           │   ├── applications.module.ts
│   │           │   ├── applications.controller.ts
│   │           │   ├── applications.service.ts
│   │           │   ├── application-state.machine.ts  # ядро переходов
│   │           │   ├── route-engine.service.ts       # маршруты и этапы
│   │           │   ├── application-number.service.ts # генерация номера
│   │           │   └── dto/
│   │           ├── files/
│   │           │   ├── files.module.ts
│   │           │   ├── files.controller.ts
│   │           │   ├── files.service.ts
│   │           │   └── storage/
│   │           │       ├── storage.interface.ts
│   │           │       ├── s3.storage.ts
│   │           │       └── local.storage.ts
│   │           ├── cells/
│   │           │   ├── cells.module.ts
│   │           │   ├── cells.controller.ts
│   │           │   ├── cells.service.ts
│   │           │   └── locks/
│   │           │       ├── cell-lock.driver.ts    # интерфейс
│   │           │       └── manual-lock.driver.ts  # MVP-реализация
│   │           ├── bookings/
│   │           │   ├── bookings.module.ts
│   │           │   ├── bookings.controller.ts
│   │           │   ├── bookings.service.ts
│   │           │   ├── booking-periods.service.ts
│   │           │   └── waitlist.service.ts
│   │           ├── documents/
│   │           │   ├── documents.module.ts
│   │           │   ├── documents.service.ts
│   │           │   └── pdf-renderer.service.ts
│   │           ├── absences/
│   │           │   ├── absences.module.ts
│   │           │   ├── absences.controller.ts     # реестр для преподавателей
│   │           │   └── absences.service.ts
│   │           ├── notifications/
│   │           │   ├── notifications.module.ts
│   │           │   ├── notifications.controller.ts
│   │           │   ├── notifications.service.ts
│   │           │   └── channels/
│   │           │       ├── in-app.channel.ts
│   │           │       └── email.channel.ts
│   │           ├── events/
│   │           │   ├── events.module.ts
│   │           │   └── event-log.service.ts
│   │           ├── analytics/
│   │           │   ├── analytics.module.ts
│   │           │   ├── analytics.controller.ts
│   │           │   └── analytics.service.ts
│   │           └── jobs/
│   │               ├── jobs.module.ts
│   │               ├── expired-cells.job.ts       # cron: просроченные ячейки
│   │               └── sla-reminder.job.ts        # cron: напоминания сотрудникам
│   │
│   └── web/                        # React frontend
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── index.html
│       ├── Dockerfile
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── router.tsx
│           ├── api/
│           │   ├── client.ts        # axios/fetch + перехват 401 -> refresh
│           │   ├── applications.ts
│           │   ├── cells.ts
│           │   ├── bookings.ts
│           │   └── ...
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   ├── useApplications.ts
│           │   └── useNotifications.ts
│           ├── components/
│           │   ├── ui/              # shadcn-компоненты
│           │   ├── layout/
│           │   │   ├── AppShell.tsx
│           │   │   ├── Sidebar.tsx
│           │   │   └── NotificationBell.tsx
│           │   ├── forms/
│           │   │   ├── DynamicForm.tsx      # рендер по fields_schema
│           │   │   └── fields/
│           │   │       ├── TextField.tsx
│           │   │       ├── NumberField.tsx
│           │   │       ├── DateField.tsx
│           │   │       ├── DateRangeField.tsx
│           │   │       ├── SelectField.tsx
│           │   │       ├── CheckboxField.tsx
│           │   │       ├── TextareaField.tsx
│           │   │       └── FileField.tsx
│           │   ├── applications/
│           │   │   ├── ApplicationCard.tsx
│           │   │   ├── ApplicationList.tsx
│           │   │   ├── StatusBadge.tsx
│           │   │   └── RouteProgress.tsx    # прогресс по этапам
│           │   └── admin/
│           │       ├── FieldsSchemaEditor.tsx
│           │       └── RouteEditor.tsx
│           ├── pages/
│           │   ├── LoginPage.tsx
│           │   ├── student/
│           │   │   ├── MyApplicationsPage.tsx
│           │   │   ├── NewApplicationPage.tsx
│           │   │   ├── ApplicationDetailPage.tsx
│           │   │   └── SanatoriumPage.tsx
│           │   ├── staff/
│           │   │   ├── QueuePage.tsx
│           │   │   ├── ReviewPage.tsx
│           │   │   └── CellsPage.tsx
│           │   ├── teacher/
│           │   │   └── AbsenceRegistryPage.tsx
│           │   └── admin/
│           │       ├── UsersPage.tsx
│           │       ├── ApplicationTypesPage.tsx
│           │       ├── RoutesPage.tsx
│           │       ├── BookingPeriodsPage.tsx
│           │       ├── EventLogPage.tsx
│           │       └── AnalyticsPage.tsx
│           ├── lib/
│           │   ├── permissions.ts
│           │   └── format.ts
│           └── styles/
│               └── globals.css
│
└── docs/
    ├── architecture.md
    ├── api.md
    ├── deployment.md
    └── adr/                        # architecture decision records
        ├── 0001-single-engine.md
        └── 0002-jsonb-fields-schema.md
```

---

## 4. Модель данных

### 4.1 Перечисления (enum)

```
UserRole:           STUDENT | STAFF | TEACHER | ADMIN
ApplicationStatus:  DRAFT | SUBMITTED | IN_REVIEW | NEEDS_FIX |
                    AWAITING_SIGNATURE | APPROVED | READY | ISSUED |
                    REJECTED | CANCELLED
StageStatus:        PENDING | ACTIVE | APPROVED | REJECTED | RETURNED | SKIPPED
CellStatus:         FREE | OCCUPIED | MAINTENANCE
BookingStatus:      CONFIRMED | WAITLIST | CANCELLED
FileKind:           ATTACHMENT | GENERATED_DOCUMENT | SIGNED_SCAN
FieldType:          TEXT | TEXTAREA | NUMBER | DATE | DATE_RANGE |
                    SELECT | CHECKBOX | FILE
NotificationChannel: IN_APP | EMAIL
```

### 4.2 Таблицы

#### `users`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `email` | varchar(255) | UNIQUE, NOT NULL | Логин |
| `password_hash` | varchar(255) | NOT NULL | argon2id |
| `full_name` | varchar(255) | NOT NULL | ФИО полностью |
| `role` | UserRole | NOT NULL | |
| `group_name` | varchar(64) | NULL | Учебная группа (студент) |
| `course` | smallint | NULL | Курс 1–6 |
| `department` | varchar(128) | NULL | Подразделение (сотрудник). Сопоставляется с `route_steps.approver_department` |
| `is_budget` | boolean | NOT NULL, default false | Бюджетная форма обучения |
| `student_card_no` | varchar(32) | NULL, UNIQUE | Номер студенческого |
| `phone` | varchar(32) | NULL | |
| `is_active` | boolean | NOT NULL, default true | Мягкая блокировка |
| `created_at` | timestamptz | NOT NULL, default now() | |
| `updated_at` | timestamptz | NOT NULL | |

Индексы: `(role)`, `(department)`, `(group_name)`.

#### `application_types`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | uuid | PK | |
| `code` | varchar(64) | UNIQUE, NOT NULL | Машинный код: `certificate`, `sanatorium`, ... |
| `name` | varchar(255) | NOT NULL | Отображаемое название |
| `description` | text | NULL | Пояснение для студента на экране выбора |
| `icon` | varchar(64) | NULL | Имя иконки |
| `fields_schema` | jsonb | NOT NULL | См. 4.3 |
| `access_rule` | jsonb | NULL | См. 4.4 |
| `requires_signature` | boolean | default false | Нужна офлайн-подпись |
| `uses_cell` | boolean | default false | Выдаётся через ячейку |
| `uses_booking` | boolean | default false | Требует брони места |
| `document_template` | varchar(128) | NULL | Имя файла шаблона в `templates/` |
| `sort_order` | int | default 0 | Порядок на экране выбора |
| `is_active` | boolean | default true | |
| `created_at` | timestamptz | | |
| `updated_at` | timestamptz | | |

#### `route_steps` — шаблон маршрута

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | uuid | PK | |
| `type_id` | uuid | FK → application_types, ON DELETE CASCADE | |
| `order_num` | int | NOT NULL | Порядок, начиная с 1 |
| `name` | varchar(255) | NOT NULL | «Согласование в деканате» |
| `approver_department` | varchar(128) | NOT NULL | Кто закрывает этап |
| `is_auto` | boolean | default false | Автоматический этап (проверка правила) |
| `is_optional` | boolean | default false | Можно пропустить |
| `sla_days` | int | NULL | Норматив в рабочих днях |

Ограничение: `UNIQUE (type_id, order_num)`.

#### `applications`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | uuid | PK | |
| `number` | varchar(32) | UNIQUE, NOT NULL | Человекочитаемый: `2026-000123` |
| `user_id` | uuid | FK → users, NOT NULL | Автор |
| `type_id` | uuid | FK → application_types, NOT NULL | |
| `status` | ApplicationStatus | NOT NULL, default DRAFT | |
| `data` | jsonb | NOT NULL, default '{}' | Значения полей по `fields_schema` |
| `current_stage_id` | uuid | FK → application_stages, NULL | Денормализация для быстрой выборки очереди |
| `reject_reason` | text | NULL | |
| `created_at` | timestamptz | NOT NULL | |
| `submitted_at` | timestamptz | NULL | |
| `closed_at` | timestamptz | NULL | Момент перехода в терминальный статус |

Индексы: `(user_id, status)`, `(type_id, status)`, `(status, submitted_at)`, GIN по `data`.

#### `application_stages` — фактические этапы

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | uuid | PK |
| `application_id` | uuid | FK → applications, ON DELETE CASCADE |
| `route_step_id` | uuid | FK → route_steps, NULL (шаг мог быть удалён из шаблона) |
| `order_num` | int | NOT NULL |
| `name` | varchar(255) | NOT NULL (копия на момент подачи) |
| `approver_department` | varchar(128) | NOT NULL (копия) |
| `status` | StageStatus | NOT NULL, default PENDING |
| `approved_by` | uuid | FK → users, NULL |
| `comment` | text | NULL |
| `due_at` | timestamptz | NULL (по sla_days) |
| `acted_at` | timestamptz | NULL |

Индексы: `(application_id, order_num)`, `(approver_department, status)`.

**Важно:** название и подразделение копируются в момент подачи. Изменение шаблона маршрута не должно менять уже поданные заявки.

#### `files`

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | uuid | PK |
| `application_id` | uuid | FK → applications, ON DELETE CASCADE |
| `uploaded_by` | uuid | FK → users |
| `kind` | FileKind | NOT NULL |
| `field_key` | varchar(64) | NULL — к какому полю формы относится |
| `original_name` | varchar(255) | NOT NULL |
| `storage_key` | varchar(512) | NOT NULL — путь в S3/MinIO |
| `mime_type` | varchar(128) | NOT NULL |
| `size_bytes` | bigint | NOT NULL |
| `checksum_sha256` | varchar(64) | NULL |
| `created_at` | timestamptz | NOT NULL |

#### `cells`

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | uuid | PK |
| `code` | varchar(16) | UNIQUE, NOT NULL — `A-01` |
| `location` | varchar(255) | NULL — «1 этаж, холл» |
| `status` | CellStatus | NOT NULL, default FREE |
| `application_id` | uuid | FK → applications, NULL, UNIQUE |
| `pickup_code` | varchar(8) | NULL — 6 цифр |
| `occupied_at` | timestamptz | NULL |
| `expires_at` | timestamptz | NULL |

Индекс: `(status)`.

#### `booking_periods`

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | uuid | PK |
| `name` | varchar(255) | NOT NULL — «Заезд №3, март» |
| `start_date` | date | NOT NULL |
| `end_date` | date | NOT NULL |
| `quota` | int | NOT NULL, CHECK > 0 |
| `is_open` | boolean | default true |
| `created_at` | timestamptz | |

CHECK: `end_date > start_date`.

#### `bookings`

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | uuid | PK |
| `application_id` | uuid | FK → applications, UNIQUE, NOT NULL |
| `period_id` | uuid | FK → booking_periods, NOT NULL |
| `user_id` | uuid | FK → users, NOT NULL (денормализация для проверки пересечений) |
| `status` | BookingStatus | NOT NULL |
| `queue_position` | int | NULL — только для WAITLIST |
| `created_at` | timestamptz | NOT NULL |
| `cancelled_at` | timestamptz | NULL |

Индексы: `(period_id, status)`, `(user_id, status)`.

Частичный уникальный индекс: `UNIQUE (user_id, period_id) WHERE status <> 'CANCELLED'`.

#### `event_log`

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | bigserial | PK |
| `application_id` | uuid | FK → applications, NULL |
| `actor_id` | uuid | FK → users, NULL (NULL = система) |
| `action` | varchar(64) | NOT NULL |
| `payload` | jsonb | NOT NULL, default '{}' — `{from, to, comment, ...}` |
| `ip_address` | inet | NULL |
| `created_at` | timestamptz | NOT NULL, default now() |

Записи **неизменяемы**. UPDATE и DELETE запрещены на уровне прав БД-роли приложения.

Список значений `action`: `user.login`, `user.login_failed`, `application.created`, `application.submitted`, `application.stage_approved`, `application.stage_rejected`, `application.stage_returned`, `application.resubmitted`, `application.cancelled`, `application.document_generated`, `application.signed_uploaded`, `cell.assigned`, `cell.issued`, `cell.expired`, `booking.created`, `booking.cancelled`, `booking.promoted`, `type.created`, `type.updated`, `route.updated`.

#### `notifications`

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users, NOT NULL |
| `application_id` | uuid | FK → applications, NULL |
| `title` | varchar(255) | NOT NULL |
| `body` | text | NOT NULL |
| `link` | varchar(512) | NULL |
| `channel` | NotificationChannel | NOT NULL, default IN_APP |
| `is_read` | boolean | default false |
| `sent_at` | timestamptz | NULL |
| `created_at` | timestamptz | NOT NULL |

Индекс: `(user_id, is_read, created_at DESC)`.

#### `refresh_tokens`

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users, ON DELETE CASCADE |
| `token_hash` | varchar(255) | NOT NULL |
| `expires_at` | timestamptz | NOT NULL |
| `revoked_at` | timestamptz | NULL |
| `user_agent` | varchar(255) | NULL |
| `created_at` | timestamptz | NOT NULL |

### 4.3 Формат `fields_schema`

Массив объектов. Фронтенд рендерит форму динамически, бэкенд валидирует по той же схеме.

```json
[
  {
    "key": "purpose",
    "label": "Куда требуется справка",
    "type": "SELECT",
    "options": ["Военкомат", "Соцзащита", "По месту требования", "Для банка"],
    "required": true,
    "hint": "Выберите организацию, куда предоставите справку"
  },
  {
    "key": "copies",
    "label": "Количество экземпляров",
    "type": "NUMBER",
    "required": true,
    "min": 1,
    "max": 5,
    "default": 1
  },
  {
    "key": "period",
    "label": "Период освобождения",
    "type": "DATE_RANGE",
    "required": true,
    "minDate": "today"
  },
  {
    "key": "call_letter",
    "label": "Письмо-вызов",
    "type": "FILE",
    "required": true,
    "accept": ["pdf", "jpg", "jpeg", "png"],
    "maxSizeMb": 10
  },
  {
    "key": "comment",
    "label": "Комментарий",
    "type": "TEXTAREA",
    "required": false,
    "maxLength": 1000
  }
]
```

Общие атрибуты поля: `key` (уникальный в схеме, `^[a-z][a-z0-9_]*$`), `label`, `type`, `required`, `hint`, `default`, `visibleFor` (массив ролей — по умолчанию все).

Атрибуты по типам:
- `TEXT` / `TEXTAREA`: `minLength`, `maxLength`, `pattern`
- `NUMBER`: `min`, `max`, `step`
- `DATE` / `DATE_RANGE`: `minDate`, `maxDate` (`today`, `today+30`, ISO-дата)
- `SELECT`: `options` (массив строк или `{value,label}`), `multiple`
- `FILE`: `accept`, `maxSizeMb`, `multiple`
- `CHECKBOX`: —

Схема самой схемы валидируется Zod при сохранении типа заявки в админке. Невалидную `fields_schema` сохранить нельзя.

### 4.4 Формат `access_rule`

```json
{ "all": [ { "field": "is_budget", "op": "eq", "value": true } ] }
```

Поддерживаемые операторы: `eq`, `neq`, `in`, `gte`, `lte`.
Поддерживаемые поля пользователя: `is_budget`, `role`, `course`, `group_name`, `department`.
Комбинаторы: `all` (И), `any` (ИЛИ). Вложенность до 2 уровней.

Если `access_rule` = NULL — тип доступен всем студентам.

При отказе возвращается человекочитаемая причина, задаваемая в поле `access_rule.denyMessage`:
```json
{
  "all": [{ "field": "is_budget", "op": "eq", "value": true }],
  "denyMessage": "Запись в профилакторий доступна только студентам бюджетной формы обучения"
}
```

---

## 5. Типы заявок и маршруты (данные для seed)

| # | `code` | Название | Флаги | Маршрут (`approver_department`, sla) |
|---|---|---|---|---|
| 1 | `certificate` | Справка об обучении | `uses_cell` | 1. Деканат (2 дн.) → 2. Канцелярия / печать (1 дн.) |
| 2 | `sanatorium` | Путёвка в профилакторий | `uses_booking` | 1. Проверка права (авто) → 2. Профком (3 дн.) → 3. Медпункт (3 дн.) |
| 3 | `absence` | Освобождение от занятий | `requires_signature` | 1. Куратор (1 дн.) → 2. Заведующий отделением (2 дн.) → 3. Загрузка подписанного скана |
| 4 | `dormitory` | Заявление на общежитие | — | 1. Деканат (3 дн.) → 2. Комиссия по заселению (10 дн.) |
| 5 | `student_card` | Пропуск / дубликат студенческого | `uses_cell` | 1. Деканат (2 дн.) → 2. Отдел кадров студентов (3 дн.) → 3. Печать (2 дн.) |
| 6 | `financial_aid` | Материальная помощь | — | 1. Куратор (2 дн.) → 2. Профком (5 дн.) → 3. Бухгалтерия (5 дн.) |
| 7 | `medical_note` | Пропуск по болезни | — | 1. Куратор (1 дн.) |

Подробные `fields_schema` для каждого типа — в `prisma/seed.ts`. Минимальный набор полей приведён в разделе 14.

---

## 6. Статусная машина заявки

### 6.1 Диаграмма переходов

```
DRAFT
  ├─ submit ──────────────► SUBMITTED ──(авто, мгновенно)──► IN_REVIEW
  └─ cancel ──────────────► CANCELLED [терминальный]

IN_REVIEW
  ├─ approveStage (не последний) ─► IN_REVIEW  (следующий этап -> ACTIVE)
  ├─ approveStage (последний)
  │     ├─ если requires_signature ─► AWAITING_SIGNATURE
  │     ├─ иначе если uses_cell ────► APPROVED ──(авто назначение)──► READY
  │     └─ иначе ───────────────────► APPROVED ──(авто)──► ISSUED
  ├─ returnStage ─────────► NEEDS_FIX
  ├─ rejectStage ─────────► REJECTED [терминальный]
  └─ cancel (студент) ────► CANCELLED [терминальный]

NEEDS_FIX
  ├─ resubmit ────────────► IN_REVIEW (вернувший этап снова ACTIVE)
  └─ cancel ──────────────► CANCELLED [терминальный]

AWAITING_SIGNATURE
  └─ uploadSignedScan + подтверждение сотрудника ─► APPROVED ─► ISSUED

READY
  └─ confirmPickup ───────► ISSUED [терминальный]
```

### 6.2 Правила

1. Из `ISSUED`, `REJECTED`, `CANCELLED` переходов нет.
2. Студент может отменить заявку только из `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `NEEDS_FIX`.
3. `returnStage` и `rejectStage` требуют непустого комментария (минимум 10 символов).
4. При `returnStage` все последующие этапы остаются `PENDING`, вернувший этап получает `RETURNED`; при `resubmit` он снова становится `ACTIVE`, а предыдущие уже согласованные этапы **не пересогласовываются**.
5. Автоматические этапы (`is_auto = true`) выполняются движком сразу: проверяется `access_rule`, этап становится `APPROVED` или заявка уходит в `REJECTED`.
6. Переход реализуется в одной транзакции БД:
   - изменение `applications.status` и `current_stage_id`
   - изменение `application_stages`
   - вставка в `event_log`
   - вставка в `notifications`
7. Список допустимых переходов вынести в константу `ALLOWED_TRANSITIONS` в `packages/shared/src/constants/statuses.ts`. Любая попытка недопустимого перехода — ошибка `INVALID_TRANSITION` (409).

---

## 7. Модуль ячеек

### 7.1 Логика

1. Заявка типа с `uses_cell = true` переходит в `APPROVED`.
2. Сервис ищет ячейку `status = FREE` (`SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1`).
3. Если свободной нет — заявка остаётся в `APPROVED`, ставится флаг в очереди сотрудника «ожидает свободной ячейки», создаётся уведомление администратору. Повторная попытка — при каждом освобождении ячейки.
4. При успехе: `status = OCCUPIED`, `application_id`, `pickup_code` = 6 случайных цифр, `occupied_at = now()`, `expires_at = now() + CELL_TTL_DAYS` (по умолчанию 7).
5. Заявка → `READY`. Студенту уведомление: номер ячейки, код, срок хранения.
6. Сотрудник подтверждает выдачу (`POST /cells/{id}/issue`) → заявка `ISSUED`, ячейка `FREE`, поля `application_id`, `pickup_code`, `occupied_at`, `expires_at` обнуляются.
7. Cron-задача `expired-cells.job` раз в сутки находит `expires_at < now()` и создаёт уведомления студенту и администратору. **Автоматически ячейку не освобождает** — только пометка.

### 7.2 Задел под электронные замки

```ts
export interface CellLockDriver {
  open(cellCode: string): Promise<void>;
  getState(cellCode: string): Promise<'OPEN' | 'CLOSED' | 'UNKNOWN'>;
  isAvailable(): boolean;
}
```

MVP: `ManualLockDriver` — `open()` пишет запись в `event_log`, `getState()` возвращает `UNKNOWN`, `isAvailable()` — `false`. Драйвер внедряется через DI-токен `CELL_LOCK_DRIVER`. Замена реализации не должна затрагивать `cells.service.ts`.

---

## 8. Модуль бронирования

### 8.1 Логика

1. При подаче заявки типа с `uses_booking = true` первым идёт авто-этап проверки `access_rule`. Для профилактория — `is_budget = true`.
2. Студент выбирает период из `booking_periods` с `is_open = true` и `start_date > today`.
3. Транзакция:
   ```sql
   BEGIN;
   SELECT * FROM booking_periods WHERE id = :id FOR UPDATE;
   SELECT count(*) FROM bookings WHERE period_id = :id AND status = 'CONFIRMED';
   -- если count < quota -> CONFIRMED
   -- иначе -> WAITLIST, queue_position = coalesce(max(queue_position),0)+1
   INSERT INTO bookings ...;
   COMMIT;
   ```
   Блокировка строки периода обязательна — без неё при одновременной подаче квота будет превышена.
4. Отмена брони `CONFIRMED`:
   - `status = CANCELLED`, `cancelled_at = now()`
   - в той же транзакции берётся первый из `WAITLIST` по `queue_position`, переводится в `CONFIRMED`, `queue_position = NULL`
   - позиции остальных пересчитываются (`queue_position - 1`)
   - продвинутому студенту — уведомление
   - в `event_log` — `booking.cancelled` и `booking.promoted`
5. Один студент не может иметь две активные брони на пересекающиеся периоды. Проверка: нет ли у пользователя брони со статусом ≠ `CANCELLED`, чей период пересекается с выбранным (`start_date <= :end AND end_date >= :start`).

---

## 9. Генерация документов и подписи

Для типов с `requires_signature = true`:

1. После согласования всех «живых» этапов система рендерит PDF из HTML-шаблона `templates/{document_template}`.
2. Плейсхолдеры: `{{full_name}}`, `{{group_name}}`, `{{course}}`, `{{student_card_no}}`, `{{application_number}}`, `{{created_at}}`, `{{data.<field_key>}}`, `{{approvals}}` (список согласовавших с датами).
3. Рендер: Puppeteer, формат A4, поля 20 мм, шрифт с поддержкой кириллицы.
4. Файл сохраняется как `files.kind = GENERATED_DOCUMENT`. Повторная генерация создаёт новую версию, старая остаётся (для аудита).
5. Заявка → `AWAITING_SIGNATURE`. Студенту уведомление со ссылкой на скачивание.
6. Студент печатает, подписывает офлайн, загружает скан (`files.kind = SIGNED_SCAN`).
7. Сотрудник соответствующего этапа проверяет скан и подтверждает → `APPROVED` → `ISSUED`.

### 9.1 Реестр освобождённых

Отдельный экран и эндпоинт для роли `TEACHER`:
- источник — заявки типа `absence` в статусе `ISSUED`
- колонки: ФИО, группа, курс, даты освобождения (из `data.period`), номер заявки, кем согласовано
- фильтры: группа, курс, диапазон дат (пересечение с периодом освобождения), поиск по ФИО
- экспорт в CSV
- **только чтение**, никаких действий

---

## 10. Уведомления

События, порождающие уведомление:

| Событие | Кому | Текст (шаблон) |
|---|---|---|
| Заявка подана | Автору | «Заявка №{number} принята и передана на согласование» |
| Этап согласован | Автору | «Заявка №{number}: этап "{stage}" пройден» |
| Заявка возвращена | Автору | «Заявка №{number} возвращена на доработку: {comment}» |
| Заявка отклонена | Автору | «Заявка №{number} отклонена: {comment}» |
| Документ готов | Автору | «Документ по заявке №{number} готов. Ячейка {cell}, код {code}. Хранится до {date}» |
| Требуется подпись | Автору | «Распечатайте заявление по №{number} и подпишите у заведующего» |
| Срок хранения истёк | Автору + админу | «Документ по заявке №{number} не забран в срок» |
| Продвижение из очереди | Автору | «Освободилось место в заезде "{period}". Ваша бронь подтверждена» |
| Новая заявка на этапе | Сотрудникам подразделения | «Новая заявка №{number} ожидает вашего согласования» |
| Просрочен SLA | Сотруднику | «Заявка №{number} ожидает решения дольше норматива» |

Каналы: `IN_APP` (обязательно, MVP) и `EMAIL` (опционально, через SMTP). Отправка email — в фоновой очереди BullMQ с ретраями; падение почты не должно ломать бизнес-транзакцию.

---

## 11. API

Базовый префикс: `/api/v1`. Формат — JSON. Аутентификация — `Authorization: Bearer <access_token>`.

### 11.1 Аутентификация

```
POST   /auth/login              { email, password } -> { accessToken, user }  (+ refresh в httpOnly cookie)
POST   /auth/refresh            -> { accessToken }
POST   /auth/logout             -> 204
GET    /auth/me                 -> User
POST   /auth/change-password    { oldPassword, newPassword } -> 204
```

### 11.2 Типы заявок

```
GET    /application-types                 -> ApplicationType[]  (только доступные текущему пользователю, с флагом available + denyMessage)
GET    /application-types/:id             -> ApplicationType (с fields_schema и маршрутом)
POST   /application-types                 [ADMIN] создать
PATCH  /application-types/:id             [ADMIN]
DELETE /application-types/:id             [ADMIN] мягкое удаление (is_active = false)
PUT    /application-types/:id/route       [ADMIN] { steps: RouteStep[] } — заменить маршрут целиком
```

### 11.3 Заявки

```
GET    /applications                      -> Page<Application>
       ?scope=my|queue|all  &status=  &typeId=  &q=  &page=  &limit=
POST   /applications                      { typeId, data } -> Application (DRAFT)
GET    /applications/:id                  -> Application (со stages, files, booking, cell)
PATCH  /applications/:id                  { data } — только DRAFT или NEEDS_FIX
POST   /applications/:id/submit           -> Application
POST   /applications/:id/resubmit         -> Application   (из NEEDS_FIX)
POST   /applications/:id/cancel           { reason? } -> Application
GET    /applications/:id/history          -> EventLogEntry[]

POST   /applications/:id/stages/:stageId/approve   { comment? }
POST   /applications/:id/stages/:stageId/return    { comment }   (обязателен)
POST   /applications/:id/stages/:stageId/reject    { comment }   (обязателен)

POST   /applications/:id/files            multipart: file, kind, fieldKey -> File
GET    /applications/:id/files/:fileId    -> поток файла (с проверкой прав)
DELETE /applications/:id/files/:fileId    (только автор, только в DRAFT/NEEDS_FIX)

POST   /applications/:id/document/generate  [STAFF] -> File
GET    /applications/:id/document           -> PDF
```

### 11.4 Ячейки

```
GET    /cells                     [STAFF|ADMIN] -> Cell[]  ?status=
POST   /cells                     [ADMIN] { code, location }
PATCH  /cells/:id                 [ADMIN] { status, location }
POST   /cells/:id/assign          [STAFF] { applicationId } -> Cell
POST   /cells/:id/issue           [STAFF] -> Cell    (подтверждение выдачи)
POST   /cells/:id/open            [STAFF] -> 204     (через CellLockDriver)
```

### 11.5 Бронирование

```
GET    /booking-periods           -> BookingPeriod[] (с полем freeSlots)
POST   /booking-periods           [ADMIN]
PATCH  /booking-periods/:id       [ADMIN]
GET    /bookings                  ?scope=my|all -> Booking[]
POST   /bookings                  { applicationId, periodId } -> Booking
POST   /bookings/:id/cancel       -> Booking
```

### 11.6 Прочее

```
GET    /absences                  [TEACHER|ADMIN] ?group= &course= &from= &to= &q=
GET    /absences/export           [TEACHER|ADMIN] -> CSV

GET    /notifications             ?unreadOnly=
POST   /notifications/:id/read
POST   /notifications/read-all

GET    /admin/users               [ADMIN] ?role= &q= &page=
POST   /admin/users               [ADMIN]
PATCH  /admin/users/:id           [ADMIN]
POST   /admin/users/import        [ADMIN] multipart CSV -> { created, updated, errors[] }
GET    /admin/event-log           [ADMIN] ?applicationId= &actorId= &action= &from= &to=
GET    /admin/analytics/summary   [ADMIN] -> см. 11.8
```

### 11.7 Формат ошибок

```json
{
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Запись в профилакторий доступна только студентам бюджетной формы обучения",
    "details": null
  }
}
```

Коды: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `ACCESS_DENIED` (403), `NOT_FOUND` (404), `INVALID_TRANSITION` (409), `QUOTA_EXCEEDED` (409), `DUPLICATE_BOOKING` (409), `NO_FREE_CELLS` (409), `FILE_TOO_LARGE` (413), `UNSUPPORTED_FILE_TYPE` (415), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

### 11.8 Аналитика

```json
{
  "byType":   [{ "code": "certificate", "name": "...", "total": 128, "issued": 110, "rejected": 6 }],
  "avgProcessingDays": { "certificate": 2.4, "absence": 3.1 },
  "bottlenecks": [{ "department": "Профком", "avgDays": 6.2, "overdueCount": 9 }],
  "statusDistribution": { "IN_REVIEW": 24, "READY": 7, "ISSUED": 310 },
  "cellsUtilization": { "total": 40, "occupied": 12, "expired": 2 },
  "bookings": [{ "period": "Заезд №3", "quota": 30, "confirmed": 30, "waitlist": 8 }]
}
```

---

## 12. Права доступа (матрица)

| Действие | STUDENT | STAFF | TEACHER | ADMIN |
|---|---|---|---|---|
| Создать заявку | ✔ (свою) | — | — | ✔ |
| Смотреть заявку | ✔ (свою) | ✔ (если его подразделение есть в маршруте) | — | ✔ |
| Согласовать этап | — | ✔ (только `ACTIVE` этап своего подразделения) | — | ✔ |
| Загрузить файл | ✔ (в свою, DRAFT/NEEDS_FIX/AWAITING_SIGNATURE) | ✔ | — | ✔ |
| Отменить заявку | ✔ (свою, до APPROVED) | — | — | ✔ |
| Управлять ячейками | — | ✔ | — | ✔ |
| Реестр освобождённых | — | — | ✔ | ✔ |
| Типы, маршруты, периоды | — | — | — | ✔ |
| Журнал событий | — | — | — | ✔ |

Реализация: `RolesGuard` (по роли) + `ApplicationAccessGuard` (по владению/участию в маршруте). Оба применяются на контроллере, не в сервисе.

---

## 13. Нефункциональные требования

### 13.1 Безопасность

- Пароли — argon2id, минимум 8 символов, проверка на совпадение с email.
- Access-токен 15 мин, refresh 30 дней в `httpOnly; Secure; SameSite=Lax` cookie, ротация refresh при каждом обновлении.
- Rate limit: `/auth/login` — 5 попыток за 15 мин с одного IP, остальные эндпоинты — 100 запросов/мин.
- Все входные данные валидируются Zod-схемами. `data` заявки валидируется **по `fields_schema` типа** — лишние ключи отбрасываются.
- Файлы: проверка расширения **и** магических байтов, лимит 10 МБ, имя на диске — сгенерированный UUID, отдача только через контроллер с проверкой прав. Никакого прямого доступа к бакету.
- CORS — только домен фронтенда. Helmet. CSP без `unsafe-inline`.
- SQL — только через ORM/параметризованные запросы.
- Секреты — только в переменных окружения, `.env` в `.gitignore`.

### 13.2 Производительность

- Все списки — с пагинацией (`limit` по умолчанию 20, максимум 100).
- Индексы согласно разделу 4.
- Запрет N+1: выборка заявок с этапами — одним запросом с `include`.
- Время ответа API — до 300 мс на 95-м перцентиле при 100 одновременных пользователях.

### 13.3 Надёжность и наблюдаемость

- Структурированные логи (JSON) с `requestId`.
- `GET /health` — проверка БД, Redis, хранилища файлов.
- Ошибки не должны раскрывать стек-трейсы клиенту в production.
- Миграции БД — только через Prisma Migrate, применяются автоматически при старте контейнера.

### 13.4 Интерфейс

- Адаптивность от 360 px. Кабинет студента обязан быть удобным на телефоне.
- Каждое состояние экрана: загрузка (скелетон), пусто, ошибка, данные.
- Все действия, меняющие состояние, — с подтверждением и блокировкой кнопки на время запроса.
- Доступность: контраст не ниже 4.5:1, навигация с клавиатуры, подписи к полям формы.

---

## 14. Начальные данные (seed)

`prisma/seed.ts` создаёт:

1. **Администратора**: `admin@university.local` / пароль из `SEED_ADMIN_PASSWORD`.
2. **7 типов заявок** из раздела 5 с заполненными `fields_schema` и маршрутами.
3. **Подразделения** (как значения `department`): `Деканат`, `Канцелярия`, `Куратор`, `Заведующий отделением`, `Профком`, `Медпункт`, `Отдел кадров студентов`, `Бухгалтерия`, `Комиссия по заселению`.
4. **40 ячеек**: `A-01`…`A-20`, `B-01`…`B-20`, все `FREE`.
5. **3 периода заездов** с квотами 25, 30, 25.
6. **Демо-пользователей**: 10 студентов (5 бюджет, 5 внебюджет), по одному сотруднику на каждое подразделение, 2 преподавателя.
7. **Демо-заявки** во всех статусах — чтобы экраны не были пустыми на защите.

Минимальные `fields_schema`:

- `certificate`: `purpose` (SELECT), `copies` (NUMBER 1–5), `comment` (TEXTAREA)
- `sanatorium`: `period_id` (SELECT, заполняется из открытых периодов), `health_note` (FILE, optional)
- `absence`: `period` (DATE_RANGE), `reason` (SELECT: соревнования / олимпиада / конференция / иное), `call_letter` (FILE, required), `comment` (TEXTAREA)
- `dormitory`: `family_status` (SELECT), `documents` (FILE multiple), `comment` (TEXTAREA)
- `student_card`: `reason` (SELECT: утеря / порча / первичное получение), `photo` (FILE required)
- `financial_aid`: `reason` (TEXTAREA required), `documents` (FILE multiple required)
- `medical_note`: `period` (DATE_RANGE), `medical_certificate` (FILE required)

---

## 15. Тестирование

### 15.1 Обязательные юнит-тесты

- `application-state.machine`: все допустимые переходы проходят, все недопустимые бросают `INVALID_TRANSITION`.
- `access-rule.evaluator`: все операторы и комбинаторы, включая вложенность.
- `build-form-schema`: генерация Zod-схемы по `fields_schema` для каждого `FieldType`.
- `waitlist.service`: продвижение из очереди и пересчёт позиций.

### 15.2 Обязательные интеграционные тесты

- Полный цикл справки: создание → подача → согласование обоих этапов → назначение ячейки → выдача.
- Возврат на доработку и повторная подача: ранее согласованные этапы не пересогласовываются.
- Внебюджетник получает 403 с `denyMessage` при подаче на профилакторий.
- Превышение квоты: N+1-й студент попадает в `WAITLIST` с корректной позицией.
- **Конкурентная подача**: 50 параллельных запросов на период с квотой 10 → ровно 10 `CONFIRMED`.
- Студент A получает 403 при запросе заявки студента Б.
- Сотрудник не может согласовать этап чужого подразделения.
- Загрузка файла с подменённым расширением отклоняется.

### 15.3 E2E (Playwright)

- Сценарий студента: логин → подача справки → просмотр статуса → получение кода ячейки.
- Сценарий сотрудника: логин → очередь → согласование → возврат на доработку.
- Сценарий администратора: создание нового типа заявки через админку → студент видит его и подаёт. **Это ключевой тест архитектурного принципа.**

Целевое покрытие: ядро (`applications`, `bookings`, `cells`) — не ниже 80 %.

---

## 16. Порядок реализации

| Этап | Содержание | Готовность |
|---|---|---|
| 0 | Репозиторий, docker-compose (Postgres, Redis, MinIO), CI, `.env.example` | `docker compose up` поднимает окружение |
| 1 | Prisma-схема, миграции, seed, `users`, аутентификация, guards | Логин работает, роли различаются |
| 2 | Типы заявок, `fields_schema`, `access_rule`, CRUD в админке | Тип создаётся через API |
| 3 | Движок заявок: подача, генерация этапов, статусная машина, `event_log` | Заявка проходит маршрут через API |
| 4 | Файлы и хранилище | Загрузка и защищённая отдача |
| 5 | Модуль ячеек | Полный цикл выдачи |
| 6 | Модуль бронирования с блокировками | Конкурентный тест проходит |
| 7 | Уведомления, фоновые задачи | Уведомления приходят на все события из раздела 10 |
| 8 | Фронтенд: динамическая форма, кабинет студента | Студент подаёт заявку через UI |
| 9 | Фронтенд: кабинет сотрудника, ячейки | Сотрудник обрабатывает очередь |
| 10 | Генерация PDF, реестр освобождённых | Освобождение проходит полный цикл |
| 11 | Админка, аналитика, журнал событий | Все экраны из раздела 3 |
| 12 | Тесты, документация, деплой | Критерии раздела 17 выполнены |

---

## 17. Критерии приёмки MVP

- [ ] Студент подаёт справку, проходит маршрут, получает уведомление с номером ячейки и кодом, сотрудник подтверждает выдачу, заявка в `ISSUED`
- [ ] Студент-бюджетник записывается в профилакторий; внебюджетник получает 403 с понятным текстом причины
- [ ] При заполненной квоте студент попадает в лист ожидания и автоматически повышается до `CONFIRMED` при отмене чужой брони
- [ ] 50 параллельных запросов на период с квотой 10 дают ровно 10 подтверждённых броней
- [ ] Заявка на освобождение проходит маршрут, генерируется PDF, загружается подписанный скан, сотрудник подтверждает
- [ ] Преподаватель видит реестр освобождённых с фильтрами по группе и датам, выгружает CSV
- [ ] **Новый тип заявки с собственными полями и маршрутом создаётся через админку и работает без единой правки кода**
- [ ] Возврат на доработку не сбрасывает уже пройденные этапы
- [ ] Все изменения статусов присутствуют в журнале событий с указанием исполнителя
- [ ] Прямой запрос к чужой заявке возвращает 403
- [ ] Интерфейс студента корректно работает при ширине экрана 360 px
- [ ] `docker compose up` разворачивает систему с нуля, включая seed-данные
- [ ] Swagger доступен и описывает все эндпоинты
- [ ] CI зелёный: lint, тесты, сборка

---

## 18. Переменные окружения

```
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://okno:okno@postgres:5432/okno
REDIS_URL=redis://redis:6379

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

S3_ENDPOINT=http://minio:9000
S3_BUCKET=okno-files
S3_ACCESS_KEY=
S3_SECRET_KEY=

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=noreply@university.local

CELL_TTL_DAYS=7
MAX_FILE_SIZE_MB=10
CORS_ORIGIN=http://localhost:5173

SEED_ADMIN_EMAIL=admin@university.local
SEED_ADMIN_PASSWORD=
```

Проверка наличия и корректности всех обязательных переменных — при старте приложения. Отсутствие секрета — падение с внятным сообщением, а не запуск с дефолтом.

---

## 19. Разбивка на команду 4–5 человек

| # | Зона | Что делает | Файлы |
|---|---|---|---|
| 1 | Ядро | Схема БД, миграции, аутентификация, guards, движок заявок, статусная машина, маршруты, журнал событий | `modules/auth`, `modules/users`, `modules/applications`, `modules/events`, `prisma/` |
| 2 | Ячейки и файлы | Модуль ячеек, драйвер замков, хранилище файлов, cron просроченных | `modules/cells`, `modules/files`, `modules/jobs` |
| 3 | Бронирование | Периоды, квоты, лист ожидания, транзакции с блокировками, проверка `access_rule` | `modules/bookings`, `modules/application-types/access-rule.evaluator.ts` |
| 4 | Фронтенд-кабинеты | Динамическая форма по `fields_schema`, кабинет студента, кабинет сотрудника, уведомления | `apps/web/pages/student`, `apps/web/pages/staff`, `components/forms` |
| 5 | Документы, админка, качество | Генерация PDF, реестр освобождённых, админ-экраны, аналитика, тесты, документация, деплой | `modules/documents`, `modules/absences`, `modules/analytics`, `apps/web/pages/admin`, `test/`, `docs/` |

Точки стыковки, которые нужно согласовать в первую неделю: типы в `packages/shared` (их правит только участник №1), формат `fields_schema` (№1 и №4), контракт `CellLockDriver` (№2).

---

## 20. Глоссарий

| Термин | Значение |
|---|---|
| Заявка | Экземпляр обращения студента, `applications` |
| Тип заявки | Конфигурация вида обращения, `application_types` |
| Маршрут | Упорядоченный набор этапов согласования, `route_steps` |
| Этап | Конкретный шаг конкретной заявки, `application_stages` |
| Ячейка | Физический бокс для выдачи документа, `cells` |
| Период заезда | Временной интервал с квотой мест, `booking_periods` |
| Бронь | Занятое или ожидающее место в периоде, `bookings` |
| SLA | Нормативный срок прохождения этапа в рабочих днях |
| Лист ожидания | Очередь на освободившееся место, `bookings.status = WAITLIST` |
