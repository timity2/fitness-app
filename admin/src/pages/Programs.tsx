// Программы каталога (owner_id = null) и состав упражнений.
import { useState } from 'react';

import { Alert, Check, Field, Modal, PageHead, State, num, useAction, useLoad } from '../components/ui';
import { db, unwrap } from '../lib/supabase';
import { GOALS, LEVELS, LOCATIONS, splitList, WORKOUT_TYPES, type Category, type Exercise, type GoalType, type Level, type Program, type ProgramExercise } from '../lib/types';

interface Item {
  exercise_id: string;
  sets: string;
  reps: string;
  rest: string;
}

interface Draft {
  id?: string;
  name: string;
  description: string;
  category_id: string;
  goal_type: GoalType | '';
  difficulty: Level;
  duration: string;
  location: Program['location'];
  workout_type: Program['workout_type'];
  muscles: string;
  image_url: string;
  is_published: boolean;
  items: Item[];
}

export default function Programs() {
  const list = useLoad(() => unwrap<Program[]>(db().from('workout_programs').select('*').is('owner_id', null).order('name')));
  const exercises = useLoad(() => unwrap<Exercise[]>(db().from('exercises').select('*').order('name')));
  const categories = useLoad(() => unwrap<Category[]>(db().from('exercise_categories').select('*').order('sort_order')));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { run, busy } = useAction();

  const open = async (p?: Program) => {
    setError(null);
    if (!p) {
      setDraft({
        name: '',
        description: '',
        category_id: categories.data?.[0]?.id ?? '',
        goal_type: '',
        difficulty: 'beginner',
        duration: '30',
        location: 'gym',
        workout_type: 'strength',
        muscles: '',
        image_url: '',
        is_published: true,
        items: [],
      });
      return;
    }
    await run(async () => {
      const rows = await unwrap<ProgramExercise[]>(db().from('workout_exercises').select('*').eq('program_id', p.id).order('position'));
      setDraft({
        id: p.id,
        name: p.name,
        description: p.description,
        category_id: p.category_id ?? '',
        goal_type: p.goal_type ?? '',
        difficulty: p.difficulty,
        duration: String(p.duration_min),
        location: p.location,
        workout_type: p.workout_type,
        muscles: p.target_muscles.join(', '),
        image_url: p.image_url ?? '',
        is_published: p.is_published,
        items: rows.map((r) => ({ exercise_id: r.exercise_id, sets: String(r.sets), reps: String(r.reps), rest: String(r.rest_sec) })),
      });
    });
  };

  const save = () => {
    if (!draft) return;
    try {
      if (!draft.name.trim()) throw new Error('Введите название');
      if (draft.items.length === 0) throw new Error('Добавьте хотя бы одно упражнение');
      const image = draft.image_url.trim();
      if (image && !/^https:\/\/\S+$/i.test(image)) throw new Error('Обложка: нужна ссылка https://');
      const row = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        category_id: draft.category_id || null,
        goal_type: draft.goal_type || null,
        difficulty: draft.difficulty,
        duration_min: num(draft.duration, 5, 240, 'Длительность'),
        location: draft.location,
        workout_type: draft.workout_type,
        target_muscles: splitList(draft.muscles),
        image_url: image || null,
        is_published: draft.is_published,
        owner_id: null,
      };
      const items = draft.items.map((it, i) => {
        if (!it.exercise_id) throw new Error(`Упражнение ${i + 1}: выберите упражнение`);
        return {
          exercise_id: it.exercise_id,
          position: i,
          sets: num(it.sets, 1, 20, `Упражнение ${i + 1}, подходы`),
          reps: num(it.reps, 1, 200, `Упражнение ${i + 1}, повторения`),
          rest_sec: num(it.rest, 0, 900, `Упражнение ${i + 1}, отдых`),
        };
      });
      run(async () => {
        let id = draft.id;
        if (id) await unwrap(db().from('workout_programs').update(row).eq('id', id));
        else id = (await unwrap<{ id: string }>(db().from('workout_programs').insert(row).select('id').single())).id;
        // состав программы перезаписывается целиком: так сохраняется порядок
        await unwrap(db().from('workout_exercises').delete().eq('program_id', id));
        await unwrap(db().from('workout_exercises').insert(items.map((it) => ({ ...it, program_id: id }))));
        setDraft(null);
        await list.reload();
      }, 'Программа сохранена');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = (p: Program) => {
    if (!window.confirm(`Удалить программу «${p.name}»? История тренировок пользователей сохранится.`)) return;
    run(async () => {
      await unwrap(db().from('workout_programs').delete().eq('id', p.id));
      await list.reload();
    }, 'Программа удалена');
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => draft && setDraft({ ...draft, [k]: v });
  const setItem = (i: number, patch: Partial<Item>) => draft && setDraft({ ...draft, items: draft.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const move = (i: number, d: -1 | 1) => {
    if (!draft) return;
    const items = [...draft.items];
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    setDraft({ ...draft, items });
  };
  const addItem = () => {
    if (!draft) return;
    const ex = exercises.data?.[0];
    setDraft({ ...draft, items: [...draft.items, { exercise_id: ex?.id ?? '', sets: String(ex?.default_sets ?? 3), reps: String(ex?.default_reps ?? 12), rest: String(ex?.default_rest_sec ?? 60) }] });
  };

  return (
    <>
      <PageHead
        title="Программы"
        subtitle="Тренировки каталога, доступные всем пользователям"
        action={
          <button className="btn primary" onClick={() => open()}>
            + Программа
          </button>
        }
      />
      <State loading={list.loading} error={list.error} onRetry={list.reload} empty={list.data?.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Цель</th>
                <th>Сложность</th>
                <th>Место</th>
                <th>Мин</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.data?.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.goal_type ? GOALS[p.goal_type] : '—'}</td>
                  <td>{LEVELS[p.difficulty]}</td>
                  <td>{LOCATIONS[p.location]}</td>
                  <td>{p.duration_min}</td>
                  <td>
                    {p.is_published ? <span className="tag green">Опубликована</span> : <span className="tag">Скрыта</span>} {p.is_demo ? <span className="tag">демо</span> : null}
                  </td>
                  <td className="actions">
                    <button className="btn small" onClick={() => open(p)} disabled={busy}>
                      Изменить
                    </button>
                    <button className="btn small danger" onClick={() => remove(p)} disabled={busy}>
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
          title={draft.id ? 'Программа' : 'Новая программа'}
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
          <Field label="Описание">
            <textarea className="textarea" value={draft.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div className="field-row">
            <Field label="Категория">
              <select className="select" value={draft.category_id} onChange={(e) => set('category_id', e.target.value)}>
                <option value="">—</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Цель">
              <select className="select" value={draft.goal_type} onChange={(e) => set('goal_type', e.target.value as GoalType | '')}>
                <option value="">Любая</option>
                {Object.entries(GOALS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
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
          </div>
          <div className="field-row">
            <Field label="Место">
              <select className="select" value={draft.location} onChange={(e) => set('location', e.target.value as Program['location'])}>
                {Object.entries(LOCATIONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Тип">
              <select className="select" value={draft.workout_type} onChange={(e) => set('workout_type', e.target.value as Program['workout_type'])}>
                {Object.entries(WORKOUT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Длительность, мин">
              <input className="input" inputMode="numeric" value={draft.duration} onChange={(e) => set('duration', e.target.value)} />
            </Field>
          </div>
          <Field label="Целевые мышцы" hint="Через запятую">
            <input className="input" value={draft.muscles} onChange={(e) => set('muscles', e.target.value)} />
          </Field>
          <Field label="Обложка (URL)">
            <input className="input" placeholder="https://" value={draft.image_url} onChange={(e) => set('image_url', e.target.value)} />
          </Field>

          <h3 style={{ margin: '8px 0 10px' }}>Упражнения</h3>
          <div className="list-editor">
            {draft.items.length > 0 ? (
              <div className="list-editor-row small">
                <span>Упражнение</span>
                <span>Подходы</span>
                <span>Повт.</span>
                <span>Отдых, с</span>
                <span />
              </div>
            ) : null}
            {draft.items.map((it, i) => (
              <div key={i} className="list-editor-row">
                <select className="select" value={it.exercise_id} onChange={(e) => setItem(i, { exercise_id: e.target.value })}>
                  {exercises.data?.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <input className="input" inputMode="numeric" aria-label="Подходы" value={it.sets} onChange={(e) => setItem(i, { sets: e.target.value })} />
                <input className="input" inputMode="numeric" aria-label="Повторения" value={it.reps} onChange={(e) => setItem(i, { reps: e.target.value })} />
                <input className="input" inputMode="numeric" aria-label="Отдых" value={it.rest} onChange={(e) => setItem(i, { rest: e.target.value })} />
                <span style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn small" onClick={() => move(i, -1)} aria-label="Выше">
                    ↑
                  </button>{' '}
                  <button className="btn small" onClick={() => move(i, 1)} aria-label="Ниже">
                    ↓
                  </button>{' '}
                  <button className="btn small danger" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })} aria-label="Убрать">
                    ✕
                  </button>
                </span>
              </div>
            ))}
            <button className="btn" onClick={addItem} disabled={!exercises.data?.length} style={{ alignSelf: 'flex-start' }}>
              + Добавить упражнение
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            <Check label="Опубликована (видна пользователям)" checked={draft.is_published} onChange={(v) => set('is_published', v)} />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
