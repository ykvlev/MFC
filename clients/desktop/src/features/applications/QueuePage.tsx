import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueue } from '../../lib/hooks';
import { fmtDate } from '../../lib/statusMeta';
import { Card, EmptyState, ErrorBox, PageHeader, Skeleton, StatusBadge } from '../../components/ui';

export function QueuePage() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useQueue({ q });

  return (
    <>
      <PageHeader
        kicker="очередь согласования"
        title="На мне"
        actions={
          <input
            placeholder="Поиск по номеру…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-56 rounded-pill border border-line bg-paper px-3.5 py-2 text-[14px] focus-visible:border-brand"
          />
        }
      />

      {isLoading && <Skeleton rows={4} />}
      {isError && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && data.items.length === 0 && (
        <EmptyState title="Очередь пуста" text="Новые заявки появятся здесь, как только этап дойдёт до вашего подразделения." />
      )}

      <div className="grid grid-cols-1 gap-3">
        {data?.items.map((a) => {
          const active = a.stages.find((s) => s.status === 'ACTIVE');
          return (
            <button
              key={a.id}
              onClick={() => navigate(`/applications/${a.id}`)}
              className="text-left"
            >
              <Card className="p-4 transition-colors duration-150 ease-rso hover:bg-surface-muted">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-heading text-[11px] tracking-[0.06em] text-muted">
                    № {a.number} · {fmtDate(a.createdAt)}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-2 font-heading text-[18px] font-medium">{a.type.name}</div>
                <div className="mt-1 text-[13px] text-muted">
                  {a.user ? `${a.user.fullName} · ${a.user.groupName ?? ''}` : ''}
                  {active ? ` · ждёт: ${active.name}` : ' · маршрут завершён'}
                </div>
                <div className="mt-2 flex gap-1">
                  {a.stages
                    .sort((s1, s2) => s1.orderNum - s2.orderNum)
                    .map((s) => (
                      <span
                        key={s.id}
                        className="h-1 flex-1 rounded"
                        style={{
                          background:
                            s.status === 'APPROVED'
                              ? '#0804FF'
                              : s.status === 'ACTIVE'
                                ? '#5552FF'
                                : s.status === 'RETURNED' || s.status === 'REJECTED'
                                  ? '#F23838'
                                  : '#EEEEEE',
                        }}
                      />
                    ))}
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </>
  );
}
