import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Card, ErrorBox, PageHeader, SectionLabel, Skeleton } from '../../components/ui';

interface Summary {
  byType: Array<{ code: string; name: string; total: number; issued: number; rejected: number }>;
  avgProcessingDays: Record<string, number>;
  bottlenecks: Array<{ department: string; avgDays: number; overdueCount: number }>;
  statusDistribution: Record<string, number>;
  cellsUtilization: { total: number; occupied: number; expired: number };
  bookings: Array<{ period: string; quota: number; confirmed: number; waitlist: number }>;
}

export function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiFetch<Summary>('/admin/analytics/summary'),
  });

  if (isLoading) return <><PageHeader kicker="аналитика" title="Сводка" /><Skeleton rows={5} /></>;
  if (isError || !data) return <ErrorBox message={(error as Error)?.message} onRetry={() => refetch()} />;

  const maxTotal = Math.max(1, ...data.byType.map((b) => b.total));

  return (
    <>
      <PageHeader kicker="аналитика" title="Сводка" />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="font-num text-[26px] text-brand">{data.byType.reduce((s, b) => s + b.total, 0)}</div>
          <div className="mt-1 text-[12px] text-muted">заявок всего</div>
        </Card>
        <Card className="p-4">
          <div className="font-num text-[26px] text-brand">
            {data.cellsUtilization.occupied}/{data.cellsUtilization.total}
          </div>
          <div className="mt-1 text-[12px] text-muted">ячейки заняты</div>
        </Card>
        <Card className="p-4">
          <div className="font-num text-[26px] text-brand">{data.bottlenecks.reduce((s, b) => s + b.overdueCount, 0)}</div>
          <div className="mt-1 text-[12px] text-muted">просроченных этапов</div>
        </Card>
      </div>

      <SectionLabel>Заявки по типам</SectionLabel>
      <div className="mb-6 mt-3 flex flex-col gap-2.5">
        {data.byType.map((b) => (
          <div key={b.code} className="flex flex-col gap-1">
            <div className="flex justify-between text-[14px]">
              <span>{b.name}</span>
              <span className="font-num text-muted">{b.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-grey">
              <div className="h-full bg-brand" style={{ width: `${(b.total / maxTotal) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Узкие места</SectionLabel>
      <div className="mt-3 flex flex-col gap-2">
        {data.bottlenecks.map((b) => (
          <Card key={b.department} className="flex justify-between p-3.5 text-[14px]">
            <span>{b.department}</span>
            <span className="font-num" style={{ color: b.overdueCount > 0 ? '#F23838' : '#0804FF' }}>
              {b.avgDays} дн. · {b.overdueCount} просроч.
            </span>
          </Card>
        ))}
      </div>
    </>
  );
}
