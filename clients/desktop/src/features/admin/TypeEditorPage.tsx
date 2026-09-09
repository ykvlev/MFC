import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { FieldsSchema } from '@edinoe-okno/shared';
import { apiFetch } from '../../lib/api';
import type { ApplicationType } from '../../lib/types';
import { DynamicForm } from '../../components/DynamicForm';
import { Button, Card, ErrorBox, PageHeader, SectionLabel, Skeleton } from '../../components/ui';

export function TypeEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'schema' | 'preview'>('schema');
  const { data: t, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['application-type', id],
    queryFn: () => apiFetch<ApplicationType>(`/application-types/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <Skeleton rows={5} />;
  if (isError || !t) return <ErrorBox message={(error as Error)?.message} onRetry={() => refetch()} />;

  const schema = (t.fieldsSchema as FieldsSchema) ?? [];

  return (
    <>
      <PageHeader
        kicker="конфигурация типа"
        title={t.name}
        actions={<Button variant="secondary" onClick={() => navigate('/admin/types')}>← К списку</Button>}
      />

      <div className="mb-5 flex gap-3">
        <SectionLabel>{t.code}</SectionLabel>
        {[
          ['uses_cell', t.usesCell],
          ['uses_booking', t.usesBooking],
          ['requires_signature', t.requiresSignature],
        ].map(([label, on]) => (
          <span
            key={label as string}
            className="rounded-pill border px-2.5 py-1 font-heading text-[11px]"
            style={{
              borderColor: on ? '#0804FF' : '#CCC',
              background: on ? '#0804FF' : '#FFF',
              color: on ? '#FFF' : '#818C99',
            }}
          >
            {label as string}: {on ? 'да' : 'нет'}
          </span>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('schema')}
          className={`rounded-pill px-4 py-2 font-heading text-[13px] ${tab === 'schema' ? 'bg-brand text-paper' : 'border border-line'}`}
        >
          fields_schema
        </button>
        <button
          onClick={() => setTab('preview')}
          className={`rounded-pill px-4 py-2 font-heading text-[13px] ${tab === 'preview' ? 'bg-brand text-paper' : 'border border-line'}`}
        >
          предпросмотр формы
        </button>
      </div>

      {tab === 'schema' && (
        <Card className="p-0">
          <pre className="overflow-auto p-4 text-[12px] leading-relaxed">
            {JSON.stringify(t.fieldsSchema, null, 2)}
          </pre>
        </Card>
      )}

      {tab === 'preview' && (
        <Card className="max-w-lg p-5">
          <DynamicForm schema={schema} submitLabel="(предпросмотр)" disabled onSubmit={() => undefined} />
        </Card>
      )}

      <div className="mt-6">
        <SectionLabel>route_steps</SectionLabel>
        <div className="mt-3 flex flex-col gap-2">
          {t.routeSteps?.map((s) => (
            <Card key={s.orderNum} className="flex items-baseline gap-3 p-3.5">
              <span className="font-num text-[18px] text-brand">{s.orderNum}</span>
              <span className="flex-1">
                <span className="block font-heading text-[15px] font-medium">{s.name}</span>
                <span className="text-[12px] text-muted">{s.approverDepartment}</span>
              </span>
              <span className="text-[12px] text-muted">{s.isAuto ? 'авто' : `${s.slaDays ?? '—'} раб. дн.`}</span>
            </Card>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[12px] text-muted">
        Редактирование схемы и маршрута — в следующей версии десктопа (PATCH / PUT route уже есть в API).
      </p>
    </>
  );
}
