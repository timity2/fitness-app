// Edge Function: управление аккаунтами из админ-панели (список, блокировка, удаление).
// Права проверяются на сервере по таблице user_roles — значение из клиента не используется.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: role } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (!role) return json({ error: 'forbidden' }, 403);

  let body: { action?: string; user_id?: string; page?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  if (body.action === 'list') {
    const page = Math.max(1, Number(body.page) || 1);
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 50 });
    if (error) return json({ error: error.message }, 500);
    const ids = data.users.map((u) => u.id);
    const { data: profiles } = await admin.from('profiles').select('*').in('id', ids);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return json({
      users: data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed: Boolean(u.email_confirmed_at),
        profile: byId.get(u.id) ?? null,
      })),
    });
  }

  const target = body.user_id ?? '';
  if (!UUID.test(target)) return json({ error: 'invalid user_id' }, 400);
  if (target === userData.user.id) return json({ error: 'cannot modify own account' }, 400);

  if (body.action === 'block' || body.action === 'unblock') {
    const blocked = body.action === 'block';
    // ban_duration отзывает возможность входа и обновления токена
    const { error } = await admin.auth.admin.updateUserById(target, { ban_duration: blocked ? '876000h' : 'none' });
    if (error) return json({ error: error.message }, 500);
    await admin.from('profiles').update({ is_blocked: blocked }).eq('id', target);
    return json({ ok: true });
  }

  if (body.action === 'delete') {
    const { error } = await admin.auth.admin.deleteUser(target);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: 'unknown action' }, 400);
});
