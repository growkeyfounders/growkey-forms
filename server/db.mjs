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
};
