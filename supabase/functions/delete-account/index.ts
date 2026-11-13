// Edge Function: безопасное удаление собственного аккаунта.
// Личность определяется по JWT вызывающего, а не по данным из тела запроса.
// service_role ключ существует только здесь, в окружении функции.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function removeFolder(admin: ReturnType<typeof createClient>, bucket: string, folder: string) {
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 100 });
    if (error || !data || data.length === 0) return;
    await admin.storage.from(bucket).remove(data.map((f) => `${folder}/${f.name}`));
    if (data.length < 100) return;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const uid = userData.user.id;

  await removeFolder(admin, 'progress-photos', uid);
  await removeFolder(admin, 'avatars', uid);

  // Строки во всех таблицах удаляются каскадно (on delete cascade от auth.users)
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
