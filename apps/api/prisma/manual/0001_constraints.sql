-- Ограничения из ТЗ, не выражаемые схемой Prisma декларативно.
-- Применять после первой миграции (`prisma migrate dev --name init`) или после
-- `prisma db push`. Идемпотентно.

-- ТЗ 4.2 bookings: одна активная бронь на пользователя и период.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_user_period_active
  ON bookings (user_id, period_id) WHERE status <> 'CANCELLED';

-- ТЗ 4.2 applications: GIN по data для поиска по значениям полей.
CREATE INDEX IF NOT EXISTS applications_data_gin
  ON applications USING GIN (data jsonb_path_ops);

-- ТЗ 4.2 booking_periods: корректность дат и квоты.
ALTER TABLE booking_periods DROP CONSTRAINT IF EXISTS booking_periods_dates_chk;
ALTER TABLE booking_periods ADD CONSTRAINT booking_periods_dates_chk CHECK (end_date > start_date);
ALTER TABLE booking_periods DROP CONSTRAINT IF EXISTS booking_periods_quota_chk;
ALTER TABLE booking_periods ADD CONSTRAINT booking_periods_quota_chk CHECK (quota > 0);

-- ТЗ 4.2 event_log: записи неизменяемы. Роль приложения теряет UPDATE/DELETE.
-- (в проде выделить отдельную БД-роль только для вставки в журнал)
DO $$
BEGIN
  EXECUTE format('REVOKE UPDATE, DELETE ON event_log FROM %I', current_user);
EXCEPTION WHEN insufficient_privilege OR undefined_object THEN
  RAISE NOTICE 'event_log REVOKE пропущен: %', SQLERRM;
END $$;
