import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE, apiFetch, getAccessToken } from '../../lib/api';
import { Button, Card, EmptyState, ErrorBox, PageHeader, Skeleton } from '../../components/ui';

interface AbsenceRow {
  number: string;
  fullName: string;
  groupName: string | null;
  course: number | null;
  periodFrom: string;
  periodTo: string;
  reason: string;
  approvedBy: string;
}

export function RegistryPage() {
  const [group, setGroup] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');

  const params = { group: group || undefined, from: from || undefined, to: to || undefined, q: q || undefined };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['absences', params],
    queryFn: () => apiFetch<AbsenceRow[]>('/absences', { query: params }),
  });

  async function exportCsv() {
    const url = new URL(`${API_BASE}/absences/export`);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
    const res = await fetch(url, { headers: { authorization: `Bearer ${getAccessToken()}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'absences.csv';
    a.click();
  }

  return (
    <>
      <PageHeader
        kicker="реестр освобождённых"
        title="Освобождения"
        actions={<Button variant="secondary" onClick={exportCsv}>Выгрузить CSV</Button>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <input placeholder="Группа" value={group} onChange={(e) => setGroup(e.target.value)} className="w-32 rounded-pill border border-line px-3 py-2 text-[14px]" />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-pill border border-line px-3 py-2 text-[14px]" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-pill border border-line px-3 py-2 text-[14px]" />
        <input placeholder="Поиск по ФИО" value={q} onChange={(e) => setQ(e.target.value)} className="w-48 rounded-pill border border-line px-3 py-2 text-[14px]" />
      </div>

      {isLoading && <Skeleton rows={4} />}
      {isError && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="Нет записей" text="По выбранным фильтрам освобождённых не найдено." />}

      {data && data.length > 0 && (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-surface-muted font-heading text-[12px] uppercase tracking-[0.04em] text-muted">
              <tr>
                {['ФИО', 'Группа', 'Курс', 'Период', 'Основание', '№', 'Согласовано'].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-grey">
              {data.map((r) => (
                <tr key={r.number}>
                  <td className="px-4 py-3">{r.fullName}</td>
                  <td className="px-4 py-3">{r.groupName ?? '—'}</td>
                  <td className="px-4 py-3">{r.course ?? '—'}</td>
                  <td className="px-4 py-3">{r.periodFrom} — {r.periodTo}</td>
                  <td className="px-4 py-3">{r.reason}</td>
                  <td className="px-4 py-3 font-num text-muted">{r.number}</td>
                  <td className="px-4 py-3 text-muted">{r.approvedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-3 text-[12px] text-muted">Только чтение. Источник — заявки типа absence в статусе ISSUED.</p>
    </>
  );
}
