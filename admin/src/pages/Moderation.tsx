// Модерация пользовательского контента: собственные продукты и программы пользователей.
// Такой контент виден только его автору, но администратор может скрыть или удалить
// некорректные записи, а продукт — перенести в общий каталог.
import { useState } from 'react';

import { PageHead, State, useAction, useLoad } from '../components/ui';
import { db, unwrap } from '../lib/supabase';
import { formatDate, LEVELS, type Food, type Program } from '../lib/types';

type Tab = 'foods' | 'programs';

export default function Moderation() {
  const [tab, setTab] = useState<Tab>('foods');
  const foods = useLoad(() => unwrap<Food[]>(db().from('food_products').select('*').not('owner_id', 'is', null).order('created_at', { ascending: false }).limit(200)));
  const programs = useLoad(() => unwrap<Program[]>(db().from('workout_programs').select('*').not('owner_id', 'is', null).order('created_at', { ascending: false }).limit(200)));
  const { run, busy } = useAction();

  const suspicious = (f: Food) => f.protein_100 + f.fat_100 + f.carbs_100 > 100 || f.kcal_100 > 900 || Math.abs(f.protein_100 * 4 + f.carbs_100 * 4 + f.fat_100 * 9 - f.kcal_100) > 120;

  const toggleFood = (f: Food) =>
    run(async () => {
      await unwrap(db().from('food_products').update({ is_published: !f.is_published }).eq('id', f.id));
      await foods.reload();
    }, f.is_published ? 'Продукт скрыт' : 'Продукт восстановлен');

  const promote = (f: Food) => {
    if (!window.confirm(`Скопировать «${f.name}» в общий каталог? Он станет доступен всем пользователям.`)) return;
    run(async () => {
      await unwrap(
        db().from('food_products').insert({
          owner_id: null,
          name: f.name,
          category: 'other',
          kcal_100: f.kcal_100,
          protein_100: f.protein_100,
          fat_100: f.fat_100,
          carbs_100: f.carbs_100,
          serving_g: f.serving_g,
          is_published: true,
        }),
      );
    }, 'Продукт добавлен в общий каталог');
  };

  const removeFood = (f: Food) => {
    if (!window.confirm(`Удалить продукт «${f.name}» пользователя?`)) return;
    run(async () => {
      await unwrap(db().from('food_products').delete().eq('id', f.id));
      await foods.reload();
    }, 'Продукт удалён');
  };

  const toggleProgram = (p: Program) =>
    run(async () => {
      await unwrap(db().from('workout_programs').update({ is_published: !p.is_published }).eq('id', p.id));
      await programs.reload();
    }, p.is_published ? 'Программа скрыта' : 'Программа восстановлена');

  return (
    <>
      <PageHead title="Модерация" subtitle="Контент, созданный пользователями" />
      <div className="toolbar">
        <button className={`btn${tab === 'foods' ? ' primary' : ''}`} onClick={() => setTab('foods')}>
          Продукты пользователей {foods.data ? `· ${foods.data.length}` : ''}
        </button>
        <button className={`btn${tab === 'programs' ? ' primary' : ''}`} onClick={() => setTab('programs')}>
          Программы пользователей {programs.data ? `· ${programs.data.length}` : ''}
        </button>
      </div>

      {tab === 'foods' ? (
        <State loading={foods.loading} error={foods.error} onRetry={foods.reload} empty={foods.data?.length === 0}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Ккал</th>
                  <th>Б / Ж / У</th>
                  <th>Создан</th>
                  <th>Проверка</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {foods.data?.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.name}</td>
                    <td>{f.kcal_100}</td>
                    <td className="muted">
                      {f.protein_100} / {f.fat_100} / {f.carbs_100}
                    </td>
                    <td>{formatDate(f.created_at)}</td>
                    <td>
                      {suspicious(f) ? <span className="tag red">Значения не сходятся</span> : <span className="tag green">ОК</span>} {!f.is_published ? <span className="tag">Скрыт</span> : null}
                    </td>
                    <td className="actions">
                      <button className="btn small" onClick={() => promote(f)} disabled={busy}>
                        В каталог
                      </button>
                      <button className="btn small" onClick={() => toggleFood(f)} disabled={busy}>
                        {f.is_published ? 'Скрыть' : 'Показать'}
                      </button>
                      <button className="btn small danger" onClick={() => removeFood(f)} disabled={busy}>
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            «Значения не сходятся» — калорийность заметно отличается от расчёта 4·Б + 4·У + 9·Ж или сумма БЖУ больше 100 г.
          </p>
        </State>
      ) : (
        <State loading={programs.loading} error={programs.error} onRetry={programs.reload} empty={programs.data?.length === 0}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Сложность</th>
                  <th>Создана</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {programs.data?.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{LEVELS[p.difficulty]}</td>
                    <td>{formatDate(p.created_at)}</td>
                    <td>{p.is_published ? <span className="tag green">Видна автору</span> : <span className="tag">Скрыта</span>}</td>
                    <td className="actions">
                      <button className="btn small" onClick={() => toggleProgram(p)} disabled={busy}>
                        {p.is_published ? 'Скрыть' : 'Показать'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </State>
      )}
    </>
  );
}
