import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PhaseConfig } from "../../shared/program.mjs";
import { PROGRAM, phaseById } from "../../shared/program.mjs";
import { apiDelete, apiGet, apiPost } from "../api";
import { PhaseTimeline } from "../components/PhaseTimeline";
import { formConfigs, type FormValues } from "../formSchema";
import type {
  AdminContext,
  ClientView,
  EventRow,
  SubmissionRow,
  TaskRow,
  ToggleResponse,
} from "../skoolTypes";
import { loadSubmissions, type Submission } from "../storage";
import { initials, relativeTime, STATUS_LABEL, statusKey } from "./AdminPanel";
import { ClientDetail } from "./SubmissionsPage";

function localTodayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function formTitle(slug: string) {
  return formConfigs.find((config) => config.slug === slug)?.shortTitle ?? slug;
}

// La fila cruda del context (snake_case) → el shape que consume ClientDetail.
function rowToSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    createdAt: row.created_at,
    values: { ...(row.values as unknown as FormValues), formSlug: row.form_slug },
    score: row.score ?? 0,
    stage: row.stage ?? "",
  };
}

type Toast = { kind: "ok" | "error"; message: string };

export function AdminClientDetail({ clientId }: { clientId: string }) {
  const [data, setData] = useState<AdminContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"auth" | "network" | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);

  const load = useCallback(
    async (withSpinner = true) => {
      if (withSpinner) setLoading(true);
      setLoadError(null);
      try {
        setData(await apiGet<AdminContext>(`/api/skool/clients/${clientId}/context`));
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        setLoadError(code === "unauthorized" || code === "forbidden" ? "auth" : "network");
      } finally {
        if (withSpinner) setLoading(false);
      }
    },
    [clientId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = useCallback((kind: Toast["kind"], message: string) => {
    setToast({ kind, message });
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  // Acción de override genérica: ejecuta, refresca el contexto y avisa.
  const runAction = useCallback(
    async (action: () => Promise<void>, okMessage: string, errorMessage: string) => {
      if (actionBusy) return;
      setActionBusy(true);
      try {
        await action();
        await load(false);
        showToast("ok", okMessage);
      } catch {
        showToast("error", errorMessage);
      } finally {
        setActionBusy(false);
      }
    },
    [actionBusy, load, showToast],
  );

  function patchTask(taskId: string, patch: (task: TaskRow) => TaskRow) {
    setData((current) =>
      current
        ? {
            ...current,
            client: {
              ...current.client,
              tasks: current.client.tasks.map((task) => (task.id === taskId ? patch(task) : task)),
            },
          }
        : current,
    );
  }

  // Toggle optimista con rollback (spec §11), versión admin: cualquier fase.
  async function toggleTask(task: TaskRow) {
    if (!data || busyTaskId) return;
    const nextDone = !task.done;
    setBusyTaskId(task.id);
    patchTask(task.id, (current) => ({
      ...current,
      done: nextDone,
      done_at: nextDone ? new Date().toISOString() : null,
    }));
    try {
      const result = await apiPost<ToggleResponse>(`/api/skool/tasks/${task.id}/toggle`);
      setData((current) => (current ? { ...current, client: result.client } : current));
      if (result.programCompleted) {
        showToast("ok", "El cliente completó el programa.");
      } else if (result.advanced) {
        showToast("ok", `El cliente avanzó a la fase ${result.client.current_phase}.`);
      }
      // La bitácora cambió con el toggle: refresco silencioso del contexto.
      void load(false);
    } catch {
      patchTask(task.id, () => task);
      showToast("error", "No pudimos guardar el cambio, intenta de nuevo.");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function deleteTask(task: TaskRow) {
    if (!window.confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
    await runAction(
      async () => {
        await apiDelete(`/api/skool/tasks/${task.id}`);
      },
      "Tarea eliminada.",
      "No pudimos eliminar la tarea, intenta de nuevo.",
    );
  }

  if (loading) {
    return (
      <main className="admin-detail">
        <div className="portal-status" role="status">
          <span className="spinner" aria-hidden="true" />
          <p className="route-status">Cargando el contexto del cliente…</p>
        </div>
      </main>
    );
  }

  if (loadError === "auth") {
    return (
      <main className="admin-detail">
        <div className="portal-status">
          <p className="route-status">Tu sesión expiró, vuelve a entrar.</p>
          <a className="secondary-button" href="/login">
            Ir al login
          </a>
        </div>
      </main>
    );
  }

  if (loadError || !data) {
    return (
      <main className="admin-detail">
        <div className="portal-status">
          <p className="route-status">No pudimos cargar este cliente. Revisa tu conexión e intenta de nuevo.</p>
          <button className="secondary-button" onClick={() => void load()} type="button">
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  const { client, events, submissions } = data;

  // El mensaje depende de la vía: invite directo o recover (ya tenía cuenta).
  async function resendInvite() {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const result = await apiPost<{ ok: boolean; via: "invite" | "recover" }>(
        `/api/skool/clients/${client.id}/resend-invite`,
      );
      showToast(
        "ok",
        result.via === "invite"
          ? "Invitación reenviada."
          : "Ya tenía cuenta: le enviamos un correo para restablecer su contraseña.",
      );
    } catch {
      showToast("error", "No pudimos reenviar la invitación, intenta de nuevo.");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <main className="admin-detail">
      <a className="back-link" href="/admin">
        ← Volver al panel
      </a>

      <DetailHero
        busy={actionBusy}
        client={client}
        onAction={runAction}
        onResendInvite={() => void resendInvite()}
      />

      <section className="admin-card" aria-label="Camino del cliente">
        <header className="admin-card__header">
          <div>
            <p className="eyebrow">Camino</p>
            <h2>Roadmap de {PROGRAM.totalDays} días</h2>
          </div>
          {client.start_date ? (
            <small className="admin-card__hint">Inició el {client.start_date}</small>
          ) : (
            <small className="admin-card__hint">Aún no elige fecha de inicio</small>
          )}
        </header>
        <PhaseTimeline currentPhase={client.current_phase} day={client.day} startDate={client.start_date} />
      </section>

      <div className="detail-grid">
        <div className="detail-col">
          <PhaseChecklists
            busyTaskId={busyTaskId}
            client={client}
            onAdd={() => setTaskModalOpen(true)}
            onDelete={deleteTask}
            onToggle={toggleTask}
          />
          <FormsCard busy={actionBusy} client={client} onAction={runAction} submissions={submissions} />
        </div>
        <div className="detail-col">
          <EventsCard events={events} />
          <NotesCard busy={actionBusy} clientId={client.id} onAction={runAction} />
          <section className="admin-card admin-card--empty" aria-label="Chat">
            <p className="eyebrow">Chat del hilo</p>
            <h2>El chat llega en la siguiente entrega</h2>
            <p className="route-status">
              Aquí vas a conversar con {client.name || "el cliente"} y tu equipo en tiempo real.
            </p>
          </section>
        </div>
      </div>

      {taskModalOpen ? (
        <CustomTaskModal
          busy={actionBusy}
          currentPhase={client.current_phase}
          onClose={() => setTaskModalOpen(false)}
          onSubmit={(payload) =>
            runAction(
              async () => {
                await apiPost(`/api/skool/clients/${client.id}/tasks`, payload);
                setTaskModalOpen(false);
              },
              "Tarea agregada al checklist.",
              "No pudimos agregar la tarea, intenta de nuevo.",
            )
          }
        />
      ) : null}

      {toast ? (
        <div className={toast.kind === "ok" ? "toast-success" : "toast-error"} role="alert">
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}

// ===== Cabecera con overrides =====

type RunAction = (
  action: () => Promise<void>,
  okMessage: string,
  errorMessage: string,
) => Promise<void>;

function DetailHero({
  client,
  busy,
  onAction,
  onResendInvite,
}: {
  client: ClientView;
  busy: boolean;
  onAction: RunAction;
  onResendInvite: () => void;
}) {
  const phase = PROGRAM.phases.find((item) => item.id === client.current_phase);
  const key = statusKey(client);
  const [pendingPhase, setPendingPhase] = useState(client.current_phase);
  const [pendingDate, setPendingDate] = useState(client.start_date ?? localTodayIso());

  useEffect(() => {
    setPendingPhase(client.current_phase);
    setPendingDate(client.start_date ?? localTodayIso());
  }, [client.current_phase, client.start_date]);

  const override = (body: Record<string, unknown>, okMessage: string) =>
    onAction(
      async () => {
        await apiPost(`/api/skool/clients/${client.id}/override`, body);
      },
      okMessage,
      "No pudimos aplicar el cambio, intenta de nuevo.",
    );

  function movePhase() {
    const target = PROGRAM.phases.find((item) => item.id === pendingPhase);
    if (!target || pendingPhase === client.current_phase) return;
    if (!window.confirm(`¿Mover a ${client.name || "este cliente"} a la fase ${target.id} · ${target.name}?`)) return;
    void override({ action: "set_phase", phase: pendingPhase }, `Cliente movido a la fase ${target.id}.`);
  }

  function saveStartDate() {
    if (!pendingDate || pendingDate === client.start_date) return;
    if (!window.confirm(`¿Cambiar la fecha de inicio a ${pendingDate}? Todas las fechas del programa se recalculan.`)) return;
    void override({ action: "set_start_date", startDate: pendingDate }, "Fecha de inicio actualizada.");
  }

  function complete() {
    if (!window.confirm(`¿Marcar a ${client.name || "este cliente"} como completado?`)) return;
    void override({ action: "complete" }, "Programa marcado como completado.");
  }

  return (
    <section className="admin-card detail-hero" aria-label="Datos del cliente">
      <div className="detail-hero__top">
        <div className="detail-hero__id">
          <span className="admin-avatar admin-avatar--lg" aria-hidden="true">
            {initials(client.name || client.email)}
          </span>
          <div>
            <p className="eyebrow">Detalle de cliente</p>
            <h1>{client.name || client.email}</h1>
            <p className="detail-hero__meta">
              {client.business ? `${client.business} · ` : ""}
              {client.email}
            </p>
          </div>
        </div>
        <div className="detail-hero__badges">
          <span className="phase-pill">
            {phase ? `Fase ${phase.id} · ${phase.name}` : `Fase ${client.current_phase}`}
          </span>
          {client.week !== null && client.day !== null ? (
            <span className="portal-day">
              Semana {client.week} · día {Math.min(client.day, PROGRAM.totalDays)} de {PROGRAM.totalDays}
            </span>
          ) : null}
          <span className={`status-badge status-badge--${key}`}>{STATUS_LABEL[key]}</span>
        </div>
      </div>

      <div className="detail-actions">
        <div className="detail-action">
          <span className="detail-action__label">Estado</span>
          <div className="detail-action__row">
            {client.status === "paused" ? (
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => void override({ action: "resume" }, "Programa reactivado.")}
                type="button"
              >
                Reactivar
              </button>
            ) : (
              <button
                className="secondary-button"
                disabled={busy || client.status !== "active"}
                onClick={() => void override({ action: "pause" }, "Programa en pausa.")}
                type="button"
              >
                Pausar
              </button>
            )}
            <button
              className="secondary-button"
              disabled={busy || client.status === "completed"}
              onClick={complete}
              type="button"
            >
              Marcar completado
            </button>
            <button className="secondary-button" disabled={busy} onClick={onResendInvite} type="button">
              Reenviar invitación
            </button>
          </div>
        </div>

        <div className="detail-action">
          <span className="detail-action__label">Mover de fase</span>
          <div className="detail-action__row">
            <select
              aria-label="Fase destino"
              onChange={(event) => setPendingPhase(Number(event.currentTarget.value))}
              value={pendingPhase}
            >
              {PROGRAM.phases.map((item) => (
                <option key={item.id} value={item.id}>
                  Fase {item.id} · {item.name}
                </option>
              ))}
            </select>
            <button
              className="secondary-button"
              disabled={busy || pendingPhase === client.current_phase}
              onClick={movePhase}
              type="button"
            >
              Mover
            </button>
          </div>
        </div>

        <div className="detail-action">
          <span className="detail-action__label">Fecha de inicio</span>
          <div className="detail-action__row">
            <input
              aria-label="Fecha de inicio"
              onChange={(event) => setPendingDate(event.currentTarget.value)}
              type="date"
              value={pendingDate}
            />
            <button
              className="secondary-button"
              disabled={busy || !pendingDate || pendingDate === client.start_date}
              onClick={saveStartDate}
              type="button"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== Checklist agrupado por fase =====

function PhaseChecklists({
  client,
  busyTaskId,
  onToggle,
  onDelete,
  onAdd,
}: {
  client: ClientView;
  busyTaskId: string | null;
  onToggle: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
  onAdd: () => void;
}) {
  const phasesWithTasks = PROGRAM.phases.filter((phase) =>
    client.tasks.some((task) => task.phase === phase.id),
  );

  return (
    <section className="admin-card" aria-label="Checklist por fase">
      <header className="admin-card__header">
        <div>
          <p className="eyebrow">Checklist</p>
          <h2>Tareas por fase</h2>
        </div>
        <button className="secondary-button" onClick={onAdd} type="button">
          + Tarea custom
        </button>
      </header>

      {phasesWithTasks.length === 0 ? (
        <p className="empty-state">
          Aún no hay tareas materializadas. Se crean cuando el cliente (o el equipo) define la fecha de inicio.
        </p>
      ) : (
        phasesWithTasks.map((phase) => (
          <PhaseTaskGroup
            busyTaskId={busyTaskId}
            client={client}
            key={phase.id}
            onDelete={onDelete}
            onToggle={onToggle}
            phase={phase}
          />
        ))
      )}
    </section>
  );
}

function PhaseTaskGroup({
  phase,
  client,
  busyTaskId,
  onToggle,
  onDelete,
}: {
  phase: PhaseConfig;
  client: ClientView;
  busyTaskId: string | null;
  onToggle: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
}) {
  const tasks = client.tasks
    .filter((task) => task.phase === phase.id)
    .sort(
      (a, b) =>
        a.position - b.position ||
        (a.source === b.source ? 0 : a.source === "base" ? -1 : 1) ||
        a.created_at.localeCompare(b.created_at),
    );
  const doneCount = tasks.filter((task) => task.done).length;
  const isCurrent = phase.id === client.current_phase;

  return (
    <div className="phase-group">
      <header className="phase-group__header">
        <h3>
          Fase {phase.id} · {phase.name}
          {isCurrent ? <span className="phase-group__current">actual</span> : null}
        </h3>
        <span className="checklist__count">
          {doneCount} de {tasks.length} listas
        </span>
      </header>
      <div className="checklist__items">
        {tasks.map((task) => {
          const classUrl = task.class_id
            ? phase.classes.find((skoolClass) => skoolClass.id === task.class_id)?.url
            : undefined;
          const busy = busyTaskId === task.id;
          return (
            <div className={task.done ? "check-item check-item--done" : "check-item"} key={task.id}>
              <button
                aria-checked={task.done}
                aria-label={task.done ? `Desmarcar: ${task.title}` : `Marcar como lista: ${task.title}`}
                className={busy ? "check-toggle check-toggle--busy" : "check-toggle"}
                disabled={busy}
                onClick={() => onToggle(task)}
                role="checkbox"
                type="button"
              >
                {task.done ? "✓" : ""}
              </button>
              <div className="check-item__body">
                <span className="check-item__title">{task.title}</span>
                <span className="check-item__meta">
                  {task.source === "custom" ? <span className="coach-badge">custom</span> : null}
                  {task.week !== null ? <small className="check-item__hint">semana {task.week}</small> : null}
                  {task.suggested_day !== null ? (
                    <small className="check-item__hint">día sugerido {task.suggested_day}</small>
                  ) : null}
                  {classUrl ? (
                    <a className="class-link" href={classUrl} rel="noreferrer" target="_blank">
                      ver clase ↗
                    </a>
                  ) : null}
                </span>
              </div>
              {task.source === "custom" ? (
                <button
                  aria-label={`Eliminar tarea: ${task.title}`}
                  className="ghost-button check-item__delete"
                  onClick={() => onDelete(task)}
                  type="button"
                >
                  ✕
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Modal de tarea custom =====

function CustomTaskModal({
  currentPhase,
  busy,
  onClose,
  onSubmit,
}: {
  currentPhase: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    phase: number;
    week: number | null;
    suggestedDay: number | null;
    classId: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState(
    PROGRAM.phases.some((item) => item.id === currentPhase) ? currentPhase : 1,
  );
  const [week, setWeek] = useState("");
  const [suggestedDay, setSuggestedDay] = useState("");
  const [classId, setClassId] = useState("");

  const phaseClasses = useMemo(() => phaseById(phase).classes, [phase]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !title.trim()) return;
    void onSubmit({
      title: title.trim(),
      phase,
      week: week === "" ? null : Number(week),
      suggestedDay: suggestedDay === "" ? null : Number(suggestedDay),
      classId: classId || null,
    });
  }

  return (
    <div aria-label="Agregar tarea custom" aria-modal="true" className="modal" role="dialog">
      <div className="modal__card">
        <header className="modal__header">
          <h3>Agregar tarea custom</h3>
          <button aria-label="Cerrar" className="ghost-button modal__close" onClick={onClose} type="button">
            ✕
          </button>
        </header>
        <p className="modal__copy">
          La tarea aparece en el checklist del cliente con la etiqueta «de tu coach». Si la agregas a su
          fase actual, se vuelve requisito para avanzar.
        </p>
        <form className="modal__form" onSubmit={submit}>
          <label className="field">
            <span className="field__label">Título</span>
            <input
              autoFocus
              onChange={(event) => setTitle(event.currentTarget.value)}
              placeholder="Ej: Graba el video de bienvenida"
              required
              value={title}
            />
          </label>
          <label className="field">
            <span className="field__label">Fase</span>
            <select
              onChange={(event) => {
                setPhase(Number(event.currentTarget.value));
                setClassId("");
              }}
              value={phase}
            >
              {PROGRAM.phases.map((item) => (
                <option key={item.id} value={item.id}>
                  Fase {item.id} · {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="modal__row">
            <label className="field">
              <span className="field__label">Semana (opcional)</span>
              <input
                inputMode="numeric"
                min={1}
                onChange={(event) => setWeek(event.currentTarget.value)}
                placeholder="Ej: 3"
                step={1}
                type="number"
                value={week}
              />
            </label>
            <label className="field">
              <span className="field__label">Día sugerido (opcional)</span>
              <input
                inputMode="numeric"
                min={0}
                onChange={(event) => setSuggestedDay(event.currentTarget.value)}
                placeholder="Ej: 16"
                step={1}
                type="number"
                value={suggestedDay}
              />
            </label>
          </div>
          <label className="field">
            <span className="field__label">Clase de Skool (opcional)</span>
            <select onChange={(event) => setClassId(event.currentTarget.value)} value={classId}>
              <option value="">Sin clase asociada</option>
              {phaseClasses.map((skoolClass) => (
                <option key={skoolClass.id} value={skoolClass.id}>
                  {skoolClass.title}
                </option>
              ))}
            </select>
          </label>
          <div className="modal__actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Cancelar
            </button>
            <button className="primary-button" disabled={busy || !title.trim()} type="submit">
              {busy ? "Agregando…" : "Agregar tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Formularios: ligadas + ligar existentes =====

function FormsCard({
  client,
  submissions,
  busy,
  onAction,
}: {
  client: ClientView;
  submissions: SubmissionRow[];
  busy: boolean;
  onAction: RunAction;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unlinked, setUnlinked] = useState<Submission[]>([]);
  const [unlinkedError, setUnlinkedError] = useState(false);

  const loadUnlinked = useCallback(async () => {
    setUnlinkedError(false);
    try {
      const all = await loadSubmissions(null);
      setUnlinked(all.filter((submission) => !submission.clientId));
    } catch {
      setUnlinkedError(true);
    }
  }, []);

  useEffect(() => {
    void loadUnlinked();
  }, [loadUnlinked]);

  function link(submission: Submission) {
    void onAction(
      async () => {
        // El posible avance de fase queda registrado en la bitácora y se ve
        // en el contexto refrescado; no necesita mensaje aparte.
        await apiPost(`/api/skool/clients/${client.id}/link-submission`, {
          submissionId: submission.id,
        });
        await loadUnlinked();
      },
      "Respuesta ligada al cliente.",
      "No pudimos ligar la respuesta, intenta de nuevo.",
    );
  }

  return (
    <section className="admin-card" aria-label="Formularios">
      <header className="admin-card__header">
        <div>
          <p className="eyebrow">Formularios</p>
          <h2>Respuestas del cliente</h2>
        </div>
        <span className="checklist__count">
          {submissions.length} {submissions.length === 1 ? "enviada" : "enviadas"}
        </span>
      </header>

      {submissions.length === 0 ? (
        <p className="empty-state">Este cliente todavía no tiene respuestas ligadas.</p>
      ) : (
        <div className="submission-list">
          {submissions.map((row) => {
            const expanded = expandedId === row.id;
            return (
              <div className="submission-item" key={row.id}>
                <button
                  aria-expanded={expanded}
                  className="submission-row"
                  onClick={() => setExpandedId(expanded ? null : row.id)}
                  type="button"
                >
                  <span className="submission-row__title">
                    <strong>{formTitle(row.form_slug)}</strong>
                    <small>
                      {relativeTime(row.created_at)} · {row.stage || "Sin etapa"}
                    </small>
                  </span>
                  <span className="submission-row__score">
                    <strong>{row.score}</strong>
                    <small>score</small>
                  </span>
                  <span aria-hidden="true" className="submission-row__chevron">
                    {expanded ? "▴" : "▾"}
                  </span>
                </button>
                {expanded ? (
                  <div className="submission-detail">
                    <ClientDetail submission={rowToSubmission(row)} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="link-block">
        <h3>Ligar respuesta existente</h3>
        <p className="route-status">
          Respuestas históricas enviadas sin sesión. Ligarlas puede completar la fase del cliente.
        </p>
        {unlinkedError ? (
          <p className="empty-state">No pudimos cargar las respuestas sin ligar.</p>
        ) : unlinked.length === 0 ? (
          <p className="empty-state">No hay respuestas sin ligar.</p>
        ) : (
          <div className="link-list">
            {unlinked.map((submission) => (
              <div className="link-row" key={submission.id}>
                <span className="link-row__info">
                  <strong>{String(submission.values.client || "Sin nombre")}</strong>
                  <small>
                    {formTitle(String(submission.values.formSlug || ""))} · {relativeTime(submission.createdAt)}
                  </small>
                </span>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => link(submission)}
                  type="button"
                >
                  Ligar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ===== Bitácora =====

const EVENT_ICON: Record<string, string> = {
  task_done: "✓",
  task_undone: "↺",
  task_added: "+",
  task_deleted: "✕",
  form_submitted: "▤",
  phase_advanced: "⤴",
  phase_override: "⇄",
  status_change: "◉",
  start_date_set: "▷",
  note: "✎",
};

const STATUS_ES: Record<string, string> = {
  invited: "invitado",
  active: "activo",
  paused: "pausado",
  completed: "completado",
};

function eventText(event: EventRow): string {
  const payload = event.payload ?? {};
  const title = typeof payload.title === "string" ? payload.title : "";
  switch (event.type) {
    case "task_done":
      return `Tarea completada: ${title}`;
    case "task_undone":
      return `Tarea desmarcada: ${title}`;
    case "task_added":
      return `Tarea custom agregada (fase ${payload.phase ?? "?"}): ${title}`;
    case "task_deleted":
      return `Tarea custom eliminada: ${title}`;
    case "form_submitted": {
      const slug = typeof payload.formSlug === "string" ? payload.formSlug : "";
      const name = slug ? formTitle(slug) : "formulario";
      return payload.linked ? `Respuesta ligada: ${name}` : `Formulario enviado: ${name}`;
    }
    case "phase_advanced":
      return `Avanzó de la fase ${payload.from ?? "?"} a la fase ${payload.to ?? "?"}`;
    case "phase_override":
      return `Fase ajustada por el equipo: ${payload.from ?? "?"} → ${payload.to ?? "?"}`;
    case "status_change": {
      const to = typeof payload.to === "string" ? payload.to : "";
      return `Estado: ${STATUS_ES[to] ?? to}`;
    }
    case "start_date_set":
      return `Fecha de inicio: ${payload.startDate ?? ""}`;
    case "note":
      return typeof payload.text === "string" ? payload.text : "Nota interna";
    default:
      return event.type;
  }
}

function EventsCard({ events }: { events: EventRow[] }) {
  return (
    <section className="admin-card" aria-label="Bitácora">
      <header className="admin-card__header">
        <div>
          <p className="eyebrow">Bitácora</p>
          <h2>Actividad del cliente</h2>
        </div>
      </header>
      {events.length === 0 ? (
        <p className="empty-state">Sin actividad registrada todavía.</p>
      ) : (
        <ol className="event-list">
          {events.map((event) => (
            <li className="event-row" key={event.id}>
              <span aria-hidden="true" className={`event-icon event-icon--${event.type}`}>
                {EVENT_ICON[event.type] ?? "•"}
              </span>
              <span className="event-row__body">
                <span className={event.type === "note" ? "event-row__text event-row__text--note" : "event-row__text"}>
                  {eventText(event)}
                </span>
                <small>{relativeTime(event.created_at)}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ===== Notas internas =====

function NotesCard({
  clientId,
  busy,
  onAction,
}: {
  clientId: string;
  busy: boolean;
  onAction: RunAction;
}) {
  const [text, setText] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void onAction(
      async () => {
        await apiPost(`/api/skool/clients/${clientId}/notes`, { text: trimmed });
        setText("");
      },
      "Nota guardada en la bitácora.",
      "No pudimos guardar la nota, intenta de nuevo.",
    );
  }

  return (
    <section className="admin-card" aria-label="Notas internas">
      <header className="admin-card__header">
        <div>
          <p className="eyebrow">Notas internas</p>
          <h2>Solo las ve el equipo</h2>
        </div>
      </header>
      <form className="notes-form" onSubmit={submit}>
        <textarea
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder="Ej: En la llamada quedó de subir su contenido el viernes."
          rows={3}
          value={text}
        />
        <button className="secondary-button" disabled={busy || !text.trim()} type="submit">
          Guardar nota
        </button>
      </form>
    </section>
  );
}
