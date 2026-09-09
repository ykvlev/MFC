import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ApplicationStatus } from '../lib/types';
import { STATUS_META } from '../lib/statusMeta';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-paper ${className}`}>{children}</div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-heading text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'dark';
  loading?: boolean;
};

export function Button({ variant = 'primary', loading, disabled, children, className = '', ...rest }: BtnProps) {
  const styles: Record<string, string> = {
    primary: 'bg-brand text-paper hover:bg-brand-bright border-transparent',
    secondary: 'bg-paper text-ink border-line hover:bg-surface-muted',
    danger: 'bg-paper text-alert border-alert hover:bg-[#FEECEC]',
    dark: 'bg-ink text-paper border-transparent hover:opacity-90',
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-pill border px-5 font-heading text-[15px] font-medium transition-colors duration-150 ease-rso disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {loading ? '…' : children}
    </button>
  );
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="whitespace-nowrap rounded-pill px-[9px] py-[5px] font-heading text-[10px] font-medium uppercase tracking-[0.08em]"
      style={{ background: m.bg, color: m.fg }}
    >
      {m.label}
    </span>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-hairline px-6 py-14 text-center">
      <div className="font-heading text-[19px] font-medium">{title}</div>
      {text && <div className="max-w-sm text-sm leading-relaxed text-muted">{text}</div>}
      {action}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-pill border border-grey bg-paper p-4">
          <div className="mb-2 h-3 w-2/5 rounded bg-grey" />
          <div className="h-4 w-4/5 rounded bg-grey" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-alert p-5">
      <div className="font-heading text-[17px] font-medium">Не удалось загрузить</div>
      <div className="text-sm text-muted">{message}</div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ kicker, title, actions }: { kicker: string; title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-grey pb-4">
      <div>
        <SectionLabel>{kicker}</SectionLabel>
        <h1 className="font-heading text-[28px] font-medium leading-tight tracking-tight">{title}</h1>
      </div>
      {actions}
    </div>
  );
}
