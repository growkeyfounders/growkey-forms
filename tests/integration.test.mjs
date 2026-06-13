// Integración API + RLS contra el server local y el Supabase real (Task 21).
//
// Corre SOLO si hay credenciales de prueba en el entorno; sin ellas la suite
// completa se salta y `npm test` sigue verde (CI-safe, sin setup local).
//
// Env vars requeridas para correrla:
//   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD     admin del seed (scripts/seed-admin.mjs)
//   TEST_CLIENT_EMAIL / TEST_CLIENT_PASSWORD   cliente de prueba ya invitado y activo
//   TEST_BASE_URL                              server local (default http://127.0.0.1:5174)
//   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY proyecto Supabase (anon key pública)
//
// El server debe estar corriendo con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// y SUPABASE_ANON_KEY apuntando al mismo proyecto.
import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const RUN = Boolean(process.env.TEST_ADMIN_EMAIL);
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:5174";

const REQUIRED_ENV = [
  "TEST_ADMIN_EMAIL",
  "TEST_ADMIN_PASSWORD",
  "TEST_CLIENT_EMAIL",
  "TEST_CLIENT_PASSWORD",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];

const get = (path, token) =>
  fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const post = (path, token, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });

describe.skipIf(!RUN)("integración: API con auth y RLS (entorno real)", () => {
  /** supabase-js con la sesión del admin / del cliente (anon key + JWT). */
  let adminDb;
  let clientDb;
  let adminToken;
  let clientToken;
  let clientId;

  beforeAll(async () => {
    const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
    if (missing.length) {
      throw new Error(`Faltan env vars para la suite de integración: ${missing.join(", ")}`);
    }
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    adminDb = createClient(url, anonKey, { auth: { persistSession: false } });
    clientDb = createClient(url, anonKey, { auth: { persistSession: false } });

    const admin = await adminDb.auth.signInWithPassword({
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    });
    if (admin.error) throw new Error(`Login admin falló: ${admin.error.message}`);
    adminToken = admin.data.session.access_token;

    const client = await clientDb.auth.signInWithPassword({
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD,
    });
    if (client.error) throw new Error(`Login cliente falló: ${client.error.message}`);
    clientToken = client.data.session.access_token;
    clientId = client.data.user.id;
  });

  // Otro cliente (≠ el de prueba) desde la vista admin; null si no existe.
  async function findOtherClient() {
    const response = await get("/api/skool/clients", adminToken);
    expect(response.status).toBe(200);
    const { clients } = await response.json();
    return clients.find((row) => row.id !== clientId) ?? null;
  }

  describe("API con auth", () => {
    it("GET /api/submissions: 401 sin token, 403 cliente, 200 admin", async () => {
      expect((await get("/api/submissions")).status).toBe(401);
      expect((await get("/api/submissions", clientToken)).status).toBe(403);
      expect((await get("/api/submissions", adminToken)).status).toBe(200);
    });

    it("GET /api/skool/portal: 403 admin, 200 cliente con su propio id", async () => {
      expect((await get("/api/skool/portal", adminToken)).status).toBe(403);
      const response = await get("/api/skool/portal", clientToken);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.client.id).toBe(clientId);
    });

    it("GET /api/skool/clients: 403 con token de cliente", async () => {
      expect((await get("/api/skool/clients", clientToken)).status).toBe(403);
    });

    it("POST toggle sobre tarea de OTRO cliente con token de cliente → 403", async (ctx) => {
      const other = await findOtherClient();
      const task = other?.tasks?.[0];
      // Requiere un segundo cliente con tareas materializadas en el entorno.
      if (!task) return ctx.skip();
      const response = await post(`/api/skool/tasks/${task.id}/toggle`, clientToken);
      expect(response.status).toBe(403);
    });
  });

  describe("RLS directo contra Supabase (anon key + sesión del cliente)", () => {
    it("skool_clients: el cliente ve exactamente su propia fila", async () => {
      const { data, error } = await clientDb.from("skool_clients").select("*");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(clientId);
    });

    it("skool_messages de un client_id ajeno: 0 filas", async () => {
      const other = await findOtherClient();
      const foreignId = other?.id ?? crypto.randomUUID();
      const { data, error } = await clientDb
        .from("skool_messages")
        .select("*")
        .eq("client_id", foreignId);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it("insert en skool_messages con client_id ajeno: bloqueado por RLS", async () => {
      const other = await findOtherClient();
      const foreignId = other?.id ?? crypto.randomUUID();
      const { data, error } = await clientDb
        .from("skool_messages")
        .insert({ client_id: foreignId, sender_id: clientId, body: "intruso" })
        .select();
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it("update de profiles.role a admin sobre la propia fila: no surte efecto", async () => {
      // Sin policy de UPDATE en profiles, PostgREST no encuentra filas que
      // actualizar (o rechaza): en ningún caso cambia el rol.
      const { data, error } = await clientDb
        .from("profiles")
        .update({ role: "admin" })
        .eq("user_id", clientId)
        .select();
      expect(error !== null || data.length === 0).toBe(true);

      const after = await clientDb.from("profiles").select("role").eq("user_id", clientId).single();
      expect(after.error).toBeNull();
      expect(after.data.role).toBe("client");
    });

    it("skool_events: 0 filas para el cliente (solo admin)", async () => {
      const { data, error } = await clientDb.from("skool_events").select("*");
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });
});
