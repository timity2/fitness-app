// Pulse Admin: вход, серверная проверка роли администратора, навигация по разделам.
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState, type FormEvent } from 'react';

import { Icons } from './components/Icons';
import { Alert, Field, Spinner, ToastProvider } from './components/ui';
import { configured, supabase } from './lib/supabase';
import Categories from './pages/Categories';
import Dashboard from './pages/Dashboard';
import Exercises from './pages/Exercises';
import Foods from './pages/Foods';
import Moderation from './pages/Moderation';
import Programs from './pages/Programs';
import Settings from './pages/Settings';
import Users from './pages/Users';

const SECTIONS = [
  { id: 'dashboard', title: 'Статистика', icon: Icons.dashboard, Page: Dashboard },
  { id: 'users', title: 'Пользователи', icon: Icons.users, Page: Users },
  { id: 'exercises', title: 'Упражнения', icon: Icons.exercises, Page: Exercises },
  { id: 'categories', title: 'Категории', icon: Icons.categories, Page: Categories },
  { id: 'programs', title: 'Программы', icon: Icons.programs, Page: Programs },
  { id: 'foods', title: 'Продукты', icon: Icons.foods, Page: Foods },
  { id: 'moderation', title: 'Модерация', icon: Icons.moderation, Page: Moderation },
  { id: 'settings', title: 'Настройки', icon: Icons.settings, Page: Settings },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

const readHash = (): SectionId => {
  const id = window.location.hash.slice(1);
  return (SECTIONS.find((s) => s.id === id)?.id ?? 'dashboard') as SectionId;
};

export default function App() {
  return <ToastProvider>{configured ? <Gate /> : <NotConfigured />}</ToastProvider>;
}

function NotConfigured() {
  return (
    <div className="auth">
      <div className="card">
        <Brand />
        <h2 style={{ marginTop: 8 }}>Подключите Supabase</h2>
        <p className="muted">
          Создайте файл <code>admin/.env.local</code> по образцу <code>.env.example</code> и укажите URL проекта и публичный ключ, затем перезапустите сервер разработки.
        </p>
        <p className="small">Админ-панель работает только с реальной базой данных — локального демо-режима у неё нет.</p>
      </div>
    </div>
  );
}

type Access = 'checking' | 'admin' | 'denied';

function Gate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [access, setAccess] = useState<Access>('checking');

  useEffect(() => {
    supabase!.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase!.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Роль проверяет сервер: функция is_admin() читает таблицу user_roles,
  // которую невозможно изменить из клиента. Данные всё равно защищены RLS.
  useEffect(() => {
    if (!session) return;
    setAccess('checking');
    supabase!
      .rpc('is_admin')
      .then(({ data, error }) => setAccess(!error && data === true ? 'admin' : 'denied'));
  }, [session]);

  if (session === undefined) return <Spinner />;
  if (!session) return <Login />;
  if (access === 'checking') return <Spinner />;
  if (access === 'denied') {
    return (
      <div className="auth">
        <div className="card">
          <Brand />
          <h2 style={{ marginTop: 8 }}>Нет доступа</h2>
          <p className="muted">Аккаунт {session.user.email} не имеет роли администратора.</p>
          <button className="btn" onClick={() => supabase!.auth.signOut()}>
            Выйти
          </button>
        </div>
      </div>
    );
  }
  return <Shell email={session.user.email ?? ''} />;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase!.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (authError) setError(/invalid login/i.test(authError.message) ? 'Неверный email или пароль' : authError.message);
  };

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <Brand />
        <h2 style={{ margin: '8px 0 18px' }}>Вход для администраторов</h2>
        {error ? <Alert error>{error}</Alert> : null}
        <Field label="Email">
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Пароль">
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <button className="btn primary" style={{ width: '100%', height: 44 }} disabled={busy}>
          {busy ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}

function Brand() {
  return (
    <div className="logo" style={{ padding: '0 0 12px' }}>
      <img src="/favicon.svg" alt="" />
      <span>Pulse</span>
      <em>Admin</em>
    </div>
  );
}

function Shell({ email }: { email: string }) {
  const [section, setSection] = useState<SectionId>(readHash);

  useEffect(() => {
    const onHash = () => setSection(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const current = SECTIONS.find((s) => s.id === section)!;
  const Page = current.Page;

  return (
    <>
      <div className="mobile-bar">
        <Brand />
        <button className="btn small" onClick={() => supabase!.auth.signOut()}>
          Выйти
        </button>
      </div>
      <div className="layout">
        <nav className="sidebar" aria-label="Разделы">
          <Brand />
          {SECTIONS.map((s) => (
            <button key={s.id} className={`nav-item${s.id === section ? ' active' : ''}`} onClick={() => (window.location.hash = s.id)}>
              {s.icon}
              {s.title}
            </button>
          ))}
          <div className="sidebar-footer">
            <div className="small" style={{ marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email}
            </div>
            <button className="btn small" onClick={() => supabase!.auth.signOut()}>
              Выйти
            </button>
          </div>
        </nav>
        <main className="main">
          <Page key={section} />
        </main>
      </div>
    </>
  );
}
