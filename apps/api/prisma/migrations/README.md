# Миграции

Генерация первой миграции (нужен запущенный Postgres из `docker compose up`):

```bash
pnpm --filter @edinoe-okno/api prisma:migrate --name init
```

## Ручные доработки после `init`

Prisma не выражает часть требований ТЗ декларативно. После генерации `init`
добавить в неё (или отдельной миграцией) следующий SQL:

1. **Частичный уникальный индекс броней** (ТЗ 4.2 `bookings`):
   ```sql
   CREATE UNIQUE INDEX bookings_user_period_active
     ON bookings (user_id, period_id) WHERE status <> 'CANCELLED';
   ```
2. **GIN-индекс по `applications.data`** (ТЗ 4.2):
   ```sql
   CREATE INDEX applications_data_gin ON applications USING GIN (data jsonb_path_ops);
   ```
3. **CHECK для периодов** (ТЗ 4.2 `booking_periods`):
   ```sql
   ALTER TABLE booking_periods ADD CONSTRAINT booking_periods_dates_chk CHECK (end_date > start_date);
   ALTER TABLE booking_periods ADD CONSTRAINT booking_periods_quota_chk CHECK (quota > 0);
   ```
4. **Неизменяемость `event_log`** (ТЗ 4.2): роль приложения не должна иметь
   UPDATE/DELETE на `event_log`.
   ```sql
   REVOKE UPDATE, DELETE ON event_log FROM okno;
   ```
   (или отдельная БД-роль только для записи журнала).
