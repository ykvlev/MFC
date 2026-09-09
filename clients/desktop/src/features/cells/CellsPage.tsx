import { useNavigate } from 'react-router-dom';
import { useCells } from '../../lib/hooks';
import { Card, ErrorBox, PageHeader, Skeleton } from '../../components/ui';

const CELL_STYLE: Record<string, string> = {
  FREE: 'border-line bg-paper text-ink',
  OCCUPIED: 'border-brand bg-brand text-paper',
  MAINTENANCE: 'border-line bg-grey text-muted',
};

export function CellsPage() {
  const { data, isLoading, isError, error, refetch } = useCells();
  const navigate = useNavigate();

  const stats = data
    ? {
        free: data.filter((c) => c.status === 'FREE').length,
        occupied: data.filter((c) => c.status === 'OCCUPIED').length,
        maintenance: data.filter((c) => c.status === 'MAINTENANCE').length,
      }
    : null;

  return (
    <>
      <PageHeader kicker="ячейки выдачи" title="Ячейки" />
      {isLoading && <Skeleton rows={3} />}
      {isError && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}

      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            ['свободно', stats.free, '#0804FF'],
            ['занято', stats.occupied, '#000'],
            ['обслуживание', stats.maintenance, '#818C99'],
          ].map(([label, n, color]) => (
            <Card key={label as string} className="p-4">
              <div className="font-num text-[28px] leading-none" style={{ color: color as string }}>
                {n as number}
              </div>
              <div className="mt-1 text-[12px] text-muted">{label as string}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-6 gap-2.5">
        {data?.map((c) => (
          <button
            key={c.id}
            onClick={() => c.status === 'OCCUPIED' && navigate('/queue')}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-pill border font-heading ${CELL_STYLE[c.status]}`}
          >
            <span className="text-[14px] font-medium">{c.code}</span>
            <span className="text-[10px] opacity-80">
              {c.status === 'FREE' ? 'свободна' : c.status === 'OCCUPIED' ? c.pickupCode : 'сервис'}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-muted">
        Подтверждение выдачи и открытие замка — на экране заявки в статусе «готово к выдаче».
      </p>
    </>
  );
}
