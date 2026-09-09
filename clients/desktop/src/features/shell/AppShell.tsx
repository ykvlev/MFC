import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import type { UserRole } from '../../lib/types';
import { useAuth } from '../../lib/auth';
import { Skeleton } from '../../components/ui';

interface NavItem {
  to: string;
  label: string;
  roles: UserRole[];
}

const NAV: NavItem[] = [
  { to: '/queue', label: 'Очередь', roles: ['STAFF', 'ADMIN'] },
  { to: '/cells', label: 'Ячейки', roles: ['STAFF', 'ADMIN'] },
  { to: '/registry', label: 'Реестр освобождённых', roles: ['TEACHER', 'ADMIN'] },
  { to: '/announcements', label: 'Объявления', roles: ['STAFF', 'ADMIN'] },
  { to: '/slots', label: 'Приёмные окна', roles: ['STAFF', 'TEACHER', 'ADMIN'] },
  { to: '/notifications', label: 'Входящие', roles: ['STAFF', 'ADMIN', 'TEACHER'] },
  { to: '/admin/types', label: 'Типы заявок', roles: ['ADMIN'] },
  { to: '/admin/analytics', label: 'Аналитика', roles: ['ADMIN'] },
  { to: '/admin/event-log', label: 'Журнал событий', roles: ['ADMIN'] },
];

export function AppShell() {
  const { me, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-10">
        <Skeleton rows={4} />
      </div>
    );
  }
  if (!me) return <Navigate to="/login" replace />;

  const items = NAV.filter((n) => n.roles.includes(me.role));

  return (
    <div className="flex h-full">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-line bg-paper">
        <div className="border-b border-grey px-5 py-5">
          <div className="font-heading text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            рабочее место
          </div>
          <div className="mt-1 font-title text-[18px] lowercase leading-none text-brand">
            единое окно
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-auto p-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `rounded-pill px-4 py-2.5 font-heading text-[14px] font-medium transition-colors duration-150 ease-rso ${
                  isActive ? 'bg-brand text-paper' : 'text-ink hover:bg-surface-muted'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-grey p-4">
          <div className="font-heading text-[14px] font-medium">{me.fullName}</div>
          <div className="text-[12px] text-muted">
            {me.role}
            {me.department ? ` · ${me.department}` : ''}
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="mt-3 text-[13px] text-alert hover:underline"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-grey">
        <div className="mx-auto max-w-5xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
