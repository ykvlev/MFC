import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Page } from '../../lib/types';
import { Card, ErrorBox, PageHeader, Skeleton } from '../../components/ui';

interface Entry {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  applicationId: string | null;
  actorId: string | null;
  createdAt: string;
}

export function EventLogPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['event-log', action, page],
    queryFn: () => apiFetch<Page<Entry>>('/admin/event-log', { query: { action: action || undefined, page, limit: 30 } }),
  });

  return (
    <>
      <PageHeader
        kicker="журнал событий"
        title="Аудит"
        actions={
          <input
            placeholder="action, напр. application.submitted"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="w-72 rounded-pill border border-line px-3.5 py-2 text-[14px]"
          />
        }
      />
      {isLoading && <Skeleton rows={6} />}
      {isError && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}

      <div className="flex flex-col gap-2">
        {data?.items.map((e) => (
          <Card key={e.id} className="flex gap-3 p-3.5">
            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand" />
            <div className="min-w-0 flex-1">
              <div className="font-heading text-[13px] font-medium">{e.action}</div>
              <div className="text-[13px] text-ink">{JSON.stringify(e.payload)}</div>
              <div className="text-[12px] text-muted">
                {new Date(e.createdAt).toLocaleString('ru-RU')}
                {e.applicationId ? ` · заявка ${e.applicationId.slice(0, 8)}` : ''}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {data && data.total > data.limit && (
        <div className="mt-4 flex items-center gap-3 text-[14px]">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-pill border border-line px-3 py-1.5 disabled:opacity-40">←</button>
          <span className="text-muted">стр. {page} из {Math.ceil(data.total / data.limit)}</span>
          <button disabled={page >= Math.ceil(data.total / data.limit)} onClick={() => setPage((p) => p + 1)} className="rounded-pill border border-line px-3 py-1.5 disabled:opacity-40">→</button>
        </div>
      )}
    </>
  );
}
