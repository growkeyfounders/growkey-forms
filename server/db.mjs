const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabase = Boolean(supabaseUrl && serviceKey);
export { supabaseUrl };

export function normalizeSupabaseUrl(value) {
  return value?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

// REST genérico con service role (bypassa RLS — solo server)
export async function supabaseRequest(pathAndQuery, options = {}) {
  const response = await fetch(`${supabaseUrl}${pathAndQuery}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed ${response.status}: ${text}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// GoTrue (Auth Admin) con service role. A diferencia de supabaseRequest NO
// lanza en error HTTP: el caller inspecciona el status (ej. invitar un email
// ya registrado responde 422 y tiene fallback a recover).
async function authPost(pathname, payload) {
  const response = await fetch(`${supabaseUrl}${pathname}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { msg: text };
  }
  return { ok: response.ok, status: response.status, data };
}

// Helpers de tabla (PostgREST)
export const db = {
  select: (table, query = "select=*") => supabaseRequest(`/rest/v1/${table}?${query}`),
  insert: (table, rows, prefer = "return=representation") =>
    supabaseRequest(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: prefer },
      body: JSON.stringify(rows),
    }),
  update: (table, query, patch) =>
    supabaseRequest(`/rest/v1/${table}?${query}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    }),
  upsert: (table, rows) =>
    supabaseRequest(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(rows),
    }),
  remove: (table, query) =>
    supabaseRequest(`/rest/v1/${table}?${query}`, { method: "DELETE" }),
  authInvite: (email, data = {}) => authPost("/auth/v1/invite", { email, data }),
  authRecover: (email) => authPost("/auth/v1/recover", { email }),
  // Crea un usuario YA confirmado. Si se pasa password, el cliente entra con ella;
  // si no, la define luego al abrir su enlace de acceso.
  authCreateUser: (email, data = {}, password) =>
    authPost("/auth/v1/admin/users", {
      email,
      email_confirm: true,
      user_metadata: data,
      ...(password ? { password } : {}),
    }),
  // Borra un usuario de Auth (para rechazar solicitudes).
  authDeleteUser: async (id) => {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    return { ok: response.ok, status: response.status };
  },
  // Genera un enlace de un solo uso; usamos su hashed_token para armar un link
  // a NUESTRO dominio (el front lo canjea con verifyOtp, sin depender del redirect
  // configurado en Supabase).
  authGenerateLink: (email, type = "recovery") =>
    authPost("/auth/v1/admin/generate_link", { type, email }),
  // Busca un usuario por email (base chica: lista y filtra). Para reusar cuando
  // "Invitar" recibe un email que ya existe en Auth.
  authFindUserByEmail: async (email) => {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return (data.users || []).find((user) => user.email === email) || null;
  },
};

// Envío de correo transaccional vía Resend. Si no hay RESEND_API_KEY configurada,
// no falla: devuelve {skipped:true} para que el flujo (aprobar) siga funcionando
// aunque el correo esté apagado. RESEND_FROM permite usar un dominio verificado.
export async function sendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };
  const from = process.env.RESEND_FROM || "Agentic Sales <onboarding@resend.dev>";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, error: true };
  }
}
