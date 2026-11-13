// Пользователи: список, блокировка, удаление, системное сообщение.
// Операции с аккаунтами выполняет Edge Function admin-users (service_role только на сервере).
import { useState } from 'react';

import { Alert, Field, Modal, PageHead, State, useAction, useLoad } from '../components/ui';
import { adminUsers, db, unwrap } from '../lib/supabase';
import { formatDate, LEVELS, type AdminUser } from '../lib/types';

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [messageTo, setMessageTo] = useState<AdminUser | null>(null);
  const list = useLoad(() => adminUsers<{ users: AdminUser[] }>({ action: 'list', page }).then((r) => r.users), [page]);
  const { run, busy } = useAction();

  const term = search.trim().toLowerCase();
  const users = (list.data ?? []).filter(
    (u) => !term || `${u.email} ${u.profile?.first_name} ${u.profile?.last_name}`.toLowerCase().includes(term),
  );

  const setBlocked = (u: AdminUser, block: boolean) => {
    const name = u.email ?? u.id;
    if (!window.confirm(block ? `Заблокировать ${name}? Пользователь не сможет войти.` : `Разблокировать ${name}?`)) return;
    run(async () => {
      await adminUsers({ action: block ? 'block' : 'unblock', user_id: u.id });
      await list.reload();
    }, block ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
  };

  const remove = (u: AdminUser) => {
    const typed = window.prompt(`Удаление аккаунта и ВСЕХ данных пользователя без возможности восстановления.\nДля подтверждения введите email: ${u.email}`);
    if (typed == null) return;
    if (typed.trim().toLowerCase() !== (u.email ?? '').toLowerCase()) {
      window.alert('Email не совпадает — удаление отменено.');
      return;
    }
    run(async () => {
      await adminUsers({ action: 'delete', user_id: u.id });
      await list.reload();
    }, 'Аккаунт удалён');
  };

  return (
    <>
      <PageHead title="Пользователи" subtitle="Аккаунты, блокировка и сообщения" />
      <div className="toolbar">
        <input className="input" placeholder="Поиск по email или имени на странице" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn" onClick={list.reload}>
          Обновить
        </button>
      </div>
      <State loading={list.loading} error={list.error} onRetry={list.reload} empty={users.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Статус</th>
                <th>Уровень</th>
                <th>Регистрация</th>
                <th>Последний вход</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{[u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ') || '—'}</div>
                    <div className="small">{u.email}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {u.profile?.is_blocked ? <span className="tag red">Заблокирован</span> : <span className="tag green">Активен</span>}
                      {!u.email_confirmed ? <span className="tag">Email не подтверждён</span> : null}
                      {u.profile && !u.profile.onboarding_completed ? <span className="tag">Без анкеты</span> : null}
                    </div>
                  </td>
                  <td>{u.profile?.fitness_level ? LEVELS[u.profile.fitness_level] : '—'}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>{formatDate(u.last_sign_in_at)}</td>
                  <td className="actions">
                    <button className="btn small" onClick={() => setMessageTo(u)} disabled={busy}>
                      Сообщение
                    </button>
                    <button className="btn small" onClick={() => setBlocked(u, !u.profile?.is_blocked)} disabled={busy}>
                      {u.profile?.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                    <button className="btn small danger" onClick={() => remove(u)} disabled={busy}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </State>
      <div className="toolbar" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
        <button className="btn small" disabled={page === 1 || list.loading} onClick={() => setPage(page - 1)}>
          ← Назад
        </button>
        <span className="muted" style={{ alignSelf: 'center' }}>
          Страница {page}
        </span>
        <button className="btn small" disabled={(list.data?.length ?? 0) < 50 || list.loading} onClick={() => setPage(page + 1)}>
          Вперёд →
        </button>
      </div>
      {messageTo ? <MessageModal user={messageTo} onClose={() => setMessageTo(null)} /> : null}
    </>
  );
}

function MessageModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { run, busy } = useAction();

  const send = () => {
    if (!title.trim()) return setError('Введите заголовок');
    if (title.length > 120 || body.length > 1000) return setError('Слишком длинный текст');
    run(async () => {
      // политика notifications_admin_insert разрешает вставку только администраторам
      await unwrap(db().from('notifications').insert({ user_id: user.id, type: 'system', title: title.trim(), body: body.trim() }));
      onClose();
    }, 'Сообщение отправлено');
  };

  return (
    <Modal
      title={`Сообщение: ${user.email ?? ''}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary" onClick={send} disabled={busy}>
            Отправить
          </button>
        </>
      }
    >
      {error ? <Alert error>{error}</Alert> : null}
      <Field label="Заголовок">
        <input className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Текст" hint="Сообщение появится в центре уведомлений приложения пользователя">
        <textarea className="textarea" value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} />
      </Field>
    </Modal>
  );
}
