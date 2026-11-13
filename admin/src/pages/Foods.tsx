// Общая база продуктов (owner_id = null)
import { useState } from 'react';

import { Alert, Check, Field, Modal, PageHead, State, num, useAction, useLoad } from '../components/ui';
import { db, unwrap } from '../lib/supabase';
import type { Food } from '../lib/types';

const CATEGORIES: Record<string, string> = {
  meat: 'Мясо и птица',
  fish: 'Рыба',
  dairy: 'Молочное и яйца',
  grains: 'Крупы и хлеб',
  vegetables: 'Овощи',
  fruits: 'Фрукты',
  nuts: 'Орехи',
  other: 'Другое',
};

interface Draft {
  id?: string;
  name: string;
  category: string;
  kcal: string;
  protein: string;
  fat: string;
  carbs: string;
  serving: string;
  image_url: string;
  external_source: string;
  external_id: string;
  is_published: boolean;
}

export default function Foods() {
  const list = useLoad(() => unwrap<Food[]>(db().from('food_products').select('*').is('owner_id', null).order('name')));
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { run, busy } = useAction();

  const term = search.trim().toLowerCase();
  const rows = (list.data ?? []).filter((f) => !term || f.name.toLowerCase().includes(term));

  const open = (f?: Food) => {
    setError(null);
    setDraft(
      f
        ? {
            id: f.id,
            name: f.name,
            category: f.category,
            kcal: String(f.kcal_100),
            protein: String(f.protein_100),
            fat: String(f.fat_100),
            carbs: String(f.carbs_100),
            serving: String(f.serving_g),
            image_url: f.image_url ?? '',
            external_source: f.external_source ?? '',
            external_id: f.external_id ?? '',
            is_published: f.is_published,
          }
        : { name: '', category: 'other', kcal: '', protein: '0', fat: '0', carbs: '0', serving: '100', image_url: '', external_source: '', external_id: '', is_published: true },
    );
  };

  const save = () => {
    if (!draft) return;
    try {
      if (!draft.name.trim()) throw new Error('Введите название');
      const protein = num(draft.protein, 0, 100, 'Белки');
      const fat = num(draft.fat, 0, 100, 'Жиры');
      const carbs = num(draft.carbs, 0, 100, 'Углеводы');
      if (protein + fat + carbs > 100) throw new Error('Сумма БЖУ на 100 г не может превышать 100 г');
      const image = draft.image_url.trim();
      if (image && !/^https:\/\/\S+$/i.test(image)) throw new Error('Изображение: нужна ссылка https://');
      const row = {
        name: draft.name.trim(),
        category: draft.category,
        kcal_100: num(draft.kcal, 0, 950, 'Калории'),
        protein_100: protein,
        fat_100: fat,
        carbs_100: carbs,
        serving_g: num(draft.serving, 1, 5000, 'Порция'),
        image_url: image || null,
        external_source: draft.external_source.trim() || null,
        external_id: draft.external_id.trim() || null,
        is_published: draft.is_published,
        owner_id: null,
      };
      run(async () => {
        if (draft.id) await unwrap(db().from('food_products').update(row).eq('id', draft.id));
        else await unwrap(db().from('food_products').insert(row));
        setDraft(null);
        await list.reload();
      }, 'Продукт сохранён');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = (f: Food) => {
    if (!window.confirm(`Удалить «${f.name}»? Записи в дневниках пользователей сохранятся — значения в них зафиксированы.`)) return;
    run(async () => {
      await unwrap(db().from('food_products').delete().eq('id', f.id));
      await list.reload();
    }, 'Продукт удалён');
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => draft && setDraft({ ...draft, [k]: v });

  return (
    <>
      <PageHead
        title="Продукты"
        subtitle="Общая база продуктов. Значения — на 100 г"
        action={
          <button className="btn primary" onClick={() => open()}>
            + Продукт
          </button>
        }
      />
      <div className="toolbar">
        <input className="input" placeholder="Поиск по названию" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <State loading={list.loading} error={list.error} onRetry={list.reload} empty={rows.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Категория</th>
                <th>Ккал</th>
                <th>Б / Ж / У</th>
                <th>Порция</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td>{CATEGORIES[f.category] ?? f.category}</td>
                  <td>{f.kcal_100}</td>
                  <td className="muted">
                    {f.protein_100} / {f.fat_100} / {f.carbs_100}
                  </td>
                  <td>{f.serving_g} г</td>
                  <td>
                    {f.is_published ? <span className="tag green">Опубликован</span> : <span className="tag">Скрыт</span>} {f.is_demo ? <span className="tag">демо</span> : null}
                  </td>
                  <td className="actions">
                    <button className="btn small" onClick={() => open(f)}>
                      Изменить
                    </button>
                    <button className="btn small danger" onClick={() => remove(f)} disabled={busy}>
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
          title={draft.id ? 'Продукт' : 'Новый продукт'}
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
              <select className="select" value={draft.category} onChange={(e) => set('category', e.target.value)}>
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Калории, ккал">
              <input className="input" inputMode="decimal" value={draft.kcal} onChange={(e) => set('kcal', e.target.value)} />
            </Field>
            <Field label="Порция, г">
              <input className="input" inputMode="decimal" value={draft.serving} onChange={(e) => set('serving', e.target.value)} />
            </Field>
          </div>
          <div className="field-row">
            <Field label="Белки, г">
              <input className="input" inputMode="decimal" value={draft.protein} onChange={(e) => set('protein', e.target.value)} />
            </Field>
            <Field label="Жиры, г">
              <input className="input" inputMode="decimal" value={draft.fat} onChange={(e) => set('fat', e.target.value)} />
            </Field>
            <Field label="Углеводы, г">
              <input className="input" inputMode="decimal" value={draft.carbs} onChange={(e) => set('carbs', e.target.value)} />
            </Field>
          </div>
          <Field label="Изображение (URL)">
            <input className="input" placeholder="https://" value={draft.image_url} onChange={(e) => set('image_url', e.target.value)} />
          </Field>
          <div className="field-row">
            <Field label="Внешний источник" hint="Например, openfoodfacts">
              <input className="input" value={draft.external_source} onChange={(e) => set('external_source', e.target.value)} />
            </Field>
            <Field label="ID во внешней базе">
              <input className="input" value={draft.external_id} onChange={(e) => set('external_id', e.target.value)} />
            </Field>
          </div>
          <Check label="Опубликован (виден пользователям)" checked={draft.is_published} onChange={(v) => set('is_published', v)} />
        </Modal>
      ) : null}
    </>
  );
}
