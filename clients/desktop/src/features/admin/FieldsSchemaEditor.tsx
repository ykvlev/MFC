import { useMemo, useState } from 'react';
import { fieldsSchema as fieldsSchemaZod, type FieldsSchema } from '@edinoe-okno/shared';
import { DynamicForm } from '../../components/DynamicForm';
import { Card, SectionLabel } from '../../components/ui';

const FIELD_TYPES = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'DATE_RANGE',
  'SELECT',
  'CHECKBOX',
  'FILE',
] as const;

const inputCls =
  'rounded-pill border border-line bg-paper px-3 py-2 text-[14px] focus-visible:border-brand';

/**
 * Редактор схемы полей. Слева — визуальный конструктор, справа — живой
 * предпросмотр формы, которую увидит студент. Схема валидируется той же
 * Zod-схемой, что и на сервере (packages/shared), — невалидную не сохранить.
 */
export function FieldsSchemaEditor({
  value,
  onChange,
}: {
  value: FieldsSchema;
  onChange: (next: FieldsSchema) => void;
}) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(value, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const validation = useMemo(() => fieldsSchemaZod.safeParse(value), [value]);

  function update(index: number, patch: Record<string, unknown>) {
    onChange(value.map((f, i) => (i === index ? { ...f, ...patch } : f)) as FieldsSchema);
  }
  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index) as FieldsSchema);
  }
  function add() {
    onChange([
      ...value,
      { key: `field_${value.length + 1}`, label: 'Новое поле', type: 'TEXT', required: false },
    ] as FieldsSchema);
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonDraft);
      const result = fieldsSchemaZod.safeParse(parsed);
      if (!result.success) {
        setJsonError(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
        return;
      }
      setJsonError(null);
      onChange(parsed as FieldsSchema);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_360px] gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionLabel>fields_schema</SectionLabel>
          <div className="flex gap-2">
            {(['visual', 'json'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  if (m === 'json') setJsonDraft(JSON.stringify(value, null, 2));
                  setMode(m);
                }}
                className={`rounded-pill px-3 py-1.5 font-heading text-[12px] ${
                  mode === m ? 'bg-brand text-paper' : 'border border-line'
                }`}
              >
                {m === 'visual' ? 'конструктор' : 'JSON'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'json' ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="h-[420px] w-full rounded-pill border border-line bg-paper p-3 font-num text-[12px] leading-relaxed"
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
              spellCheck={false}
            />
            {jsonError && <div className="text-[13px] text-alert">{jsonError}</div>}
            <button
              onClick={applyJson}
              className="self-start rounded-pill bg-brand px-4 py-2 font-heading text-[14px] text-paper"
            >
              Применить JSON
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {value.length === 0 && (
              <div className="rounded-pill border border-dashed border-line-hairline px-4 py-3 text-[13px] text-muted">
                Полей нет. Тип без полей тоже валиден — форма будет пустой.
              </div>
            )}

            {value.map((field, i) => (
              <Card key={i} className="p-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    className={inputCls}
                    placeholder="key (латиница, snake_case)"
                    value={field.key}
                    onChange={(e) => update(i, { key: e.target.value })}
                  />
                  <select
                    className={inputCls}
                    value={field.type}
                    onChange={(e) => update(i, { type: e.target.value })}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    className={`${inputCls} col-span-2`}
                    placeholder="Подпись поля для студента"
                    value={field.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                  <input
                    className={`${inputCls} col-span-2`}
                    placeholder="Подсказка (необязательно)"
                    value={field.hint ?? ''}
                    onChange={(e) => update(i, { hint: e.target.value || undefined })}
                  />

                  {field.type === 'SELECT' && (
                    <input
                      className={`${inputCls} col-span-2`}
                      placeholder="Варианты через запятую"
                      value={(field.options ?? [])
                        .map((o) => (typeof o === 'string' ? o : o.value))
                        .join(', ')}
                      onChange={(e) =>
                        update(i, {
                          options: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  )}

                  {field.type === 'NUMBER' && (
                    <div className="col-span-2 flex items-center gap-2 text-[13px]">
                      <span className="text-muted">от</span>
                      <input
                        type="number"
                        className={`${inputCls} w-20`}
                        value={field.min ?? ''}
                        onChange={(e) =>
                          update(i, { min: e.target.value === '' ? undefined : Number(e.target.value) })
                        }
                      />
                      <span className="text-muted">до</span>
                      <input
                        type="number"
                        className={`${inputCls} w-20`}
                        value={field.max ?? ''}
                        onChange={(e) =>
                          update(i, { max: e.target.value === '' ? undefined : Number(e.target.value) })
                        }
                      />
                    </div>
                  )}

                  {field.type === 'FILE' && (
                    <input
                      className={`${inputCls} col-span-2`}
                      placeholder="Разрешённые расширения через запятую, напр. pdf, jpg"
                      value={(field.accept ?? []).join(', ')}
                      onChange={(e) =>
                        update(i, {
                          accept: e.target.value
                            .split(',')
                            .map((s) => s.trim().toLowerCase())
                            .filter(Boolean),
                        })
                      }
                    />
                  )}

                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={field.required ?? false}
                      onChange={(e) => update(i, { required: e.target.checked })}
                    />
                    обязательное
                  </label>

                  <button
                    onClick={() => remove(i)}
                    className="justify-self-end rounded-pill border border-alert px-3 py-1.5 text-[13px] text-alert"
                  >
                    Удалить поле
                  </button>
                </div>
              </Card>
            ))}

            <button
              onClick={add}
              className="self-start rounded-pill border border-line px-4 py-2 font-heading text-[14px] hover:bg-surface-muted"
            >
              + Добавить поле
            </button>
          </div>
        )}

        {!validation.success && (
          <div className="rounded-pill border border-alert px-4 py-3 text-[13px] text-alert">
            Схема невалидна:{' '}
            {validation.error.issues.map((i) => `${i.path.join('.')} — ${i.message}`).join('; ')}
          </div>
        )}
      </div>

      {/* Живой предпросмотр — ровно то, что увидит студент */}
      <div className="flex flex-col gap-3">
        <SectionLabel>предпросмотр формы</SectionLabel>
        <Card className="p-5">
          {validation.success ? (
            <DynamicForm
              schema={value}
              submitLabel="(предпросмотр)"
              disabled
              onSubmit={() => undefined}
            />
          ) : (
            <div className="text-[13px] text-muted">Исправьте схему, чтобы увидеть форму.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
