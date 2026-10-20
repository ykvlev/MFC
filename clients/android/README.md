# Android — Единое окно студента

Kotlin + Jetpack Compose, minSdk 26 / targetSdk 35. Дизайн-система РСО общая
с десктопом и iOS (см. `docs/architecture.md`).

## Сборка

Debug APK собран и проверен 20 октября 2026. Подробный отчёт —
`docs/verification-2026-10-20.md`. Для новой машины:

1. Установить Android Studio (или command-line tools + SDK 35, build-tools 35).
2. Открыть папку `clients/android` в Android Studio — она сама подтянет
   Gradle-обёртку и синхронизирует зависимости.
3. Либо из консоли:

```bash
cd clients/android
./gradlew assembleDebug
```

Gradle wrapper включён в репозиторий. Глобальная установка Gradle не нужна.

## Адрес API

`BuildConfig.API_BASE`:

| Сборка | Адрес |
|---|---|
| debug | `http://10.0.2.2:3000/api/v1` — хост-машина с точки зрения эмулятора |
| release | `https://okno.university.local/api/v1` |

В debug-сборке адрес меняется на экране входа, поле «Адрес сервера».
Он сохраняется на устройстве; при смене сервера старые токены удаляются.
Адрес должен оканчиваться на `/api/v1`. Настройка применяется к API и refresh.
Открытый HTTP разрешён только debug-ресурсом; в release он запрещён.

### Подключение настоящего телефона

`10.0.2.2` — специальный адрес Android Emulator, на телефоне он не работает.
Выбрать один способ:

- USB: включить отладку, разрешить компьютер на телефоне, выполнить
  `adb reverse tcp:3000 tcp:3000`; в приложении указать
  `http://localhost:3000/api/v1`.
- Wi-Fi: компьютер и телефон должны быть в одной сети; указать
  `http://IP-КОМПЬЮТЕРА:3000/api/v1`. Windows Firewall должен разрешать
  вход к API в доверенной сети. Порт PostgreSQL телефону не нужен.
- Размещённый сервер: использовать его HTTPS-адрес `/api/v1`.

API и PostgreSQL должны работать. Для первичной проверки открыть на телефоне
URL сервера с `/health` после `/api/v1`; ожидается `status: ok` и база `ok`.
Схема соединения: телефон → API NestJS → PostgreSQL; пароль БД не помещается в APK.
Release-адрес `okno.university.local` пока заглушка, не публичный сервер.

## Структура

```
app/src/main/java/local/university/edinoeokno/
├─ designsystem/     Theme, Typography, Components, StatusMeta, RouteTimeline
├─ network/          TokenStore, интерсепторы, OknoApi (Retrofit), Hilt-модуль
├─ model/            модели контракта API
├─ data/             OknoRepository, UiState
├─ navigation/       OknoApp (Scaffold + NavHost), Routes, вкладки по ролям
└─ feature/
   ├─ auth/          AuthRepository, AuthViewModel, LoginScreen
   ├─ applications/  список заявок и очередь, экран рассмотрения
   ├─ catalog/       каталог типов заявок
   ├─ cells/         сетка ячеек, подтверждение выдачи
   ├─ registry/      реестр освобождённых
   ├─ slots/         запись на приём
   ├─ notifications/ входящие
   └─ profile/       аккаунт и выход
```

## Что реализовано

- Вход по email и паролю, восстановление сессии при старте.
- Токены: access — в памяти, refresh — в `EncryptedSharedPreferences`.
  На 401 `RefreshAuthenticator` обновляет пару и повторяет запрос; ротация
  refresh сохраняется (ТЗ 13.1). При провале — сигнал «сессия истекла» и выход
  на экран входа.
- Вкладки по роли, как в прототипе: студент, сотрудник, преподаватель, админ.
- Каждый экран имеет четыре состояния: загрузка, пусто, ошибка, данные (ТЗ 13.4).
- Дизайн-система: палитра из четырёх цветов, шрифты Actay Wide / Stolzl / Onest,
  контурные карточки без теней, радиусы 32/20/16, переходы 160 мс.

## Что осталось

- Динамическая форма по `fields_schema` (сейчас в один тап подаются только
  типы без обязательных полей).
- Загрузка файлов (вложения, подписанный скан).
- Пуши через Firebase Cloud Messaging и регистрация токена устройства
  (эндпоинт `POST /devices` в `OknoApi` уже есть).
- Экраны администратора: типы заявок, аналитика, журнал событий.
- Compose UI-тесты и прогон на устройстве.
