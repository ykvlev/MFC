# Окружение Windows — 9 сентября 2026

Перенос проекта на новый компьютер. Старые сведения о машине в HANDOFF.md
относятся к предыдущему окружению; ниже фиксируются реальные проверки нового.

## Установлено и проверено

- Node.js 22.23.2, pnpm 10.34.5 (версия из package.json), Git 2.55.0.windows.3.
- Исходные 663 npm-пакета восстановлены через `pnpm install --frozen-lockfile`.
  Перенесённый node_modules пересоздан.
- Prisma Client 5.22.0 сгенерирован по схеме проекта.
- `pnpm build`, `pnpm lint`, `pnpm test` проходят: API, shared и React-фронт;
  40 юнит-тестов (9 shared + 31 API).
- Puppeteer Chrome Headless Shell 131.0.6778.204: браузер запущен,
  пробный PDF с кириллицей успешно создан в памяти.
- Rustup 1.29.1, rustc 1.98.1, MSVC toolchain x86_64.
- `cargo fetch` завершён: разрешены 524 Rust-пакета, создан Cargo.lock.
- C++ workload добавлен в существующую Visual Studio 18 Insiders;
  Windows SDK 10.0.26100 установлен. Журнал установщика: Completed install.
- Используется уже установленный JDK 21.0.8 из
  `C:\Program Files\Android\openjdk\jdk-21.0.8`.
- Android command-line tools, platform android-35, build-tools 35.0.0,
  platform-tools установлены. Android Studio уже была установлена.
- Gradle 8.9 распакован в `%LOCALAPPDATA%\Programs\Gradle\gradle-8.9`;
  SHA-256 проверена по официальному файлу Gradle.
- Gradle wrapper создан официальным Gradle 8.9 и добавлен в Android-проект.
- Android `assembleDebug` впервые успешно завершён. APK:
  `clients/android/app/build/outputs/apk/debug/app-debug.apk`.
  Размер 12 644 954 байта; `apksigner verify --verbose` подтвердил подпись v2.
  Исправлены только ошибки компиляции: вложенный комментарий, видимость FieldValue,
  отсутствующие импорты rememberSaveable в трёх экранах.
- WSL 2.7.13 установлена. Виртуализация в BIOS включена.

## PowerShell

Из корня репозитория:

```powershell
. ./scripts/dev-env.ps1
```

Скрипт добавляет установленные инструменты в PATH текущего терминала,
настраивает JAVA_HOME/ANDROID_HOME, загружает простые KEY=value из корневого
`.env`. Уже заданные переменные имеют приоритет. Это важно для команд pnpm:
они запускают API из apps/api, где корневой `.env` автоматически не читается.
После установки инструментов старые окна терминала также можно перезапустить.

Локальный `.env` создан по `.env.example` со случайными JWT-секретами и
SEED_ADMIN_PASSWORD. Он исключён из Git; пароль смотреть только локально.
База пока не инициализирована, учётная запись администратора ещё не создана.

```powershell
pnpm.cmd build
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd dev:api
# В отдельном терминале, после подключения dev-env.ps1:
pnpm.cmd --filter @edinoe-okno/desktop dev
```

## Дальнейшая проверка

Включение VirtualMachinePlatform для WSL ещё выполняется средствами Windows.
Windows уже выставила флаг RebootPending. Перезагрузка автоматически не выполнялась.
На последней проверке Win32_OptionalFeature показывает InstallState=2 для
VirtualMachinePlatform: включение пока не подтверждено. Дождаться завершения
установки компонента, затем перезагрузить компьютер и проверить `docker info`.
Журнал установки находится в `%WINDIR%\Logs\DISM\dism.log`, подробный —
`%WINDIR%\Logs\CBS\CBS.log`. Логи пробных сборок — `%TEMP%\mfc-setup`.

Запуск API выявил отсутствующий `class-validator`, необходимый глобальному
NestJS ValidationPipe. Добавлены class-validator 0.14.0 и class-transformer 0.5.1
в зависимости API и pnpm-lock.yaml. Повторные lint и 31 тест API проходят.
Повторный запуск API проходит инициализацию модулей и маршрутов и останавливается
на Prisma P1001: PostgreSQL на localhost:55432 ещё не запущен.

Запуск API с PostgreSQL, миграции, seed и интеграционные тесты пока не проверены.
Первый Android assembleDebug остановился на получении Kotlin serialization
plugin 2.0.21. Повторный запуск скачал зависимости и выявил ошибки исходников.
После их исправления `assembleDebug` прошёл (41 задача, 3 мин 21 с).
Работа приложения на устройстве и обмен с API пока не проверены.

`cargo check --locked -j 2` начал компиляцию, но Windows запретила запуск
`target/debug/build/getrandom-3d110213465e829b/build-script-build.exe`
(`os error 4551`). Это подтверждено событием CodeIntegrity/Operational 3077:
файл не удовлетворяет требованиям подписи/политике целостности кода.
Политика защиты не менялась. До устранения блокировки локальная сборка Tauri
не проверена. Также в исходном проекте отсутствует папка src-tauri/icons,
хотя tauri.conf.json ссылается на её файлы; это отдельная незавершённость проекта.

После готовности Docker:

```powershell
. ./scripts/dev-env.ps1
docker info
docker compose up -d
pnpm.cmd --filter @edinoe-okno/api prisma:migrate --name init
pnpm.cmd --filter @edinoe-okno/api prisma:deploy
pnpm.cmd --filter @edinoe-okno/api prisma:seed
pnpm.cmd dev:api
```

Интеграционные тесты очищают таблицы. Для них использовать отдельную тестовую
БД, а не БД с пользовательскими или демо-данными.

Официальные источники инструментов:
[Android](https://developer.android.com/studio),
[Gradle 8.9](https://services.gradle.org/distributions/gradle-8.9-bin.zip.sha256),
[требования Tauri](https://v2.tauri.app/start/prerequisites/).
