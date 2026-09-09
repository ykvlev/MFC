import { useState } from 'react';
import type { FieldSchema, FieldsSchema } from '@edinoe-okno/shared';
import { Button } from './ui';

function optionList(f: FieldSchema): Array<{ value: string; label: string }> {
  return (f.options ?? []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

const inputCls =
  'w-full rounded-pill border border-line bg-paper px-3.5 py-2.5 text-[15px] focus-visible:border-brand';

export function DynamicForm({
  schema,
  onSubmit,
  submitLabel = 'Подать заявку',
  disabled,
}: {
  schema: FieldsSchema;
  onSubmit: (data: Record<string, unknown>) => void;
  submitLabel?: string;
  disabled?: boolean;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const f of schema) if (f.default !== undefined) init[f.key] = f.default;
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));

  function submit() {
    const missing = schema.filter((f) => f.required && (values[f.key] === undefined || values[f.key] === ''));
    if (missing.length) {
      setError('Заполните: ' + missing.map((f) => f.label.toLowerCase()).join(', '));
      return;
    }
    setError(null);
    onSubmit(values);
  }

  return (
    <div className="flex flex-col gap-4">
      {schema.map((f) => (
        <div key={f.key} className="flex flex-col gap-1.5">
          <label className="font-heading text-[14px] font-medium">
            {f.label}
            {f.required && <span className="ml-1 text-alert">*</span>}
          </label>
          {f.hint && <span className="text-[12px] text-muted">{f.hint}</span>}

          {(f.type === 'TEXT' || f.type === 'DATE') && (
            <input
              type={f.type === 'DATE' ? 'date' : 'text'}
              className={inputCls}
              value={(values[f.key] as string) ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
          {f.type === 'TEXTAREA' && (
            <textarea
              rows={4}
              className={`${inputCls} resize-none`}
              value={(values[f.key] as string) ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
          {f.type === 'NUMBER' && (
            <input
              type="number"
              className={inputCls}
              min={f.min}
              max={f.max}
              value={(values[f.key] as number) ?? ''}
              onChange={(e) => set(f.key, e.target.value === '' ? undefined : Number(e.target.value))}
            />
          )}
          {f.type === 'CHECKBOX' && (
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={Boolean(values[f.key])}
              onChange={(e) => set(f.key, e.target.checked)}
            />
          )}
          {f.type === 'SELECT' && (
            <div className="flex flex-wrap gap-2">
              {optionList(f).map((o) => {
                const active = values[f.key] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set(f.key, o.value)}
                    className={`min-h-[40px] rounded-pill border px-3.5 text-[14px] ${
                      active ? 'border-brand bg-brand text-paper' : 'border-line bg-paper'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}
          {f.type === 'DATE_RANGE' && (
            <div className="flex gap-2.5">
              <input
                type="date"
                className={inputCls}
                onChange={(e) => set(f.key, { ...(values[f.key] as object), from: e.target.value })}
              />
              <input
                type="date"
                className={inputCls}
                onChange={(e) => set(f.key, { ...(values[f.key] as object), to: e.target.value })}
              />
            </div>
          )}
          {f.type === 'FILE' && (
            <div className="rounded-pill border border-dashed border-line-hairline px-3.5 py-3 text-[13px] text-muted">
              Загрузка файлов — в мобильном приложении студента. Здесь только предпросмотр формы.
            </div>
          )}
        </div>
      ))}

      {error && <div className="text-[13px] text-alert">{error}</div>}
      <Button onClick={submit} disabled={disabled}>
        {submitLabel}
      </Button>
    </div>
  );
}
