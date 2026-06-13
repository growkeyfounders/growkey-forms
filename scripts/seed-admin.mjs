// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//      ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME="..." node scripts/seed-admin.mjs
const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Equipo Growkey";
if (!url || !key || !email || !password) {
  console.error("Faltan env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const createRes = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers,
  body: JSON.stringify({ email, password, email_confirm: true }),
});
const created = await createRes.json();
let userId = created.id;
if (!createRes.ok) {
  if (!String(created.msg || created.message || "").toLowerCase().includes("already")) {
    console.error("Error creando usuario:", created);
    process.exit(1);
  }
  const lookup = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers }).then((r) => r.json());
  userId = lookup.users.find((u) => u.email === email)?.id;
}
if (!userId) { console.error("No se pudo resolver el user id"); process.exit(1); }

const upsert = await fetch(`${url}/rest/v1/profiles`, {
  method: "POST",
  headers: { ...headers, Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify({ user_id: userId, role: "admin", name }),
});
if (!upsert.ok) { console.error("Error en profiles:", await upsert.text()); process.exit(1); }
console.log(`Admin listo: ${email} (${userId})`);
