import { db, supabaseRequest } from "./db.mjs";
import { authenticate } from "./auth.mjs";
import { evaluateAdvance } from "./engine.mjs";
import { PROGRAM, currentWeek, isLate, isValidDateIso, phaseById, programDay } from "../shared/program.mjs";

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
  // Defensivo: si current_phase está corrupto en DB, phaseById lanza dentro de
  // isLate. Mostramos la vista sin marcar atraso en vez de tumbar el endpoint.
  let late = false;
  if (day !== null && client.status === "active") {
    try {
      late = isLate(client.current_phase, day);
    } catch (error) {
      console.error(`clientView: fase desconocida para el cliente ${client.id}`, error);
    }
  }
  return {
    ...client,
    day,
    week: day === null ? null : currentWeek(day),
    late,
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
  // Defensivo: un current_phase corrupto en DB hace lanzar a phaseById dentro
  // del motor. Logueamos y no avanzamos en vez de propagar un 500.
  let verdict;
  try {
    verdict = evaluateAdvance({
      currentPhaseId: client.current_phase,
      tasks,
      submittedFormSlugs: submitted,
    });
  } catch (error) {
    console.error(`runEngine: evaluateAdvance falló para el cliente ${clientId}`, error);
    return { advanced: false, client };
  }
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
    // JSON.parse acepta "null" o "5": exigimos un objeto para leer campos.
    if (body === null || typeof body !== "object") {
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
    if (!isValidDateIso(startDate)) { sendJson(response, 400, { error: "invalid_date" }); return; }
    const existing = await getClient(auth.userId);
    if (!existing) { sendJson(response, 404, { error: "not_found" }); return; }
    if (existing.start_date) { sendJson(response, 409, { error: "already_started" }); return; }
    // start_date=is.null cierra la carrera entre el check de arriba y el update:
    // dos requests simultáneas solo dejan pasar una.
    const updated = await db.update("skool_clients", `id=eq.${auth.userId}&start_date=is.null`, {
      start_date: startDate,
      status: "active",
      phase_started_at: new Date().toISOString(),
    });
    if (!updated?.length) { sendJson(response, 409, { error: "already_started" }); return; }
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

  // Toggle de tarea: cliente sobre sus tareas (solo fase actual), admin sobre cualquiera.
  // Regla (spec §6): desmarcar NO corre el motor ni retrocede fase.
  const toggleMatch = path.match(/^\/tasks\/([0-9a-f-]+)\/toggle$/);
  if (toggleMatch && method === "POST") {
    const taskId = toggleMatch[1];
    const rows = await db.select("skool_client_tasks", `select=*&id=eq.${taskId}`);
    const task = rows?.[0];
    if (!task) { sendJson(response, 404, { error: "not_found" }); return; }
    if (!isAdmin && task.client_id !== auth.userId) { sendJson(response, 403, { error: "forbidden" }); return; }

    const client = await getClient(task.client_id);
    if (!isAdmin && task.phase !== client.current_phase) { sendJson(response, 409, { error: "not_current_phase" }); return; }

    const nextDone = !task.done;
    const updated = await db.update("skool_client_tasks", `id=eq.${taskId}`, {
      done: nextDone,
      done_at: nextDone ? new Date().toISOString() : null,
    });
    await logEvent(task.client_id, nextDone ? "task_done" : "task_undone", { taskId, title: task.title }, auth.userId);

    // El toggle ya quedó persistido: si el motor falla (DB intermitente,
    // datos corruptos), respondemos sin avance en vez de un 500.
    let engine = { advanced: false };
    if (nextDone) {
      try {
        engine = await runEngine(task.client_id, auth.userId);
      } catch (error) {
        console.error(`toggle: runEngine falló para el cliente ${task.client_id}`, error);
      }
    }
    const [tasks, submitted] = await Promise.all([getTasks(task.client_id), getSubmittedSlugs(task.client_id)]);
    const freshClient = await getClient(task.client_id);
    sendJson(response, 200, {
      task: updated[0],
      advanced: engine.advanced ?? false,
      programCompleted: engine.programCompleted ?? false,
      client: clientView(freshClient, tasks, submitted),
    });
    return;
  }

  // Invitar cliente (admin): usuario en Auth + perfil + fila skool_clients + hilo.
  if (path === "/clients" && method === "POST") {
    if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
    const { email, name = "", business = "" } = body;
    if (!email || !/.+@.+\..+/.test(email)) { sendJson(response, 400, { error: "invalid_email" }); return; }

    const invite = await db.authInvite(email, { name });
    if (!invite.ok) { sendJson(response, 409, { error: "invite_failed", detail: invite.data?.msg }); return; }
    const invited = invite.data;

    await db.upsert("profiles", { user_id: invited.id, role: "client", name });
    await db.upsert("skool_clients", { id: invited.id, email, name, business, status: "invited" });
    await db.upsert("skool_thread_members", { client_id: invited.id, user_id: auth.userId });
    await logEvent(invited.id, "status_change", { to: "invited" }, auth.userId);
    sendJson(response, 200, await getClient(invited.id));
    return;
  }

  // Listar clientes (admin) con vista derivada, progreso de fase y última actividad.
  if (path === "/clients" && method === "GET") {
    if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
    const clients = (await db.select("skool_clients", "select=*&order=created_at.desc")) ?? [];
    if (!clients.length) { sendJson(response, 200, { clients: [] }); return; }

    const ids = clients.map((client) => client.id).join(",");
    const [allTasks, allSubmissions, allEvents, allMessages] = await Promise.all([
      db.select("skool_client_tasks", `select=*&client_id=in.(${ids})&order=phase.asc,position.asc,created_at.asc`),
      db.select("growkey_form_submissions", `select=client_id,form_slug&client_id=in.(${ids})`),
      // limit mitiga el volumen mientras la base es chica: los más recientes
      // bastan para lastActivityAt. Con escala real esto se cambia por una
      // agregación (max(created_at) group by client_id) en vez de traer filas.
      db.select("skool_events", "select=client_id,created_at&order=created_at.desc&limit=2000"),
      db.select("skool_messages", "select=client_id,created_at&order=created_at.desc&limit=2000"),
    ]);

    const lastByClient = (rows, clientId) =>
      (rows ?? []).find((row) => row.client_id === clientId)?.created_at ?? null;

    const views = clients.map((client) => {
      const tasks = (allTasks ?? []).filter((task) => task.client_id === client.id);
      const slugs = (allSubmissions ?? [])
        .filter((submission) => submission.client_id === client.id)
        .map((submission) => submission.form_slug);
      const phaseTasks = tasks.filter((task) => task.phase === client.current_phase);
      const progressPct = phaseTasks.length
        ? Math.round((phaseTasks.filter((task) => task.done).length / phaseTasks.length) * 100)
        : 0;
      const lastEvent = lastByClient(allEvents, client.id);
      const lastMessage = lastByClient(allMessages, client.id);
      const lastActivityAt = [lastEvent, lastMessage].filter(Boolean).sort().pop() ?? null;
      return { ...clientView(client, tasks, slugs), progressPct, lastActivityAt };
    });
    sendJson(response, 200, { clients: views });
    return;
  }

  // Contexto unificado del cliente (admin) — spec §10.
  const ctxMatch = path.match(/^\/clients\/([0-9a-f-]+)\/context$/);
  if (ctxMatch && method === "GET") {
    if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
    const clientId = ctxMatch[1];
    const client = await getClient(clientId);
    if (!client) { sendJson(response, 404, { error: "not_found" }); return; }
    const [tasks, submissions, events, messages, members] = await Promise.all([
      getTasks(clientId),
      db.select("growkey_form_submissions", `select=*&client_id=eq.${clientId}&order=created_at.desc`),
      db.select("skool_events", `select=*&client_id=eq.${clientId}&order=created_at.desc&limit=200`),
      db.select("skool_messages", `select=*&client_id=eq.${clientId}&order=created_at.asc&limit=500`),
      db.select("skool_thread_members", `select=*,profiles(name,photo_url)&client_id=eq.${clientId}`),
    ]);
    sendJson(response, 200, {
      program: PROGRAM,
      client: clientView(client, tasks, (submissions ?? []).map((s) => s.form_slug)),
      submissions, events, messages, threadMembers: members,
    });
    return;
  }

  // Tarea custom (admin): nuevo requisito de la fase indicada.
  const customTaskMatch = path.match(/^\/clients\/([0-9a-f-]+)\/tasks$/);
  if (customTaskMatch && method === "POST") {
    if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
    const clientId = customTaskMatch[1];
    const client = await getClient(clientId);
    if (!client) { sendJson(response, 404, { error: "not_found" }); return; }
    const { title, phase, week = null, suggestedDay = null, classId = null } = body;
    if (typeof title !== "string" || !title.trim()) { sendJson(response, 400, { error: "invalid_title" }); return; }
    const phaseNum = Number(phase);
    if (!PROGRAM.phases.some((p) => p.id === phaseNum)) { sendJson(response, 400, { error: "invalid_phase" }); return; }
    // week/suggestedDay son opcionales, pero si vienen deben ser enteros.
    if (week !== null && !Number.isInteger(week)) { sendJson(response, 400, { error: "invalid_week" }); return; }
    if (suggestedDay !== null && !Number.isInteger(suggestedDay)) { sendJson(response, 400, { error: "invalid_suggested_day" }); return; }
    if (classId && !phaseById(phaseNum).classes.some((c) => c.id === classId)) {
      sendJson(response, 400, { error: "invalid_class" });
      return;
    }
    const inserted = await db.insert("skool_client_tasks", {
      client_id: clientId,
      phase: phaseNum,
      source: "custom",
      title: title.trim(),
      week: week ?? null,
      suggested_day: suggestedDay ?? null,
      class_id: classId ?? null,
      // Después de las base (0..n-1): el checklist ordena custom al final.
      position: phaseById(phaseNum).baseTasks.length,
      created_by: auth.userId,
    });
    const task = inserted[0];
    await logEvent(clientId, "task_added", { taskId: task.id, title: task.title, phase: phaseNum }, auth.userId);
    sendJson(response, 200, task);
    return;
  }

  // Eliminar tarea custom (admin). Las base no se borran: 409.
  const deleteTaskMatch = path.match(/^\/tasks\/([0-9a-f-]+)$/);
  if (deleteTaskMatch && method === "DELETE") {
    if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
    const taskId = deleteTaskMatch[1];
    const rows = await db.select("skool_client_tasks", `select=*&id=eq.${taskId}`);
    const task = rows?.[0];
    if (!task) { sendJson(response, 404, { error: "not_found" }); return; }
    if (task.source !== "custom") { sendJson(response, 409, { error: "base_task" }); return; }
    await db.remove("skool_client_tasks", `id=eq.${taskId}`);
    await logEvent(task.client_id, "task_deleted", { taskId, title: task.title }, auth.userId);
    sendJson(response, 200, { ok: true });
    return;
  }

  // Overrides del equipo (admin): fase, pausa/reactivación, fecha de inicio, completar.
  const overrideMatch = path.match(/^\/clients\/([0-9a-f-]+)\/override$/);
  if (overrideMatch && method === "POST") {
    if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
    const clientId = overrideMatch[1];
    const client = await getClient(clientId);
    if (!client) { sendJson(response, 404, { error: "not_found" }); return; }
    const action = String(body.action || "");

    if (action === "set_phase") {
      const phaseNum = Number(body.phase);
      if (!PROGRAM.phases.some((p) => p.id === phaseNum)) { sendJson(response, 400, { error: "invalid_phase" }); return; }
      const updated = await db.update("skool_clients", `id=eq.${clientId}`, {
        current_phase: phaseNum,
        phase_started_at: new Date().toISOString(),
      });
      await materializePhase(clientId, phaseNum);
      await logEvent(clientId, "phase_override", { from: client.current_phase, to: phaseNum }, auth.userId);
      sendJson(response, 200, updated[0]);
      return;
    }

    if (action === "pause" || action === "resume") {
      const status = action === "pause" ? "paused" : "active";
      const updated = await db.update("skool_clients", `id=eq.${clientId}`, { status });
      await logEvent(clientId, "status_change", { to: status }, auth.userId);
      sendJson(response, 200, updated[0]);
      return;
    }

    if (action === "set_start_date") {
      const startDate = String(body.startDate || "");
      if (!isValidDateIso(startDate)) { sendJson(response, 400, { error: "invalid_date" }); return; }
      const firstActivation = !client.start_date;
      const patch = { start_date: startDate };
      if (firstActivation) {
        // Primera activación por el equipo: equivale al /start-date del cliente.
        patch.status = "active";
        patch.phase_started_at = new Date().toISOString();
      }
      const updated = await db.update("skool_clients", `id=eq.${clientId}`, patch);
      if (firstActivation) await materializePhase(clientId, client.current_phase);
      await logEvent(clientId, "start_date_set", { startDate }, auth.userId);
      sendJson(response, 200, updated[0]);
      return;
    }

    if (action === "complete") {
      const updated = await db.update("skool_clients", `id=eq.${clientId}`, { status: "completed" });
      await logEvent(clientId, "status_change", { to: "completed" }, auth.userId);
      sendJson(response, 200, updated[0]);
      return;
    }

    sendJson(response, 400, { error: "invalid_action" });
    return;
  }

  // Reenviar invitación (admin). Si el email ya está registrado (cliente que ya
  // confirmó o entró con Google), GoTrue rechaza el invite: fallback a recover,
  // que aterriza en el mismo flujo set-password del LoginPage vía type=recovery.
  const resendMatch = path.match(/^\/clients\/([0-9a-f-]+)\/resend-invite$/);
  if (resendMatch && method === "POST") {
    if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
    const client = await getClient(resendMatch[1]);
    if (!client) { sendJson(response, 404, { error: "not_found" }); return; }
    const invite = await db.authInvite(client.email, { name: client.name });
    if (invite.ok) { sendJson(response, 200, { ok: true, via: "invite" }); return; }
    // Fallback a recover SOLO cuando GoTrue indica que el email ya está
    // registrado (422 o mensaje "already..."). Cualquier otro fallo (red,
    // config, rate limit) se reporta tal cual: encadenar recover lo taparía.
    const alreadyRegistered =
      invite.status === 422 || /already/i.test(String(invite.data?.msg ?? invite.data?.message ?? ""));
    if (!alreadyRegistered) {
      sendJson(response, 502, { error: "invite_failed", detail: invite.data?.msg ?? null });
      return;
    }
    const recover = await db.authRecover(client.email);
    if (!recover.ok) {
      sendJson(response, 409, { error: "resend_failed", detail: recover.data?.msg ?? invite.data?.msg });
      return;
    }
    sendJson(response, 200, { ok: true, via: "recover" });
    return;
  }

  // Nota interna (admin): queda en la bitácora como evento `note`.
  const notesMatch = path.match(/^\/clients\/([0-9a-f-]+)\/notes$/);
  if (notesMatch && method === "POST") {
    if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
    const client = await getClient(notesMatch[1]);
    if (!client) { sendJson(response, 404, { error: "not_found" }); return; }
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) { sendJson(response, 400, { error: "invalid_text" }); return; }
    await logEvent(client.id, "note", { text }, auth.userId);
    sendJson(response, 200, { ok: true });
    return;
  }

  // Ligar submission histórica (admin): puede completar la fase actual → motor.
  const linkMatch = path.match(/^\/clients\/([0-9a-f-]+)\/link-submission$/);
  if (linkMatch && method === "POST") {
    if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
    const clientId = linkMatch[1];
    const client = await getClient(clientId);
    if (!client) { sendJson(response, 404, { error: "not_found" }); return; }
    const submissionId = String(body.submissionId || "");
    if (!/^[0-9a-fA-F-]{36}$/.test(submissionId)) { sendJson(response, 400, { error: "invalid_submission_id" }); return; }
    // client_id=is.null: solo se ligan submissions huérfanas — nunca robar una
    // que ya pertenece a otro cliente.
    const updated = await db.update(
      "growkey_form_submissions",
      `id=eq.${submissionId}&client_id=is.null`,
      { client_id: clientId },
    );
    if (!updated?.length) {
      const existing = await db.select("growkey_form_submissions", `select=id&id=eq.${submissionId}`);
      if (!existing?.length) { sendJson(response, 404, { error: "submission_not_found" }); return; }
      sendJson(response, 409, { error: "already_linked_or_missing" });
      return;
    }
    await logEvent(clientId, "form_submitted", { linked: true, submissionId, formSlug: updated[0].form_slug }, auth.userId);
    const engine = await runEngine(clientId, auth.userId);
    sendJson(response, 200, {
      ok: true,
      advanced: engine.advanced ?? false,
      programCompleted: engine.programCompleted ?? false,
    });
    return;
  }

  // --- las rutas de chat se agregan en el chunk 5 ---
  sendJson(response, 404, { error: "not_found" });
}
