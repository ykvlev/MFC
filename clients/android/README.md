# Android — Единое окно студента

Kotlin + Jetpack Compose, minSdk 26 / targetSdk 35. Дизайн-система РСО общая
с десктопом и iOS (см. `docs/architecture.md`).

## Сборка

На этой машине нет Android SDK, поэтому проект собран как исходники и **ещё не
компилировался**. Чтобы собрать:

1. Установить Android Studio (или command-line tools + SDK 35, build-tools 35).
2. Открыть папку `clients/android` в Android Studio — она сама подтянет
   Gradle-обёртку и синхронизирует зависимости.
3. Либо из консоли, если Gradle установлен глобально:

```bash
cd clients/android
gradle wrapper          # один раз, создаёт gradlew и gradle-wrapper.jar
./gradlew assembleDebug
```

`gradle-wrapper.jar` намеренно не коммитился (бинарник); `gradle wrapper`
или Android Studio создают его локально.

## Адрес API

`BuildConfig.API_BASE`:

| Сборка | Адрес |
|---|---|
| debug | `http://10.0.2.2:3000/api/v1` — хост-машина с точки зрения эмулятора |
| release | `https://okno.university.local/api/v1` |

Открытый HTTP разрешён только для `10.0.2.2` и `localhost`
(`res/xml/network_security_config.xml`), в релизе cleartext запрещён.

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
