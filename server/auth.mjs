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

  // Si Supabase Auth no responde (red caída o env sin configurar), tratamos la
  // request como no autenticada en vez de tumbar el handler con un 500.
  let response;
  try {
    response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const user = await response.json();

  // Un perfil ilegible (tabla profiles caída o query rota) también es "no
  // autenticado": 401 en vez de tumbar el handler con un 500.
  let profile;
  try {
    profile = await loadProfile(user.id);
  } catch {
    return null;
  }
  if (!profile) return null;
  return { userId: user.id, role: profile.role, name: profile.name };
}
