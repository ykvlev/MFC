# Архитектура

## Обзор

```
              ┌─────────────┐   ┌──────────────┐   ┌───────────────┐
              │  iOS (Swift) │   │ Android (KT) │   │ Desktop(Tauri)│
              └──────┬──────┘   └──────┬───────┘   └───────┬───────┘
                     │  клиенты из OpenAPI (openapi.json)  │
                     └────────────────┬───────────────────┘
                                      │  HTTPS  Bearer <access>
                              ┌───────┴────────┐
                              │  NestJS  API   │  /api/v1
                              │  (apps/api)    │
                              └───┬───┬────┬───┘
                     PostgreSQL ──┘   │    └── MinIO (S3)
                                    Redis (BullMQ)
```

`packages/shared` — общий TS: enum-типы, `fields_schema`/`access_rule` (типы + Zod),
`ALLOWED_TRANSITIONS`, матрица прав. Подключается бэкендом и десктопом напрямую;
для iOS/Android соответствующая логика портируется, а контракт данных приходит из
`openapi.json`.

## Дизайн-система РСО → платформенные токены

Источник: `design/tokens/`, `design/DESIGN-SYSTEM.md`, `design/prototype.dc.html`.

| Роль | Значение | iOS (SwiftUI) | Android (Compose) | Desktop (Tailwind) |
|---|---|---|---|---|
| brand/blue (ground + акцент) | `#0804FF` | `Color.brandBlue` | `BrandColors.Blue` | `brand` |
| blue-bright (hover) | `#5552FF` | `.brandBlueBright` | `Blue.Bright` | `brand-bright` |
| blue-tint | `#E1E0FF` | `.brandTint` | `Blue.Tint` | `brand-tint` |
| white / grey | `#FFFFFF` / `#EEEEEE` | системные | | |
| border / hairline | `#CCCCCC` / `#A8A8A8` | `.border` / `.hairline` | | |
| text primary / muted | `#000000` / `#818C99` | `.textPrimary` / `.textMuted` | | |
| alert | `#F23838` | `.alert` | | |
| surface muted / footer | `#F5F5F5` / `#F9F9F9` | | | |
| Титульный шрифт | Actay Wide Bold | `ActayWide-Bold` | `res/font/actay_wide_bold` | `font-title` |
| Заголовки / метки | Stolzl (Medium) | `Stolzl-Medium` | `stolzl_medium` | `font-heading` |
| Числа | Stolzl Light | `Stolzl-Light` | `stolzl_light` | `font-num` |
| Текст | Onest Regular | `Onest-Regular` | `onest_regular` | `font-sans` |
| Радиусы | 32 / 20 / 16 | `RoundedRectangle(cornerRadius:)` | `RoundedCornerShape` | `rounded-[32px]` … |
| Тени | нет | — | `tonalElevation = 0.dp` | без `shadow-*` |
| Движение | 120–200 мс, `cubic-bezier(.22,.61,.36,1)`, только opacity/цвет | `.animation(.easeOut(duration:0.16))` | `tween(160, easing = …)` | `transition` 160ms |

### Карта статусов заявки (badge bg / fg) — из прототипа

| Статус | Подпись | bg | fg |
|---|---|---|---|
| DRAFT | черновик | `#EEEEEE` | `#000000` |
| IN_REVIEW | на согласовании | `#E1E0FF` | `#0804FF` |
| NEEDS_FIX | на доработке | `#FFE9CC` | `#8A4B00` |
| AWAITING_SIGNATURE | нужна подпись | `#E1E0FF` | `#0804FF` |
| APPROVED | согласовано | `#E1E0FF` | `#0804FF` |
| READY | готово к выдаче | `#0804FF` | `#FFFFFF` |
| ISSUED | выдано | `#000000` | `#FFFFFF` |
| REJECTED | отклонено | `#F23838` | `#FFFFFF` |
| CANCELLED | отменено | `#EEEEEE` | `#818C99` |

### Цвета этапов маршрута (`RouteTimeline`)

- APPROVED — точка залита `#0804FF`, линия вниз `#0804FF`
- ACTIVE — обводка `#0804FF`, заливка белая
- RETURNED — `#F23838`
- PENDING — `#CCCCCC`, линия `#EEEEEE`

## Навигация по ролям (таб-бары из прототипа)

| Роль | Табы |
|---|---|
| STUDENT | Заявки · Каталог · Входящие · Профиль |
| STAFF | Очередь · Ячейки · Входящие · Профиль |
| TEACHER | Реестр · Профиль |
| ADMIN | Типы · Аналитика · Журнал · Профиль |

## Отклонения от ТЗ

См. `docs/adr/0002-native-clients.md` и раздел «Отклонения» в `docs/plan.md`.
Каждое место в коде помечается `// TZ-GAP: <описание>`.
