// Системные настройки (таблица app_settings): ключ → JSON-значение
import { useState } from 'react';

import { Alert, Check, Field, Modal, PageHead, State, useAction, useLoad } from '../components/ui';
import { db, unwrap } from '../lib/supabase';
import { formatDate, type AppSetting } from '../lib/types';

interface Draft {
  isNew: boolean;
  key: string;
  value: string;
  is_public: boolean;
}

export default function Settings() {
  const list = useLoad(() => unwrap<AppSetting[]>(db().from('app_settings').select('*').order('key')));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { run, busy } = useAction();

  const open = (s?: AppSetting) => {
    setError(null);
    setDraft(s ? { isNew: false, key: s.key, value: JSON.stringify(s.value, null, 2), is_public: s.is_public } : { isNew: true, key: '', value: '{\n  "enabled": true\n}', is_public: false });
  };

  const save = () => {
    if (!draft) return;
    const key = draft.key.trim();
    if (!/^[a-z0-9_]{2,64}$/.test(key)) return setError('Ключ: латиница в нижнем регистре, цифры и _, 2–64 символа');
    let value: unknown;
    try {
      value = JSON.parse(draft.value);
    } catch {
      return setError('Значение должно быть корректным JSON');
    }
    if (draft.isNew && list.data?.some((s) => s.key === key)) return setError('Такой ключ уже существует');
    run(async () => {
      await unwrap(db().from('app_settings').upsert({ key, value, is_public: draft.is_public }, { onConflict: 'key' }));
      setDraft(null);
      await list.reload();
    }, 'Настройка сохранена');
  };

  const remove = (s: AppSetting) => {
    if (!window.confirm(`Удалить настройку «${s.key}»?`)) return;
    run(async () => {
      await unwrap(db().from('app_settings').delete().eq('key', s.key));
      await list.reload();
    }, 'Настройка удалена');
  };

  return (
    <>
      <PageHead
        title="Системные настройки"
        subtitle="Публичные ключи читает мобильное приложение, остальные доступны только администраторам"
        action={
          <button className="btn primary" onClick={() => open()}>
            + Настройка
          </button>
        }
      />
      <State loading={list.loading} error={list.error} onRetry={list.reload} empty={list.data?.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ключ</th>
                <th>Значение</th>
                <th>Доступ</th>
                <th>Изменено</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.data?.map((s) => (
                <tr key={s.key}>
                  <td style={{ fontWeight: 600 }}>{s.key}</td>
                  <td className="muted" style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <code>{JSON.stringify(s.value)}</code>
                  </td>
                  <td>{s.is_public ? <span className="tag pink">Публичный</span> : <span className="tag">Только админ</span>}</td>
                  <td>{formatDate(s.updated_at)}</td>
                  <td className="actions">
                    <button className="btn small" onClick={() => open(s)}>
                      Изменить
                    </button>
                    <button className="btn small danger" onClick={() => remove(s)} disabled={busy}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </State>
      {draft ? (
        <Modal
          title={draft.isNew ? 'Новая настройка' : draft.key}
          onClose={() => setDraft(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDraft(null)}>
                Отмена
              </button>
              <button className="btn primary" onClick={save} disabled={busy}>
                Сохранить
              </button>
            </>
          }
        >
          {error ? <Alert error>{error}</Alert> : null}
          <Field label="Ключ">
            <input className="input" value={draft.key} disabled={!draft.isNew} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
          </Field>
          <Field label="Значение (JSON)">
            <textarea className="textarea" style={{ minHeight: 160, fontFamily: 'ui-monospace, Consolas, monospace' }} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
          </Field>
          <Check label="Публичный — доступен пользователям приложения" checked={draft.is_public} onChange={(v) => setDraft({ ...draft, is_public: v })} />
        </Modal>
      ) : null}
    </>
  );
}
