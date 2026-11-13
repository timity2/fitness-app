# Pulse — фитнес-приложение

Мобильное приложение для iOS и Android (Expo / React Native), база данных и серверная логика на Supabase, веб-панель администратора.

```
kokorin/
├── mobile/      мобильное приложение (Expo SDK 58, TypeScript, Expo Router)
├── admin/       админ-панель (React + TypeScript + Vite)
├── supabase/    миграция БД, демо-данные, Edge Functions
├── scripts/     источник демо-данных и генератор seed
└── sqlcheck/    автотесты SQL-схемы и RLS на встроенном Postgres
```

## Быстрый старт без сервера (демо-режим)

Если ключи Supabase не заданы, мобильное приложение работает в **демо-режиме**: аккаунт и все данные хранятся только на устройстве, каталог упражнений, программ и продуктов берётся из встроенных демо-данных. Это удобно, чтобы посмотреть интерфейс.

```bash
cd mobile
npm install
npm run web
```

Или на телефоне через Expo Go: `npx expo start` и отсканировать QR-код.

## Подключение Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. **SQL Editor** → вставьте и выполните `supabase/migrations/20261113000000_init.sql`, затем `supabase/seed.sql`.
   Либо через CLI: `supabase db push` и `supabase db reset` / выполнение seed.
3. **Authentication → URL Configuration** → добавьте в Redirect URLs:
   - `pulse://**` — подтверждение email и восстановление пароля в приложении;
   - `exp://**` — для разработки в Expo Go;
   - `http://localhost:8081/**` — для веб-версии.
4. Разверните Edge Functions:
   ```bash
   supabase functions deploy delete-account
   supabase functions deploy admin-users
   ```
   Переменные `SUPABASE_URL`, `SUPABASE_ANON_KEY` и `SUPABASE_SERVICE_ROLE_KEY` Supabase передаёт функциям автоматически.
5. Ключи для клиентов: **Project Settings → API**. Используйте только публичный (anon / publishable) ключ.
   ```bash
   cp mobile/.env.example mobile/.env
   cp admin/.env.example admin/.env.local
   ```
6. Назначьте администратора (только через SQL Editor — из приложений это невозможно):
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'admin@example.com';
   ```
7. Запуск админ-панели:
   ```bash
   cd admin
   npm install
   npm run dev
   ```

## Безопасность

- Пароли хранит и проверяет только Supabase Auth.
- `service_role` ключ используется **только** в Edge Functions; в приложение и панель он не попадает. `.env`, `.env.local` исключены из git.
- RLS включён на всех таблицах: пользователь видит только свои измерения, фото, тренировки, питание и настройки. Справочники (упражнения, программы, продукты) — только чтение для пользователей, запись — для администратора.
- Роль администратора хранится в `user_roles`, в которую клиент писать не может. Проверка — серверная функция `is_admin()`, RLS и Edge Function `admin-users`. Флаг `is_blocked` в профиле пользователь сам изменить не может (триггер).
- Тренировки, личные рекорды и достижения записываются только серверной функцией `finish_workout` — клиент не может «выдать» себе достижение.
- Фото прогресса и аватары лежат в приватных бакетах Storage (`<user_id>/файл`) и открываются по подписанным ссылкам на 1 час.
- Сессия на телефоне шифруется AES-256, ключ хранится в Keychain / Keystore (`expo-secure-store`).
- Удаление аккаунта — Edge Function `delete-account`: удаляет файлы и пользователя, остальные данные удаляются каскадно.

## Проверка

```bash
# SQL-схема, RLS, триггеры, функции (25 проверок на встроенном Postgres)
cd sqlcheck && npm install && node check.mjs

# Типы мобильного приложения
cd mobile && npx tsc --noEmit

# Сборка админ-панели
cd admin && npm run build
```

## Демо-данные

`supabase/seed.sql` и `mobile/src/demo/seedData.json` генерируются из `scripts/seed-source.mjs`:

```bash
node scripts/build-seed.mjs
```

Все записи помечены `is_demo = true`: 9 категорий, 27 упражнений, 10 программ, 30 продуктов, 6 достижений. Результатов пользователей seed не создаёт.

## Что нужно доделать перед публикацией

- **Изображения.** У упражнений, программ и продуктов нет фотографий — показываются тематические заглушки в фирменном стиле. Ссылки на реальные фото добавляются в админ-панели (поле «Изображение»), код менять не нужно.
- **Логотип.** Логотип перерисован в векторе по скриншоту (`mobile/src/components/Logo.tsx`, `admin/public/favicon.svg`). Если есть исходный файл, замените им. Иконка приложения и заставка (`mobile/assets/`) пока стандартные от шаблона Expo.
- **Юридические тексты** (`mobile/src/app/legal.tsx`) — шаблон, нужна проверка юристом.
- **Английский язык** в настройках отмечен как «в разработке».
- **Шаги** берутся из системного шагомера только на iOS; на Android и в вебе показывается прочерк.
- Сборка для магазинов: `npx eas-cli@latest build` (нужен аккаунт Expo).
