import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiException } from '../../lib/api';
import { fmtDate } from '../../lib/statusMeta';
import { Button, Card, EmptyState, ErrorBox, PageHeader, SectionLabel, Skeleton } from '../../components/ui';

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: { scope: 'ALL' | 'COURSE' | 'GROUP'; value: string | null };
  createdAt: string;
  authorName: string;
  recipients: number;
}

export function AnnouncementsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => apiFetch<Announcement[]>('/announcements'),
  });

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState<'ALL' | 'COURSE' | 'GROUP'>('ALL');
  const [value, setValue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const publish = useMutation({
    mutationFn: () =>
      apiFetch('/announcements', {
        method: 'POST',
        body: { title, body, scope, value: scope === 'ALL' ? undefined : value },
      }),
    onSuccess: () => {
      setTitle('');
      setBody('');
      setValue('');
      setFormError(null);
      void qc.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (e) => setFormError(e instanceof ApiException ? e.error.message : 'Ошибка публикации'),
  });

  return (
    <>
      <PageHeader kicker="объявления деканата" title="Объявления" />

      <Card className="mb-6 flex flex-col gap-3 p-5">
        <SectionLabel>Новое объявление</SectionLabel>
        <input
          placeholder="Заголовок"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-pill border border-line px-3.5 py-2.5 text-[15px]"
        />
        <textarea
          rows={3}
          placeholder="Текст объявления"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="resize-none rounded-pill border border-line px-3.5 py-2.5 text-[15px]"
        />
        <div className="flex items-center gap-2">
          {(['ALL', 'COURSE', 'GROUP'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-pill px-3.5 py-2 font-heading text-[13px] ${scope === s ? 'bg-brand text-paper' : 'border border-line'}`}
            >
              {s === 'ALL' ? 'Всем' : s === 'COURSE' ? 'Курс' : 'Группа'}
            </button>
          ))}
          {scope !== 'ALL' && (
            <input
              placeholder={scope === 'COURSE' ? 'номер курса' : 'напр. ИС-21'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-40 rounded-pill border border-line px-3 py-2 text-[14px]"
            />
          )}
        </div>
        {formError && <div className="text-[13px] text-alert">{formError}</div>}
        <Button
          loading={publish.isPending}
          disabled={!title || !body || (scope !== 'ALL' && !value)}
          onClick={() => publish.mutate()}
        >
          Опубликовать и отправить push
        </Button>
      </Card>

      {isLoading && <Skeleton rows={3} />}
      {isError && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="Объявлений пока нет" />}

      <div className="flex flex-col gap-2">
        {data?.map((a) => (
          <Card key={a.id} className="flex flex-col gap-1.5 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-heading text-[16px] font-medium">{a.title}</span>
              <span className="text-[12px] text-muted">{fmtDate(a.createdAt)}</span>
            </div>
            <div className="text-[14px] leading-relaxed">{a.body}</div>
            <div className="text-[12px] text-muted">
              {a.authorName} · {a.audience.scope === 'ALL' ? 'всем' : `${a.audience.scope} ${a.audience.value}`} ·
              получателей: {a.recipients}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
