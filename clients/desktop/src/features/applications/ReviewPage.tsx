import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE, getAccessToken } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import {
  useApplication,
  useConfirmSignature,
  useGenerateDocument,
  useStageAction,
} from '../../lib/hooks';
import { fmtDate } from '../../lib/statusMeta';
import { RouteTimeline } from '../../components/RouteTimeline';
import { Button, Card, ErrorBox, PageHeader, SectionLabel, Skeleton, StatusBadge } from '../../components/ui';

function fmtValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('from' in o) return `${o.from} — ${o.to}`;
    return JSON.stringify(v);
  }
  return String(v);
}

export function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me } = useAuth();
  const { data: app, isLoading, isError, error, refetch } = useApplication(id);
  const stageAction = useStageAction(id!);
  const genDoc = useGenerateDocument(id!);
  const confirmSig = useConfirmSignature(id!);
  const [comment, setComment] = useState('');
  const [mode, setMode] = useState<'none' | 'return' | 'reject'>('none');

  if (isLoading) return <Skeleton rows={5} />;
  if (isError || !app) return <ErrorBox message={(error as Error)?.message ?? 'Заявка не найдена'} onRetry={() => refetch()} />;

  const activeStage = app.stages.find((s) => s.status === 'ACTIVE');
  const canAct = activeStage && (me?.role === 'ADMIN' || activeStage.approverDepartment === me?.department);
  const fields = (app.type.fieldsSchema as Array<{ key: string; label: string }>) ?? [];
  const genDocFile = app.files?.find((f) => f.kind === 'GENERATED_DOCUMENT');
  const signedScan = app.files?.find((f) => f.kind === 'SIGNED_SCAN');

  function fileUrl(fileId: string) {
    return `${API_BASE}/applications/${app!.id}/files/${fileId}`;
  }

  async function openFile(fileId: string) {
    const res = await fetch(fileUrl(fileId), { headers: { authorization: `Bearer ${getAccessToken()}` } });
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  }

  return (
    <>
      <PageHeader
        kicker="рассмотрение заявки"
        title={app.type.name}
        actions={
          <Button variant="secondary" onClick={() => navigate('/queue')}>
            ← К очереди
          </Button>
        }
      />

      <div className="grid grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <span className="font-num text-[15px] text-muted">№ {app.number}</span>
              <StatusBadge status={app.status} />
            </div>
            <div className="text-[14px] text-muted">
              {app.user?.fullName} · {app.user?.groupName ?? ''}
              {app.user?.course ? `, ${app.user.course} курс` : ''} · подана {fmtDate(app.submittedAt)}
            </div>
            {app.rejectReason && (
              <div className="rounded-pill border border-warn-fg/40 bg-warn-bg px-3.5 py-2.5 text-[14px]">
                {app.rejectReason}
              </div>
            )}
          </Card>

          <div>
            <SectionLabel>Маршрут</SectionLabel>
            <div className="mt-3">
              <RouteTimeline stages={app.stages} />
            </div>
          </div>

          <div>
            <SectionLabel>Данные заявки</SectionLabel>
            <Card className="mt-3 flex flex-col divide-y divide-grey p-0">
              {fields.map((f) => (
                <div key={f.key} className="flex justify-between gap-4 px-4 py-3 text-[14px]">
                  <span className="text-muted">{f.label}</span>
                  <span className="text-right">{fmtValue(app.data[f.key])}</span>
                </div>
              ))}
            </Card>
          </div>

          {app.files && app.files.length > 0 && (
            <div>
              <SectionLabel>Вложения</SectionLabel>
              <div className="mt-3 flex flex-col gap-2">
                {app.files.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => openFile(f.id)}
                    className="flex items-center justify-between rounded-pill border border-line bg-paper px-3.5 py-2.5 text-left text-[14px] hover:bg-surface-muted"
                  >
                    <span>{f.originalName}</span>
                    <span className="text-[12px] text-muted">{f.kind}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Панель действий */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Действия</SectionLabel>

          {app.status === 'READY' && app.cell && (
            <Card className="flex flex-col gap-2 bg-brand p-4 text-paper">
              <div className="text-[11px] uppercase tracking-[0.1em] opacity-75">готово к выдаче</div>
              <div className="font-title text-[28px]">{app.cell.code}</div>
              <div className="font-num text-[24px] tracking-[0.06em]">{app.cell.pickupCode}</div>
              <div className="text-[12px] opacity-85">хранится до {fmtDate(app.cell.expiresAt)}</div>
            </Card>
          )}

          {canAct && mode === 'none' && (
            <>
              <Button
                loading={stageAction.isPending}
                onClick={() => stageAction.mutate({ stageId: activeStage!.id, action: 'approve', comment: comment || undefined })}
              >
                Согласовать «{activeStage!.name}»
              </Button>
              <Button variant="secondary" onClick={() => setMode('return')}>
                Вернуть на доработку
              </Button>
              <Button variant="danger" onClick={() => setMode('reject')}>
                Отклонить
              </Button>
            </>
          )}

          {canAct && mode !== 'none' && (
            <Card className="flex flex-col gap-2 p-4">
              <div className="font-heading text-[14px] font-medium">
                {mode === 'return' ? 'Возврат на доработку' : 'Отклонение заявки'}
              </div>
              <textarea
                rows={4}
                placeholder="Причина, минимум 10 символов"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none rounded-pill border border-line px-3.5 py-2.5 text-[14px]"
              />
              <div className="flex gap-2">
                <Button
                  variant={mode === 'reject' ? 'danger' : 'primary'}
                  loading={stageAction.isPending}
                  disabled={comment.trim().length < 10}
                  onClick={() =>
                    stageAction.mutate(
                      { stageId: activeStage!.id, action: mode, comment },
                      { onSuccess: () => setMode('none') },
                    )
                  }
                >
                  Подтвердить
                </Button>
                <Button variant="secondary" onClick={() => setMode('none')}>
                  Отмена
                </Button>
              </div>
            </Card>
          )}

          {app.type.requiresSignature && (app.status === 'IN_REVIEW' || app.status === 'AWAITING_SIGNATURE') && (
            <Card className="flex flex-col gap-2 p-4">
              <div className="font-heading text-[14px] font-medium">Документ и подпись</div>
              <Button variant="secondary" loading={genDoc.isPending} onClick={() => genDoc.mutate()}>
                {genDocFile ? 'Перегенерировать PDF' : 'Сгенерировать PDF'}
              </Button>
              {genDocFile && (
                <Button variant="secondary" onClick={() => openFile(genDocFile.id)}>
                  Открыть PDF
                </Button>
              )}
              {app.status === 'AWAITING_SIGNATURE' && (
                <Button
                  loading={confirmSig.isPending}
                  disabled={!signedScan}
                  onClick={() => confirmSig.mutate()}
                >
                  {signedScan ? 'Скан проверен — подтвердить' : 'Ожидается скан от студента'}
                </Button>
              )}
            </Card>
          )}

          {!canAct && app.status !== 'READY' && (
            <div className="text-[13px] text-muted">
              Активный этап согласует {activeStage ? activeStage.approverDepartment : 'другое подразделение'}.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
