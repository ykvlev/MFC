import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiException } from '../../lib/api';
import { fmtDate } from '../../lib/statusMeta';
import { Button, Card, EmptyState, ErrorBox, PageHeader, SectionLabel, Skeleton } from '../../components/ui';

interface SlotWindow {
  id: string;
  title: string;
  location: string | null;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  isOpen: boolean;
}

export function SlotsAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['slot-windows', 'mine'],
    queryFn: () => apiFetch<SlotWindow[]>('/slot-windows', { query: { scope: 'mine' } }),
  });

  const [form, setForm] = useState({ title: '', location: '', date: '', startTime: '10:00', endTime: '12:00', capacity: 6, slotMinutes: 15 });
  const [formError, setFormError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: () => apiFetch('/slot-windows', { method: 'POST', body: form }),
    onSuccess: () => {
      setFormError(null);
      void qc.invalidateQueries({ queryKey: ['slot-windows'] });
    },
    onError: (e) => setFormError(e instanceof ApiException ? e.error.message : 'Ошибка'),
  });

  return (
    <>
      <PageHeader kicker="приёмные окна" title="Запись на приём" />

      <Card className="mb-6 grid grid-cols-2 gap-3 p-5">
        <div className="col-span-2">
          <SectionLabel>Новое приёмное окно</SectionLabel>
        </div>
        <input placeholder="Тема приёма" value={form.title} onChange={(e) => set('title', e.target.value)} className="col-span-2 rounded-pill border border-line px-3.5 py-2.5 text-[15px]" />
        <input placeholder="Кабинет / место" value={form.location} onChange={(e) => set('location', e.target.value)} className="col-span-2 rounded-pill border border-line px-3.5 py-2.5 text-[15px]" />
        <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="rounded-pill border border-line px-3.5 py-2.5 text-[15px]" />
        <div className="flex gap-2">
          <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} className="flex-1 rounded-pill border border-line px-3 py-2.5 text-[15px]" />
          <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} className="flex-1 rounded-pill border border-line px-3 py-2.5 text-[15px]" />
        </div>
        <label className="flex items-center gap-2 text-[14px]">
          Слот, мин
          <input type="number" min={5} step={5} value={form.slotMinutes} onChange={(e) => set('slotMinutes', Number(e.target.value))} className="w-20 rounded-pill border border-line px-3 py-2 text-[15px]" />
        </label>
        <label className="flex items-center gap-2 text-[14px]">
          Мест на слот
          <input type="number" min={1} value={form.capacity} onChange={(e) => set('capacity', Number(e.target.value))} className="w-20 rounded-pill border border-line px-3 py-2 text-[15px]" />
        </label>
        {formError && <div className="col-span-2 text-[13px] text-alert">{formError}</div>}
        <div className="col-span-2">
          <Button loading={create.isPending} disabled={!form.title || !form.date} onClick={() => create.mutate()}>
            Открыть окно записи
          </Button>
        </div>
      </Card>

      {isLoading && <Skeleton rows={3} />}
      {isError && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="Приёмных окон нет" text="Создайте окно — студенты увидят его в мобильном приложении и запишутся на слот." />}

      <div className="flex flex-col gap-2">
        {data?.map((w) => (
          <Card key={w.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-heading text-[16px] font-medium">{w.title}</div>
              <div className="text-[13px] text-muted">
                {fmtDate(w.date)} · {w.startTime}–{w.endTime}
                {w.location ? ` · ${w.location}` : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="font-num text-[20px] text-brand">{w.booked}</div>
              <div className="text-[12px] text-muted">записано</div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
