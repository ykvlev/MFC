# ADR 0002: Нативные мобильные клиенты + Tauri-десктоп вместо веб-фронта

## Статус
Принято (отклонение от ТЗ 1.2 и 2.1 по решению заказчика).

## Контекст
ТЗ явно ограничивает объём адаптивным вебом. Заказчик требует полноценные приложения
для iOS и Android с публикацией в сторах и отдельное устанавливаемое десктоп-приложение
для сотрудников, оформляющих справки.

## Решение
- **iOS** — Swift 5.9+, SwiftUI, цель iOS 16. Клиент из OpenAPI (`swift-openapi-generator`).
- **Android** — Kotlin, Jetpack Compose, minSdk 26. Клиент из OpenAPI (`openapi-generator`,
  retrofit2 + kotlinx-serialization).
- **Десктоп** — React-фронт из стека ТЗ 2.1 (Vite + TanStack Query + RHF + Zod + Tailwind
  + shadcn/ui), упакованный в **Tauri 2**; сборки `.msi` / `.dmg`, автообновление.
- Бэкенд, модель данных, API, статусная машина, права и модули — **без изменений**,
  строго по ТЗ.

## Отклонения, помеченные `// TZ-GAP`
1. `apps/web` не реализуется как публичный сайт (его роль занимает Tauri-оболочка).
2. Refresh-токен: не `httpOnly` cookie, а Keychain / EncryptedSharedPreferences /
   Tauri secure store; передаётся в теле `POST /auth/refresh`.
3. CORS/CSP — только для Swagger и служебных страниц.
4. Динамическая форма и админ-редакторы реализуются трижды (SwiftUI, Compose, React).
5. Канал `PUSH` (APNs/FCM) добавлен к `IN_APP` и `EMAIL`; таблица `device_tokens`.

## Последствия
- Дублирование UI-логики форм на трёх платформах. Митигируется единым контрактом
  `fields_schema` и генерацией клиентов из одного `openapi.json`.
- Нужны платные аккаунты разработчика (Apple, Google) и code-signing для Windows.
