import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApplicationType } from '../../lib/types';
import { Card, ErrorBox, PageHeader, Skeleton } from '../../components/ui';

export function TypesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['application-types'],
    queryFn: () => apiFetch<ApplicationType[]>('/application-types'),
  });

  return (
    <>
      <PageHeader kicker="конфигурация" title="Типы заявок" />
      <Card className="mb-4 border-brand p-4 text-[13px] leading-relaxed">
        Новый тип заявки — это запись конфигурации: схема полей, маршрут, правило доступа.
        Правок кода ядра не требуется.
      </Card>

      {isLoading && <Skeleton rows={5} />}
      {isError && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}

      <div className="flex flex-col gap-2">
        {data?.map((t) => (
          <button key={t.id} onClick={() => navigate(`/admin/types/${t.id}`)} className="text-left">
            <Card className="flex flex-col gap-1 p-4 hover:bg-surface-muted">
              <div className="flex items-center justify-between">
                <span className="font-heading text-[16px] font-medium">{t.name}</span>
                <span className="font-num text-[12px] text-muted">{t.code}</span>
              </div>
              <div className="text-[12px] text-muted">
                {(t.fieldsSchema as unknown[])?.length ?? 0} пол(я) ·{' '}
                {t.routeSteps?.length ?? 0} этап(а) ·{' '}
                {t.usesCell ? 'ячейка' : t.usesBooking ? 'бронь' : t.requiresSignature ? 'подпись' : 'без модулей'}
              </div>
            </Card>
          </button>
        ))}
      </div>
    </>
  );
}
