import { db, supabaseRequest } from "./db.mjs";
import { authenticate } from "./auth.mjs";
import { evaluateAdvance } from "./engine.mjs";
import { PROGRAM, currentWeek, isLate, phaseById, programDay } from "../shared/program.mjs";

const todayIso = () => new Date().toISOString().slice(0, 10);

async function logEvent(clientId, type, payload, actorId) {
  await db.insert("skool_events", { client_id: clientId, type, payload, actor_id: actorId ?? null }, "return=minimal");
}

async function getClient(clientId) {
  const rows = await db.select("skool_clients", `select=*&id=eq.${clientId}`);
  return rows?.[0] ?? null;
}

async function getTasks(clientId) {
  const rows = await db.select("skool_client_tasks", `select=*&client_id=eq.${clientId}&order=phase.asc,position.asc,created_at.asc`);
  return rows ?? [];
}

async function getSubmittedSlugs(clientId) {
  const rows = await db.select("growkey_form_submissions", `select=form_slug&client_id=eq.${clientId}`);
  return (rows ?? []).map((row) => row.form_slug);
}

// Copia las baseTasks de una fase como filas del cliente. Idempotente por
// el unique index (client_id, template_id): inserta con resolution=ignore-duplicates.
async function materializePhase(clientId, phaseId) {
  const phase = phaseById(phaseId);
  if (!phase.baseTasks.length) return;
  const rows = phase.baseTasks.map((task, index) => ({
    client_id: clientId,
    phase: phaseId,
    source: "base",
    template_id: task.id,
    title: task.title,
    week: task.week,
    suggested_day: task.suggestedDay ?? null,
    class_id: task.classId ?? null,
    position: index,
  }));
  // Idempotente gracias al índice único NO-parcial (client_id, template_id)
  // de la migración: reintentos y dobles llamadas no duplican tareas.
  await supabaseRequest(`/rest/v1/skool_client_tasks?on_conflict=client_id,template_id`, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

// Estado derivado que consumen ambos paneles.
function clientView(client, tasks, submittedSlugs) {
  const day = client.start_date ? programDay(client.start_date, todayIso()) : null;
  return {
    ...client,
    day,
    week: day === null ? null : currentWeek(day),
    late: day !== null && client.status === "active" ? isLate(client.current_phase, day) : false,
    tasks,
    submittedFormSlugs: submittedSlugs,
  };
}

// Corre el motor y aplica el avance si corresponde. Devuelve {advanced, programCompleted, client}.
// Idempotente: relee el cliente y solo escribe si la fase no cambió debajo.
export async function runEngine(clientId, actorId) {
  const client = await getClient(clientId);
  if (!client || client.status !== "active" || !client.start_date) return { advanced: false, client };
  const [tasks, submitted] = await Promise.all([getTasks(clientId), getSubmittedSlugs(clientId)]);
  const verdict = evaluateAdvance({
    currentPhaseId: client.current_phase,
    tasks,
    submittedFormSlugs: submitted,
  });
  if (!verdict.complete) return { advanced: false, client };

  if (verdict.programCompleted) {
    const updated = await db.update(
      "skool_clients",
      `id=eq.${clientId}&current_phase=eq.${client.current_phase}&status=eq.active`,
      { status: "completed" },
    );
    if (updated?.length) await logEvent(clientId, "status_change", { to: "completed" }, actorId);
    return { advanced: false, programCompleted: Boolean(updated?.length), client: updated?.[0] ?? client };
  }

  const updated = await db.update(
    "skool_clients",
    `id=eq.${clientId}&current_phase=eq.${client.current_phase}`,
    { current_phase: verdict.nextPhaseId, phase_started_at: new Date().toISOString() },
  );
  if (!updated?.length) return { advanced: false, client }; // otra request avanzó primero
  await materializePhase(clientId, verdict.nextPhaseId);
  await logEvent(clientId, "phase_advanced", { from: client.current_phase, to: verdict.nextPhaseId }, actorId);
  return { advanced: true, client: updated[0] };
}

export async function handleSkool(request, response, url, { sendJson, readBody }) {
  const auth = await authenticate(request);
  if (!auth) { sendJson(response, 401, { error: "unauthorized" }); return; }
  const isAdmin = auth.role === "admin";
  const path = url.pathname.replace("/api/skool", "");
  const method = request.method;
  let body = null;
  if (method === "POST") {
    try {
      body = JSON.parse((await readBody(request)) || "{}");
    } catch {
      sendJson(response, 400, { error: "invalid_json" });
      return;
    }
  }

  if (path === "/me" && method === "GET") {
    const client = auth.role === "client" ? await getClient(auth.userId) : null;
    sendJson(response, 200, {
      profile: { userId: auth.userId, role: auth.role, name: auth.name },
      client,
      program: PROGRAM,
    });
    return;
  }

  if (path === "/start-date" && method === "POST") {
    if (auth.role !== "client") { sendJson(response, 403, { error: "forbidden" }); return; }
    const startDate = String(body.startDate || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) { sendJson(response, 400, { error: "invalid_date" }); return; }
    const existing = await getClient(auth.userId);
    if (!existing) { sendJson(response, 404, { error: "not_found" }); return; }
    if (existing.start_date) { sendJson(response, 409, { error: "already_started" }); return; }
    const updated = await db.update("skool_clients", `id=eq.${auth.userId}`, {
      start_date: startDate,
      status: "active",
      phase_started_at: new Date().toISOString(),
    });
    await materializePhase(auth.userId, 1);
    await logEvent(auth.userId, "start_date_set", { startDate }, auth.userId);
    sendJson(response, 200, updated[0]);
    return;
  }

  if (path === "/portal" && method === "GET") {
    if (auth.role !== "client") { sendJson(response, 403, { error: "forbidden" }); return; }
    const client = await getClient(auth.userId);
    if (!client) { sendJson(response, 404, { error: "not_found" }); return; }
    const [tasks, submitted] = await Promise.all([getTasks(auth.userId), getSubmittedSlugs(auth.userId)]);
    sendJson(response, 200, { program: PROGRAM, client: clientView(client, tasks, submitted) });
    return;
  }

  // --- las rutas se agregan en las tareas siguientes ---
  sendJson(response, 404, { error: "not_found" });
}
