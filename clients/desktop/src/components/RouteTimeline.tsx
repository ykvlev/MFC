import type { Stage } from '../lib/types';
import { STAGE_COLOR, fmtDate } from '../lib/statusMeta';

export function RouteTimeline({ stages }: { stages: Stage[] }) {
  const sorted = [...stages].sort((a, b) => a.orderNum - b.orderNum);
  return (
    <div>
      {sorted.map((s, i) => {
        const c = STAGE_COLOR[s.status];
        const meta =
          s.status === 'APPROVED'
            ? `Согласовано ${fmtDate(s.actedAt)}`
            : s.status === 'ACTIVE'
              ? `Сейчас здесь · ${s.approverDepartment}${s.dueAt ? ` · до ${fmtDate(s.dueAt)}` : ''}`
              : s.status === 'RETURNED'
                ? `Возвращено · ${s.approverDepartment}`
                : s.status === 'REJECTED'
                  ? `Отклонено · ${s.approverDepartment}`
                  : `Ожидает · ${s.approverDepartment}`;
        return (
          <div key={s.id} className="flex items-stretch gap-3.5">
            <div className="flex w-3.5 flex-shrink-0 flex-col items-center">
              <span
                className="mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2"
                style={{ borderColor: c.dot, background: c.fill }}
              />
              {i < sorted.length - 1 && (
                <span className="w-0.5 flex-1" style={{ minHeight: 22, background: c.line }} />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <div className="font-heading text-[15px] font-medium leading-snug">{s.name}</div>
              <div className="mt-0.5 text-[13px] text-muted">{meta}</div>
              {s.comment && (
                <div className="mt-2 border-l-2 border-line pl-2.5 text-[13px] leading-relaxed">{s.comment}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
