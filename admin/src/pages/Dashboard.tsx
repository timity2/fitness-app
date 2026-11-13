import { PageHead, State, useLoad } from '../components/ui';
import { db, unwrap } from '../lib/supabase';

interface Stats {
  users: number;
  users_onboarded: number;
  users_blocked: number;
  new_users_7d: number;
  sessions_total: number;
  sessions_7d: number;
  exercises: number;
  programs: number;
  products: number;
  user_products: number;
  nutrition_entries_7d: number;
}

const CARDS: { key: keyof Stats; label: string }[] = [
  { key: 'users', label: 'Пользователей всего' },
  { key: 'new_users_7d', label: 'Новых за 7 дней' },
  { key: 'users_onboarded', label: 'Прошли анкету' },
  { key: 'users_blocked', label: 'Заблокировано' },
  { key: 'sessions_total', label: 'Тренировок всего' },
  { key: 'sessions_7d', label: 'Тренировок за 7 дней' },
  { key: 'nutrition_entries_7d', label: 'Записей питания за 7 дней' },
  { key: 'exercises', label: 'Упражнений в каталоге' },
  { key: 'programs', label: 'Программ в каталоге' },
  { key: 'products', label: 'Продуктов в каталоге' },
  { key: 'user_products', label: 'Продуктов пользователей' },
];

export default function Dashboard() {
  // admin_stats() сама проверяет роль и возвращает только агрегаты
  const stats = useLoad(() => unwrap<Stats>(db().rpc('admin_stats')));

  return (
    <>
      <PageHead
        title="Статистика"
        subtitle="Сводные показатели без персональных данных"
        action={
          <button className="btn" onClick={stats.reload}>
            Обновить
          </button>
        }
      />
      <State loading={stats.loading} error={stats.error} onRetry={stats.reload}>
        <div className="grid-stats">
          {CARDS.map((c) => (
            <div key={c.key} className="card">
              <div className="muted">{c.label}</div>
              <div className="stat-value">{(stats.data?.[c.key] ?? 0).toLocaleString('ru-RU')}</div>
            </div>
          ))}
        </div>
        {stats.data && stats.data.users > 0 ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="muted">Доля пользователей, прошедших анкету</div>
            <div className="stat-value">{Math.round((stats.data.users_onboarded / stats.data.users) * 100)}%</div>
          </div>
        ) : null}
      </State>
    </>
  );
}
