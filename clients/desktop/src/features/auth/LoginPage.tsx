import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiException } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button } from '../../components/ui';

export function LoginPage() {
  const { me, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiException ? err.error.message : 'Не удалось войти');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col justify-between bg-brand px-14 py-20 text-paper">
        <div className="flex flex-col gap-5">
          <div className="font-heading text-[12px] font-medium uppercase tracking-[0.14em] opacity-80">
            информационная система вуза
          </div>
          <div className="font-title text-[40px] lowercase leading-none">единое окно студента</div>
          <p className="max-w-sm text-[15px] leading-relaxed opacity-90">
            Рабочее место сотрудника, преподавателя и администратора. Согласование заявок,
            выдача документов, приёмные окна, объявления.
          </p>
        </div>
        <div className="text-[12px] opacity-70">Десктоп-клиент · Tauri</div>
      </div>

      <div className="flex w-[440px] flex-shrink-0 items-center justify-center bg-paper px-12">
        <form onSubmit={submit} className="flex w-full flex-col gap-4">
          <h1 className="font-heading text-[24px] font-medium">Вход</h1>
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-[14px] font-medium">Email</span>
            <input
              type="email"
              autoFocus
              className="rounded-pill border border-line bg-paper px-3.5 py-2.5 text-[15px] focus-visible:border-brand"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-[14px] font-medium">Пароль</span>
            <input
              type="password"
              className="rounded-pill border border-line bg-paper px-3.5 py-2.5 text-[15px] focus-visible:border-brand"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="text-[13px] text-alert">{error}</div>}
          <Button type="submit" loading={busy} className="mt-2">
            Войти
          </Button>
        </form>
      </div>
    </div>
  );
}
