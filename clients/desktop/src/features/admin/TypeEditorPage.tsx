import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FieldsSchema } from '@edinoe-okno/shared';
import { ApiException, apiFetch } from '../../lib/api';
import type { ApplicationType } from '../../lib/types';
import { Button, Card, ErrorBox, PageHeader, SectionLabel, Skeleton } from '../../components/ui';
import { FieldsSchemaEditor } from './FieldsSchemaEditor';
import { RouteEditor, type RouteStepDraft } from './RouteEditor';

interface Draft {
  name: string;
  description: string;
  usesCell: boolean;
  usesBooking: boolean;
  requiresSignature: boolean;
  documentTemplate: string;
  fieldsSchema: FieldsSchema;
  steps: RouteStepDraft[];
}

export function TypeEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = id === 'new';

  const {
    data: type,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['application-type', id],
    queryFn: () => apiFetch<ApplicationType>(`/application-types/${id}`),
    enabled: !!id && !isNew,
  });

  const [code, setCode] = useState('');
  const [draft, setDraft] = useState<Draft>({
    name: '',
    description: '',
    usesCell: false,
    usesBooking: false,
    requiresSignature: false,
    documentTemplate: '',
    fieldsSchema: [],
    steps: [],
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!type) return;
    setDraft({
      name: type.name,
      description: type.description ?? '',
      usesCell: type.usesCell,
      usesBooking: type.usesBooking,
      requiresSignature: type.requiresSignature,
      documentTemplate: (type as { documentTemplate?: string }).documentTemplate ?? '',
      fieldsSchema: (type.fieldsSchema as FieldsSchema) ?? [],
      steps: (type.routeSteps ?? []).map((s) => ({
        name: s.name,
        approverDepartment: s.approverDepartment,
        slaDays: s.slaDays,
        isAuto: s.isAuto,
        parallelGroup: (s as { parallelGroup?: number | null }).parallelGroup ?? null,
      })),
    });
  }, [type]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: draft.name,
        description: draft.description || undefined,
        usesCell: draft.usesCell,
        usesBooking: draft.usesBooking,
        requiresSignature: draft.requiresSignature,
        documentTemplate: draft.documentTemplate || undefined,
        fieldsSchema: draft.fieldsSchema,
      };

      const saved = isNew
        ? await apiFetch<ApplicationType>('/application-types', {
            method: 'POST',
            body: { code, ...body },
          })
        : await apiFetch<ApplicationType>(`/application-types/${id}`, {
            method: 'PATCH',
            body,
          });

      // Маршрут заменяется целиком отдельным эндпоинтом (ТЗ 11.2).
      if (draft.steps.length > 0) {
        await apiFetch(`/application-types/${saved.id}/route`, {
          method: 'PUT',
          body: { steps: draft.steps },
        });
      }
      return saved;
    },
    onSuccess: (result) => {
      setSaveError(null);
      setSaved(true);
      void qc.invalidateQueries({ queryKey: ['application-types'] });
      void qc.invalidateQueries({ queryKey: ['application-type', result.id] });
      if (isNew) navigate(`/admin/types/${result.id}`, { replace: true });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setSaveError(e instanceof ApiException ? e.error.message : 'Не удалось сохранить'),
  });

  if (!isNew && isLoading) return <Skeleton rows={5} />;
  if (!isNew && isError) return <ErrorBox message={(error as Error)?.message} onRetry={() => refetch()} />;

  const codeValid = !isNew || /^[a-z][a-z0-9_]*$/.test(code);
  const canSave = draft.name.trim().length > 0 && codeValid;

  return (
    <>
      <PageHeader
        kicker={isNew ? 'новый тип заявки' : 'конфигурация типа'}
        title={isNew ? 'Создание типа' : draft.name || type?.name || ''}
        actions={
          <div className="flex items-center gap-3">
            {saved && <span className="text-[13px] text-brand">Сохранено</span>}
            <Button variant="secondary" onClick={() => navigate('/admin/types')}>
              ← К списку
            </Button>
            <Button loading={save.isPending} disabled={!canSave} onClick={() => save.mutate()}>
              Сохранить
            </Button>
          </div>
        }
      />

      <Card className="mb-6 grid grid-cols-2 gap-3 p-5">
        {isNew && (
          <label className="col-span-2 flex flex-col gap-1.5">
            <SectionLabel>машинный код</SectionLabel>
            <input
              className="rounded-pill border border-line px-3.5 py-2.5 text-[15px] focus-visible:border-brand"
              placeholder="latin_snake_case, напр. transcript"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {!codeValid && code !== '' && (
              <span className="text-[12px] text-alert">Только латиница, цифры и подчёркивание</span>
            )}
          </label>
        )}

        <label className="col-span-2 flex flex-col gap-1.5">
          <SectionLabel>название для студента</SectionLabel>
          <input
            className="rounded-pill border border-line px-3.5 py-2.5 text-[15px] focus-visible:border-brand"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>

        <label className="col-span-2 flex flex-col gap-1.5">
          <SectionLabel>пояснение на экране выбора</SectionLabel>
          <textarea
            rows={2}
            className="resize-none rounded-pill border border-line px-3.5 py-2.5 text-[15px] focus-visible:border-brand"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>

        <div className="col-span-2 flex flex-wrap gap-4">
          {(
            [
              ['usesCell', 'выдаётся через ячейку'],
              ['usesBooking', 'требует брони места'],
              ['requiresSignature', 'нужна офлайн-подпись'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        {draft.requiresSignature && (
          <label className="col-span-2 flex flex-col gap-1.5">
            <SectionLabel>html-шаблон документа</SectionLabel>
            <input
              className="rounded-pill border border-line px-3.5 py-2.5 text-[15px] focus-visible:border-brand"
              placeholder="напр. absence.html — файл из apps/api/templates"
              value={draft.documentTemplate}
              onChange={(e) => setDraft({ ...draft, documentTemplate: e.target.value })}
            />
          </label>
        )}
      </Card>

      <div className="mb-6">
        <FieldsSchemaEditor
          value={draft.fieldsSchema}
          onChange={(fieldsSchema) => setDraft({ ...draft, fieldsSchema })}
        />
      </div>

      <RouteEditor steps={draft.steps} onChange={(steps) => setDraft({ ...draft, steps })} />

      {saveError && (
        <div className="mt-4 rounded-pill border border-alert px-4 py-3 text-[13px] text-alert">
          {saveError}
        </div>
      )}

      <p className="mt-6 text-[12px] text-muted">
        Схема полей и маршрут — это данные, а не код. Сохранённый тип сразу появляется у студентов
        в каталоге и в мобильном приложении, ядро при этом не меняется.
      </p>
    </>
  );
}
