import { useState } from 'react';

import { Alert, Field, Modal, PageHead, State, num, useAction, useLoad } from '../components/ui';
import { db, unwrap } from '../lib/supabase';
import type { Category } from '../lib/types';

type Draft = { id?: string; slug: string; name: string; sort_order: string };

export default function Categories() {
  const list = useLoad(() => unwrap<Category[]>(db().from('exercise_categories').select('*').order('sort_order')));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { run, busy } = useAction();

  const open = (c?: Category) => {
    setError(null);
    setDraft(c ? { id: c.id, slug: c.slug, name: c.name, sort_order: String(c.sort_order) } : { slug: '', name: '', sort_order: String((list.data?.length ?? 0) + 1) });
  };

  const save = () => {
    if (!draft) return;
    try {
      const slug = draft.slug.trim().toLowerCase();
      if (!/^[a-z0-9-]{2,40}$/.test(slug)) throw new Error('Slug: латиница, цифры и дефис, 2–40 символов');
      if (!draft.name.trim()) throw new Error('Введите название');
      const row = { slug, name: draft.name.trim(), sort_order: num(draft.sort_order, 0, 1000, 'Порядок') };
      run(async () => {
        if (draft.id) await unwrap(db().from('exercise_categories').update(row).eq('id', draft.id));
        else await unwrap(db().from('exercise_categories').insert(row));
        setDraft(null);
        await list.reload();
      }, 'Категория сохранена');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = (c: Category) => {
    if (!window.confirm(`Удалить категорию «${c.name}»? Удаление невозможно, если в ней есть упражнения.`)) return;
    run(async () => {
      try {
        await unwrap(db().from('exercise_categories').delete().eq('id', c.id));
      } catch (e) {
        if (/foreign key|violates/i.test((e as Error).message)) throw new Error('В категории есть упражнения — сначала перенесите их');
        throw e;
      }
      await list.reload();
    }, 'Категория удалена');
  };

  return (
    <>
      <PageHead
        title="Категории"
        subtitle="Группы мышц для упражнений и программ"
        action={
          <button className="btn primary" onClick={() => open()}>
            + Категория
          </button>
        }
      />
      <State loading={list.loading} error={list.error} onRetry={list.reload} empty={list.data?.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Название</th>
                <th>Slug</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.data?.map((c) => (
                <tr key={c.id}>
                  <td>{c.sort_order}</td>
                  <td>
                    {c.name} {c.is_demo ? <span className="tag">демо</span> : null}
                  </td>
                  <td className="muted">{c.slug}</td>
                  <td className="actions">
                    <button className="btn small" onClick={() => open(c)}>
                      Изменить
                    </button>
                    <button className="btn small danger" onClick={() => remove(c)} disabled={busy}>
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
          title={draft.id ? 'Категория' : 'Новая категория'}
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
          <Field label="Название">
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <div className="field-row">
            <Field label="Slug" hint="Определяет иконку обложки: chest, back, legs, shoulders, biceps, triceps, abs, cardio, full-body">
              <input className="input" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            </Field>
            <Field label="Порядок">
              <input className="input" inputMode="numeric" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} />
            </Field>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
