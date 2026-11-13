import { useState } from 'react';

import { Alert, Check, Field, Modal, PageHead, State, num, useAction, useLoad } from '../components/ui';
import { db, unwrap } from '../lib/supabase';
import { EQUIPMENT, LEVELS, splitList, type Category, type Exercise, type Level } from '../lib/types';

interface Draft {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  technique: string;
  muscles: string;
  equipment: string;
  difficulty: Level;
  sets: string;
  reps: string;
  rest: string;
  tips: string;
  mistakes: string;
  image_url: string;
  video_url: string;
  is_published: boolean;
}

const toDraft = (e: Exercise): Draft => ({
  id: e.id,
  category_id: e.category_id,
  name: e.name,
  description: e.description,
  technique: e.technique,
  muscles: e.primary_muscles.join(', '),
  equipment: e.equipment,
  difficulty: e.difficulty,
  sets: String(e.default_sets),
  reps: String(e.default_reps),
  rest: String(e.default_rest_sec),
  tips: e.tips.join('\n'),
  mistakes: e.mistakes.join('\n'),
  image_url: e.image_url ?? '',
  video_url: e.video_url ?? '',
  is_published: e.is_published,
});

const httpsOrNull = (s: string, label: string) => {
  const v = s.trim();
  if (!v) return null;
  if (!/^https:\/\/\S+$/i.test(v)) throw new Error(`${label}: нужна ссылка https://`);
  return v;
};

