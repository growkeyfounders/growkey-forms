import { db, supabaseUrl } from "./db.mjs";

const anonKey = process.env.SUPABASE_ANON_KEY;

async function defaultLoadProfile(userId) {
  const rows = await db.select("profiles", `select=*&user_id=eq.${userId}`);
  return rows?.[0] ?? null;
}

// Valida el JWT contra Supabase Auth y carga el perfil (rol).
// Devuelve { userId, role, name } o null.
export async function authenticate(request, { fetchImpl = fetch, loadProfile = defaultLoadProfile } = {}) {
  const header = request.headers["authorization"] || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);

  const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const user = await response.json();

  const profile = await loadProfile(user.id);
  if (!profile) return null;
  return { userId: user.id, role: profile.role, name: profile.name };
}
