# Миграции

Применение готовых миграций к новой базе:

```bash
pnpm --filter @edinoe-okno/api prisma:deploy
```

## Ограничения базы

Миграция `20260910000001_constraints` уже включает следующие ограничения.
Копия SQL для ручной проверки лежит в `../manual/0001_constraints.sql`.
Дополнительные папки внутри `migrations` создавать нельзя: Prisma считает их миграциями.

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
