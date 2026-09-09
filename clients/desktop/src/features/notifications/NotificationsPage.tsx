import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useNotifications } from '../../lib/hooks';
import { fmtDate } from '../../lib/statusMeta';
import { Button, Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '../../components/ui';

export function NotificationsPage() {
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const qc = useQueryClient();
  const readAll = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const hasUnread = data?.some((n) => !n.isRead);

  return (
    <>
      <PageHeader
        kicker="уведомления"
        title="Входящие"
        actions={hasUnread ? <Button variant="secondary" onClick={() => readAll.mutate()}>Прочитать все</Button> : undefined}
      />
      {isLoading && <Skeleton rows={4} />}
      {isError && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="Уведомлений нет" text="Они появляются на каждом переходе статуса заявки." />}

      <div className="flex flex-col gap-2">
        {data?.map((n) => (
          <Card key={n.id} className={`p-4 ${n.isRead ? '' : 'bg-surface-muted'}`}>
            <div className="flex items-center justify-between gap-3">
              <span className={`font-heading text-[15px] ${n.isRead ? 'font-normal' : 'font-medium'}`}>{n.title}</span>
              <span className="text-[12px] text-muted">{fmtDate(n.createdAt)}</span>
            </div>
            <div className="mt-1 text-[13px] leading-relaxed">{n.body}</div>
          </Card>
        ))}
      </div>
    </>
  );
}
