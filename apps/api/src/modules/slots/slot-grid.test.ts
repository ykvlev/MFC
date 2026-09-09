import { describe, expect, it } from 'vitest';
import { buildSlots, toHHMM, toMinutes, withAvailability } from './slot-grid.js';

describe('slot-grid', () => {
  it('toMinutes / toHHMM', () => {
    expect(toMinutes('10:30')).toBe(630);
    expect(toHHMM(630)).toBe('10:30');
    expect(toHHMM(9 * 60)).toBe('09:00');
  });

  it('разбивает окно на слоты', () => {
    expect(buildSlots('10:00', '11:00', 15)).toEqual(['10:00', '10:15', '10:30', '10:45']);
  });

  it('отбрасывает неполный хвост', () => {
    expect(buildSlots('10:00', '10:50', 20)).toEqual(['10:00', '10:20']);
  });

  it('пустой результат на некорректных границах', () => {
    expect(buildSlots('12:00', '10:00', 15)).toEqual([]);
    expect(buildSlots('10:00', '11:00', 0)).toEqual([]);
  });

  it('считает свободные места по слотам', () => {
    const slots = buildSlots('10:00', '10:45', 15);
    const booked = new Map([['10:00', 2]]);
    expect(withAvailability(slots, 2, booked)).toEqual([
      { slotStart: '10:00', capacity: 2, booked: 2, free: 0 },
      { slotStart: '10:15', capacity: 2, booked: 0, free: 2 },
      { slotStart: '10:30', capacity: 2, booked: 0, free: 2 },
    ]);
  });
});
