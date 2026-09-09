/** Разбиение приёмного окна на слоты. Чистая функция — покрыта юнит-тестами. */

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Слоты окна [startTime, endTime) с шагом slotMinutes.
 * Неполный «хвост» короче шага отбрасывается.
 */
export function buildSlots(startTime: string, endTime: string, slotMinutes: number): string[] {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || slotMinutes <= 0 || end <= start) return [];
  const slots: string[] = [];
  for (let t = start; t + slotMinutes <= end; t += slotMinutes) slots.push(toHHMM(t));
  return slots;
}

export interface SlotAvailability {
  slotStart: string;
  capacity: number;
  booked: number;
  free: number;
}

export function withAvailability(
  slots: string[],
  capacity: number,
  bookedCounts: Map<string, number>,
): SlotAvailability[] {
  return slots.map((slotStart) => {
    const booked = bookedCounts.get(slotStart) ?? 0;
    return { slotStart, capacity, booked, free: Math.max(0, capacity - booked) };
  });
}