export default function Exercises() {
  const categories = useLoad(() => unwrap<Category[]>(db().from('exercise_categories').select('*').order('sort_order')));
  const list = useLoad(() => unwrap<Exercise[]>(db().from('exercises').select('*').order('name')));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { run, busy } = useAction();

  const catName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? '—';
  const term = search.trim().toLowerCase();
  const rows = (list.data ?? []).filter((e) => (!term || e.name.toLowerCase().includes(term)) && (!category || e.category_id === category));

  const open = (e?: Exercise) => {
    setError(null);
    setDraft(
      e
        ? toDraft(e)
        : {
            category_id: categories.data?.[0]?.id ?? '',
            name: '',
            description: '',
            technique: '',
            muscles: '',
            equipment: 'none',
            difficulty: 'beginner',
            sets: '3',
            reps: '12',
            rest: '60',
            tips: '',
            mistakes: '',
            image_url: '',
            video_url: '',
            is_published: true,
          },
    );
  };

  const save = () => {
    if (!draft) return;
    try {
      if (!draft.name.trim()) throw new Error('Введите название');
      if (!draft.category_id) throw new Error('Выберите категорию');
      const row = {
        category_id: draft.category_id,
        name: draft.name.trim(),
        description: draft.description.trim(),
        technique: draft.technique.trim(),
        primary_muscles: splitList(draft.muscles),
        equipment: draft.equipment,
        difficulty: draft.difficulty,
        default_sets: num(draft.sets, 1, 20, 'Подходы'),
        default_reps: num(draft.reps, 1, 200, 'Повторения'),
        default_rest_sec: num(draft.rest, 0, 900, 'Отдых'),
        tips: splitList(draft.tips, /\n/),
        mistakes: splitList(draft.mistakes, /\n/),
        image_url: httpsOrNull(draft.image_url, 'Изображение'),
        video_url: httpsOrNull(draft.video_url, 'Видео'),
        is_published: draft.is_published,
      };
      run(async () => {
        if (draft.id) await unwrap(db().from('exercises').update(row).eq('id', draft.id));
        else await unwrap(db().from('exercises').insert(row));
        setDraft(null);
        await list.reload();
      }, 'Упражнение сохранено');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = (e: Exercise) => {
    if (!window.confirm(`Удалить «${e.name}»? Если упражнение используется в программах, удаление будет отклонено — снимите его с публикации.`)) return;
    run(async () => {
      try {
        await unwrap(db().from('exercises').delete().eq('id', e.id));
      } catch (err) {
        if (/foreign key|violates/i.test((err as Error).message)) throw new Error('Упражнение используется в программах — снимите его с публикации');
        throw err;
      }
      await list.reload();
    }, 'Упражнение удалено');
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => draft && setDraft({ ...draft, [k]: v });

  return (
    <>
      <PageHead
        title="Упражнения"
        subtitle={`${list.data?.length ?? 0} в каталоге`}
        action={
          <button className="btn primary" onClick={() => open()} disabled={!categories.data?.length}>
            + Упражнение
          </button>
        }
      />
      <div className="toolbar">
        <input className="input" placeholder="Поиск по названию" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Все категории</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <State loading={list.loading || categories.loading} error={list.error ?? categories.error} onRetry={list.reload} empty={rows.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Категория</th>
                <th>Сложность</th>
                <th>Оборудование</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <div className="small">{e.primary_muscles.join(', ')}</div>
                  </td>
                  <td>{catName(e.category_id)}</td>
                  <td>{LEVELS[e.difficulty]}</td>
                  <td>{EQUIPMENT[e.equipment] ?? e.equipment}</td>
                  <td>
                    {e.is_published ? <span className="tag green">Опубликовано</span> : <span className="tag">Скрыто</span>} {e.is_demo ? <span className="tag">демо</span> : null}
                  </td>
                  <td className="actions">
                    <button className="btn small" onClick={() => open(e)}>
                      Изменить
                    </button>
                    <button className="btn small danger" onClick={() => remove(e)} disabled={busy}>
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
          title={draft.id ? 'Упражнение' : 'Новое упражнение'}
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
            <input className="input" maxLength={120} value={draft.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <div className="field-row">
            <Field label="Категория">
              <select className="select" value={draft.category_id} onChange={(e) => set('category_id', e.target.value)}>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Сложность">
              <select className="select" value={draft.difficulty} onChange={(e) => set('difficulty', e.target.value as Level)}>
                {Object.entries(LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Оборудование">
              <select className="select" value={draft.equipment} onChange={(e) => set('equipment', e.target.value)}>
                {Object.entries(EQUIPMENT).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="field-row">
            <Field label="Подходы">
              <input className="input" inputMode="numeric" value={draft.sets} onChange={(e) => set('sets', e.target.value)} />
            </Field>
            <Field label="Повторения">
              <input className="input" inputMode="numeric" value={draft.reps} onChange={(e) => set('reps', e.target.value)} />
            </Field>
            <Field label="Отдых, с">
              <input className="input" inputMode="numeric" value={draft.rest} onChange={(e) => set('rest', e.target.value)} />
            </Field>
          </div>
          <Field label="Работающие мышцы" hint="Через запятую">
            <input className="input" value={draft.muscles} onChange={(e) => set('muscles', e.target.value)} />
          </Field>
          <Field label="Краткое описание">
            <textarea className="textarea" value={draft.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="Техника выполнения">
            <textarea className="textarea" value={draft.technique} onChange={(e) => set('technique', e.target.value)} />
          </Field>
          <Field label="Советы" hint="Каждый с новой строки">
            <textarea className="textarea" value={draft.tips} onChange={(e) => set('tips', e.target.value)} />
          </Field>
          <Field label="Распространённые ошибки" hint="Каждая с новой строки">
            <textarea className="textarea" value={draft.mistakes} onChange={(e) => set('mistakes', e.target.value)} />
          </Field>
          <Field label="Изображение (URL)" hint="Если не задано, в приложении показывается тематическая заглушка">
            <input className="input" placeholder="https://" value={draft.image_url} onChange={(e) => set('image_url', e.target.value)} />
          </Field>
          <Field label="Видео техники (URL)">
            <input className="input" placeholder="https://" value={draft.video_url} onChange={(e) => set('video_url', e.target.value)} />
          </Field>
          <Check label="Опубликовано (видно пользователям)" checked={draft.is_published} onChange={(v) => set('is_published', v)} />
        </Modal>
      ) : null}
    </>
  );
}
