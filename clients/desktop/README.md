# Десктоп — Единое окно студента (Tauri 2 + React)

Пока не инициализирован. Каркас создаётся на неделе 1 (см. `docs/plan.md`).

## План каркаса

- `pnpm create tauri-app` → React + Vite + TypeScript, добавить в pnpm workspace.
- Стек ТЗ 2.1: React Router 6, TanStack Query 5, React Hook Form + Zod, Tailwind + shadcn/ui.
- `@edinoe-okno/shared` подключается напрямую (`workspace:*`).
- Клиент API — из `openapi.json` (`openapi-typescript` + типизированный fetch),
  интерсептор 401 → refresh, refresh в Tauri secure store.
- Плагины Tauri: `updater` (манифест на статике вуза), `dialog` (файлы),
  печать PDF через системный диалог.
- Приоритетные экраны: рабочее место сотрудника (очередь, рассмотрение, ячейки, печать),
  полный ADMIN (`FieldsSchemaEditor`, `RouteEditor`, аналитика, журнал), реестр TEACHER.
- Сборка: `.msi` (Windows) + `.dmg` (macOS), подпись + нотаризация.
