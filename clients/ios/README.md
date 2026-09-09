# iOS — Единое окно студента

Пока не инициализирован. Каркас создаётся на неделе 1 (см. `docs/plan.md`).

## План каркаса

- Xcode-проект `EdinoeOkno` (SwiftUI, iOS 16+), SPM-зависимости.
- `swift-openapi-generator` как build-плагин; источник — `apps/api` `openapi.json`.
- `DesignSystem/` — регистрация шрифтов из `design/fonts`, бренд-палитра, примитивы
  `OutlinedCard`, `StatusBadge`, `RouteTimeline`, `PillButton`, `SkeletonRow`,
  `EmptyState`, `Toast` (спеки — `docs/architecture.md`).
- `Networking/` — `APIClient`, `TokenStore` (Keychain), интерсептор 401 → refresh.
- `Features/` — Auth, Applications, Catalog, DynamicForm, Cells, Bookings, Registry,
  Admin, Notifications, Profile.
- Пуши: APNs, `POST /devices`.
- Публикация: Apple Developer Program, bundle `local.university.edinoe-okno`,
  TestFlight → App Store.
