import { Button, Card, SectionLabel } from '../../components/ui';

export interface RouteStepDraft {
  name: string;
  approverDepartment: string;
  slaDays: number | null;
  isAuto: boolean;
  parallelGroup: number | null;
}

/** Подразделения из seed (ТЗ §14 п.3). */
export const DEPARTMENTS = [
  'Деканат',
  'Канцелярия',
  'Куратор',
  'Заведующий отделением',
  'Профком',
  'Медпункт',
  'Отдел кадров студентов',
  'Бухгалтерия',
  'Комиссия по заселению',
  'Библиотека',
];

const inputCls =
  'rounded-pill border border-line bg-paper px-3 py-2 text-[14px] focus-visible:border-brand';

/**
 * Редактор маршрута. Этапы с одинаковой параллельной группой согласуются
 * одновременно и закрывают группу только когда пройдены все (обходной лист).
 */
export function RouteEditor({
  steps,
  onChange,
}: {
  steps: RouteStepDraft[];
  onChange: (next: RouteStepDraft[]) => void;
}) {
  function update(index: number, patch: Partial<RouteStepDraft>) {
    onChange(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  function remove(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }
  function add() {
    onChange([
      ...steps,
      { name: '', approverDepartment: DEPARTMENTS[0], slaDays: 2, isAuto: false, parallelGroup: null },
    ]);
  }

  // Подсказка: сколько этапов в каждой параллельной группе.
  const groupSizes = new Map<number, number>();
  for (const s of steps) {
    if (s.parallelGroup != null) {
      groupSizes.set(s.parallelGroup, (groupSizes.get(s.parallelGroup) ?? 0) + 1);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>route_steps</SectionLabel>

      {steps.length === 0 && (
        <div className="rounded-pill border border-dashed border-line-hairline px-4 py-3 text-[13px] text-muted">
          Маршрут пуст. Добавьте хотя бы один этап — иначе заявку некому согласовывать.
        </div>
      )}

      {steps.map((step, i) => {
        const inGroup = step.parallelGroup != null && (groupSizes.get(step.parallelGroup) ?? 0) > 1;
        return (
          <Card key={i} className={`p-4 ${inGroup ? 'border-brand' : ''}`}>
            <div className="flex items-start gap-3">
              <span className="mt-2 w-6 font-num text-[18px] text-brand">{i + 1}</span>

              <div className="grid flex-1 grid-cols-2 gap-2.5">
                <input
                  className={`${inputCls} col-span-2`}
                  placeholder="Название этапа, напр. «Согласование в деканате»"
                  value={step.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />

                <select
                  className={inputCls}
                  value={step.approverDepartment}
                  onChange={(e) => update(i, { approverDepartment: e.target.value })}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    className={`${inputCls} w-20`}
                    value={step.slaDays ?? ''}
                    disabled={step.isAuto}
                    onChange={(e) =>
                      update(i, { slaDays: e.target.value === '' ? null : Number(e.target.value) })
                    }
                  />
                  <span className="text-[13px] text-muted">раб. дн.</span>
                </div>

                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={step.isAuto}
                    onChange={(e) =>
                      update(i, { isAuto: e.target.checked, slaDays: e.target.checked ? null : 2 })
                    }
                  />
                  авто-этап (проверка access_rule)
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-muted">параллельная группа</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="—"
                    className={`${inputCls} w-16`}
                    value={step.parallelGroup ?? ''}
                    onChange={(e) =>
                      update(i, {
                        parallelGroup: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-icon border border-line px-2 py-1 text-[12px] disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  className="rounded-icon border border-line px-2 py-1 text-[12px] disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(i)}
                  className="rounded-icon border border-alert px-2 py-1 text-[12px] text-alert"
                >
                  ×
                </button>
              </div>
            </div>

            {inGroup && (
              <div className="mt-2 text-[12px] text-brand">
                Согласуется параллельно с другими этапами группы {step.parallelGroup}
              </div>
            )}
          </Card>
        );
      })}

      <Button variant="secondary" onClick={add} className="self-start">
        + Добавить этап
      </Button>
    </div>
  );
}
