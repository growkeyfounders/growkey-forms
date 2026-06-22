import { useCallback, useEffect, useRef, useState } from "react";
import type { PhaseConfig } from "../../shared/program.mjs";
import { addDays, currentWeek } from "../../shared/program.mjs";
import logoUrl from "../assets/growkey-mascot.png";
import { ApiError, apiGet, apiPost } from "../api";
import { ChatThread, threadMemberToChatMember } from "../components/ChatThread";
import { Checklist } from "../components/Checklist";
import { PhaseTimeline } from "../components/PhaseTimeline";
import { ProgramCalendar } from "../components/ProgramCalendar";
import { WeekView } from "../components/WeekView";
import type { ClientRow, MessageRow, PortalData, TaskRow, ThreadMemberRow, ToggleResponse } from "../skoolTypes";
import { supabase } from "../supabaseClient";

// Fecha local del navegador (no UTC): cerca de medianoche en Colombia el
// default del date picker debe seguir siendo "hoy" para el cliente.
function localTodayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

type Celebration = { kind: "phase"; phase: PhaseConfig } | { kind: "completed" };

export function ClientPortal() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  // ?celebrate=1 — un avance disparado por formulario embebido (FormPage
  // redirige a /app?celebrate=1) también celebra al aterrizar (spec §6).
  const [pendingCelebrate, setPendingCelebrate] = useState(
    () => new URLSearchParams(window.location.search).get("celebrate") === "1",
  );
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const celebrationButtonRef = useRef<HTMLButtonElement | null>(null);

  const [startDate, setStartDate] = useState(localTodayIso);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setData(await apiGet<PortalData>("/api/skool/portal"));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Limpiar el query param de celebración para que un refresh no re-celebre.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("celebrate")) return;
    url.searchParams.delete("celebrate");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  // La celebración por ?celebrate=1 necesita el portal cargado para saber
  // a qué fase llegó el cliente (o si cerró el programa).
  useEffect(() => {
    if (!pendingCelebrate || !data) return;
    setPendingCelebrate(false);
    const { client, program } = data;
    if (!client.start_date) return;
    if (client.status === "completed") {
      setCelebration({ kind: "completed" });
      return;
    }
    const phase = program.phases.find((item) => item.id === client.current_phase);
    if (phase) setCelebration({ kind: "phase", phase });
  }, [pendingCelebrate, data]);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

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

  // Toggle optimista con rollback (spec §11): marcamos local, llamamos al
  // server y, si falla, revertimos y avisamos con un toast.
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
        setCelebration({ kind: "completed" });
      } else if (result.advanced) {
        const phase = data.program.phases.find((item) => item.id === result.client.current_phase);
        if (phase) setCelebration({ kind: "phase", phase });
      }
    } catch {
      patchTask(task.id, () => task);
      showToast("No pudimos guardar, intenta de nuevo.");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function startProgram(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (starting) return;
    setStarting(true);
    try {
      await apiPost("/api/skool/start-date", { startDate });
      await load();
    } catch (error) {
      // 409 already_started: la fecha ya quedó fijada en otra pestaña o por un
      // admin. Recargar el portal muestra el camino en vez de un error falso.
      if (error instanceof ApiError && error.status === 409) {
        await load();
        return;
      }
      showToast("No pudimos guardar la fecha, intenta de nuevo.");
    } finally {
      setStarting(false);
    }
  }

  function closeCelebration() {
    setCelebration(null);
    void load();
  }

  // Escape cierra el overlay igual que el botón. Focus trap básico: el botón
  // es el único elemento enfocable del overlay (autoFocus al montar), así que
  // Tab/Shift+Tab solo devuelven el foco a él en vez de salir del diálogo.
  function onCelebrationKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCelebration();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      celebrationButtonRef.current?.focus();
    }
  }

  if (loading) {
    return (
      <main className="portal">
        <div className="portal-status" role="status">
          <span className="spinner" aria-hidden="true" />
          <p className="route-status">Cargando tu panel…</p>
        </div>
      </main>
    );
  }

  if (loadError || !data) {
    return (
      <main className="portal">
        <div className="portal-status">
          <p className="route-status">No pudimos cargar tu panel. Revisa tu conexión e intenta de nuevo.</p>
          <button className="secondary-button" onClick={() => void load()} type="button">
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  const { program, client } = data;

  return (
    <>
      {!client.start_date ? (
        <Welcome
          client={client}
          program={program}
          startDate={startDate}
          starting={starting}
          onChangeStartDate={setStartDate}
          onSubmit={startProgram}
        />
      ) : client.status === "completed" ? (
        <Completed data={data} />
      ) : (
        <Active data={data} busyTaskId={busyTaskId} onToggle={toggleTask} />
      )}

      {celebration ? (
        <div
          aria-label="Celebración de avance"
          aria-modal="true"
          className="celebration"
          onKeyDown={onCelebrationKeyDown}
          role="dialog"
        >
          <div className="celebration__card">
            <img src={logoUrl} alt="" />
            {celebration.kind === "completed" ? (
              <>
                <p className="eyebrow">Lo lograste</p>
                <h2>¡Completaste el programa!</h2>
                <p>
                  Cerraste el camino de {program.totalDays} días. Tu equipo Growkey está celebrando
                  contigo este logro.
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">Fase completada</p>
                <h2>
                  ¡Pasaste a la fase {celebration.phase.id}: {celebration.phase.name}!
                </h2>
                <p>{celebration.phase.headline}.</p>
              </>
            )}
            <button
              autoFocus
              className="primary-button"
              onClick={closeCelebration}
              ref={celebrationButtonRef}
              type="button"
            >
              {celebration.kind === "completed" ? "Ver mi camino" : "Ver mi nueva fase"}
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="toast-error" role="alert">
          {toast}
        </div>
      ) : null}
    </>
  );
}

function Welcome({
  client,
  program,
  startDate,
  starting,
  onChangeStartDate,
  onSubmit,
}: {
  client: ClientRow;
  program: PortalData["program"];
  startDate: string;
  starting: boolean;
  onChangeStartDate: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  useEffect(() => {
    // El hero premium del onboarding necesita la topbar como pill flotante glass:
    // activamos el modificador solo mientras el Welcome está montado.
    const shell = document.querySelector(".app-shell--client");
    shell?.classList.add("app-shell--onboarding");
    return () => shell?.classList.remove("app-shell--onboarding");
  }, []);

  return (
    <main className="portal portal--welcome">
      <span className="as-logo" aria-label="Agentic Sales">
        <span className="as-logo__a">Agentic</span>
        <span className="as-logo__s">
          SALES
          <svg className="as-logo__spark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 1.5 L14 10 L22.5 12 L14 14 L12 22.5 L10 14 L1.5 12 L10 10 Z" />
          </svg>
        </span>
      </span>
      <div className="welcome-hero__content">
        <span className="welcome-badge">
          <svg className="welcome-badge__spark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 1.5 L14 10 L22.5 12 L14 14 L12 22.5 L10 14 L1.5 12 L10 10 Z" />
          </svg>
          Tu programa de 16 semanas
        </span>
        <h1 className="welcome-headline">Bienvenido, {firstName(client.name)}</h1>
        <p className="welcome-sub">
          Elige <b>ya</b> el día que inicias, porque en <b>16 semanas</b> vas a construir un sistema
          de ventas predecible y escalable con tu conocimiento, que te trae clientes de forma
          constante.
        </p>
        <p className="welcome-kicker">
          La bola está en tu campo. Trabaja con obsesión todos los días hasta obtener resultados —
          estás a pocas semanas de cambiar tu vida para siempre.
        </p>
        <form id="reservar" className="welcome-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field__label">¿Qué día arrancas?</span>
            <span className="field__hint">
              Tu día 1 es hoy y se actualiza solo. Las misiones corren de lunes a viernes.
            </span>
            <input
              min={addDays(localTodayIso(), -30)}
              onChange={(event) => onChangeStartDate(event.currentTarget.value)}
              required
              type="date"
              value={startDate}
            />
          </label>
          <button className="primary-button" disabled={starting || !startDate} type="submit">
            {starting ? "Guardando…" : "Empezar mi camino"}
          </button>
        </form>
      </div>

      <section className="welcome-roadmap">
        <ProgramCalendar phases={program.phases} startDate={startDate} todayIso={localTodayIso()} />
      </section>
    </main>
  );
}

function PortalHeader({ data }: { data: PortalData }) {
  const { program, client } = data;
  const phase = program.phases.find((item) => item.id === client.current_phase);
  const completed = client.status === "completed";
  const dayLabel =
    client.day === null ? null : Math.min(Math.max(client.day, 1), program.totalDays);

  return (
    <header className="portal-header">
      <div>
        <p className="eyebrow">Agentic Sales · {program.goal}</p>
        <h1>Hola, {firstName(client.name)}</h1>
        {client.business ? <p className="portal-business">{client.business}</p> : null}
      </div>
      <div className="portal-header__meta">
        <span className="phase-pill">
          {completed ? "Programa completado" : phase ? `Fase ${phase.id} · ${phase.name}` : null}
        </span>
        {!completed && client.week !== null && dayLabel !== null ? (
          <span className="portal-day">
            Semana {client.week} · día {dayLabel} de {program.totalDays}
          </span>
        ) : null}
      </div>
    </header>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "·";
}

const WEEK_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie"];

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 2 4 4h-4V4zM8 12h8v1.6H8V12zm0 3.4h8V17H8v-1.6zm0-6.8h3v1.6H8V8.6z" />
    </svg>
  );
}
function IconCheck({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l4.5 4.5L19 7" />
    </svg>
  );
}
function IconCircleCheck() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6z" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M18 2H6v2H3v3a4 4 0 0 0 4 4h.3A5 5 0 0 0 11 13.9V16H8v2h8v-2h-3v-2.1A5 5 0 0 0 16.7 11H17a4 4 0 0 0 4-4V4h-3V2zM5 7V6h1v3a2 2 0 0 1-1-2zm14 0a2 2 0 0 1-1 2V6h1v1z" />
    </svg>
  );
}

// Pantalla "Hoy" gamificada (modo oscuro + verde neón): racha, tira de la
// semana, la misión del día (clase + entregable + marcar hecho), avance de la
// fase y el próximo hito. El foco diario que motiva a avanzar.
function DailyHome({
  data,
  busyTaskId,
  onToggle,
}: {
  data: PortalData;
  busyTaskId: string | null;
  onToggle: (task: TaskRow) => void;
}) {
  const { program, client } = data;
  const prog = client.day ?? 0;
  const phase = program.phases.find((p) => p.id === client.current_phase) ?? program.phases[0];
  const allBase = new Map(program.phases.flatMap((p) => p.baseTasks).map((b) => [b.id, b]));

  const missionOf = (t: TaskRow) =>
    (t.template_id ? allBase.get(t.template_id)?.mission : undefined) ??
    t.title.split(" → ")[0].split(" + ")[0];
  const deliverableOf = (t: TaskRow) => {
    const p = t.title.split(" → ");
    return p.length > 1 ? p[p.length - 1].trim() : null;
  };
  const classOf = (t: TaskRow) => phase.classes.find((c) => c.id === t.class_id);

  const byDay = client.tasks
    .filter((t) => t.suggested_day != null)
    .sort((a, b) => (a.suggested_day ?? 0) - (b.suggested_day ?? 0));
  const todayTask = byDay.find((t) => t.suggested_day === prog);
  const focusTask =
    todayTask ?? byDay.find((t) => (t.suggested_day ?? 0) > prog) ?? byDay[byDay.length - 1];

  let streak = 0;
  const upto = byDay.filter((t) => (t.suggested_day ?? 0) <= prog);
  for (let i = upto.length - 1; i >= 0; i--) {
    if (upto[i].done) streak++;
    else break;
  }

  const wk = currentWeek(prog);
  const weekTasks = byDay.filter((t) => t.week === wk).slice(0, 5);

  const phaseTasks = client.tasks.filter((t) => t.phase === phase.id);
  const phaseDone = phaseTasks.filter((t) => t.done).length;
  const phasePct = phaseTasks.length ? Math.round((phaseDone / phaseTasks.length) * 100) : 0;

  const totalDone = client.tasks.filter((t) => t.done).length;
  const totalTasks = client.tasks.length || program.totalDays;
  const progPct = Math.round((totalDone / totalTasks) * 100);

  const heroes = program.phases.flatMap((p) =>
    (p.milestones ?? []).filter((m) => m.type === "hero"),
  );
  const nextHero = heroes.filter((h) => h.day > prog).sort((a, b) => a.day - b.day)[0];
  const heroInMissions = nextHero
    ? byDay.filter((t) => (t.suggested_day ?? 0) > prog && (t.suggested_day ?? 0) <= nextHero.day).length
    : 0;

  const cls = focusTask ? classOf(focusTask) : undefined;
  const deliverable = focusTask ? deliverableOf(focusTask) : null;
  const focusDone = !!focusTask?.done;

  return (
    <div className="daily">
      <div className="daily__head">
        <div className="daily__avatar">{initialsOf(client.name)}</div>
        <div className="daily__hi">
          <strong>Hola, {firstName(client.name)}</strong>
          <span>Misión {Math.min(totalDone + 1, totalTasks)} de {totalTasks}</span>
        </div>
        <div className="daily__streak">
          <span aria-hidden="true">🔥</span>
          {streak}
        </div>
      </div>

      <div className="daily__stats">
        <div className="daily-stat">
          <b>
            {phase.id}
            <i>/{program.phases.length}</i>
          </b>
          <span>Fase</span>
        </div>
        <div className="daily-stat">
          <b>
            {progPct}
            <i>%</i>
          </b>
          <span>Avance</span>
        </div>
        <div className="daily-stat">
          <b>
            {streak}
            <i> 🔥</i>
          </b>
          <span>Racha</span>
        </div>
      </div>

      <div className="daily__week">
        {weekTasks.map((t, i) => {
          const today = t.suggested_day === prog;
          const state = t.done ? "done" : today ? "today" : (t.suggested_day ?? 0) < prog ? "miss" : "soon";
          return (
            <div className={`daily-day daily-day--${state}`} key={t.id}>
              <span className="daily-day__dot">{t.done ? <IconCheck /> : null}</span>
              <span className="daily-day__lbl">{WEEK_LABELS[i] ?? ""}</span>
            </div>
          );
        })}
      </div>

      <div className="daily__grid">
        <div className="daily__main">
          {focusTask ? (
            <div className="daily-mission">
              <span className="daily-mission__eyebrow">{todayTask ? "Tu misión de hoy" : "Tu próxima misión"}</span>
              <strong className="daily-mission__title">{missionOf(focusTask)}</strong>

              {cls ? (
                <div className="daily-row">
                  <span className="daily-row__ic">
                    <IconPlay />
                  </span>
                  <span className="daily-row__txt">
                    <b>Ver la clase</b>
                    <small>{cls.title}</small>
                  </span>
                </div>
              ) : null}
              {deliverable ? (
                <div className="daily-row">
                  <span className="daily-row__ic">
                    <IconFile />
                  </span>
                  <span className="daily-row__txt">
                    <b>Entregable</b>
                    <small>{deliverable}</small>
                  </span>
                </div>
              ) : null}

              <button
                className={`daily-cta${focusDone ? " is-done" : ""}`}
                disabled={busyTaskId === focusTask.id}
                onClick={() => onToggle(focusTask)}
                type="button"
              >
                <IconCircleCheck />
                {focusDone ? "¡Completada! Toca para deshacer" : "Marcar como completada"}
              </button>
            </div>
          ) : null}
        </div>

        <aside className="daily__side">
          <div className="daily-phase">
            <div className="daily-phase__top">
              <span>
                Fase {phase.id} · {phase.name}
              </span>
              <small>
                {phaseDone} / {phaseTasks.length} misiones
              </small>
            </div>
            <div className="daily-phase__bar">
              <i style={{ width: `${phasePct}%` }} />
            </div>
            {nextHero ? (
              <div className="daily-phase__hero">
                <IconTrophy />
                Próximo logro: <b>{nextHero.title}</b>
                {heroInMissions > 0 ? ` · en ${heroInMissions} ${heroInMissions === 1 ? "misión" : "misiones"}` : ""}
              </div>
            ) : null}
          </div>

          <div className="daily-streak-card">
            <span className="daily-streak-card__flame">🔥</span>
            <div>
              <strong>{streak > 0 ? `¡Vas ${streak} ${streak === 1 ? "día" : "días"} seguidos!` : "¡Arranca tu racha hoy!"}</strong>
              <span>{focusDone ? "Racha asegurada por hoy. Vuelve mañana." : "Completa tu misión para no romper la racha."}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Active({
  data,
  busyTaskId,
  onToggle,
}: {
  data: PortalData;
  busyTaskId: string | null;
  onToggle: (task: TaskRow) => void;
}) {
  const { program, client } = data;
  const phase = program.phases.find((item) => item.id === client.current_phase) ?? program.phases[0];
  const paused = client.status === "paused";

  void phase;
  return (
    <main className="portal portal--daily">
      {paused ? (
        <div className="pause-banner" role="status">
          <strong>Tu programa está en pausa</strong>
          <span>— habla con tu equipo en el chat.</span>
        </div>
      ) : null}

      <DailyHome data={data} busyTaskId={busyTaskId} onToggle={onToggle} />
    </main>
  );
}

// ===== Chat con tu equipo (spec §7.7): badge de no leídos + hilo grupal =====

function TeamChatCard({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [members, setMembers] = useState<ThreadMemberRow[]>([]);

  useEffect(() => {
    let active = true;
    apiGet<{ members: ThreadMemberRow[] }>(`/api/skool/thread/${clientId}/members`)
      .then((data) => {
        if (active) setMembers(data.members);
      })
      .catch(() => {
        // Sin miembros cargados el chat sigue funcionando ("Equipo Growkey").
      });
    return () => {
      active = false;
    };
  }, [clientId]);

  // Badge de no leídos: mensajes ajenos posteriores a mi last_read_at,
  // query directa con supabase-js (RLS solo deja ver el propio hilo).
  const fetchUnread = useCallback(async () => {
    const { data: read } = await supabase
      .from("skool_message_reads")
      .select("last_read_at")
      .eq("user_id", clientId)
      .eq("client_id", clientId)
      .maybeSingle();
    let query = supabase
      .from("skool_messages")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .neq("sender_id", clientId);
    if (read?.last_read_at) query = query.gt("created_at", read.last_read_at);
    const { count } = await query;
    return count ?? 0;
  }, [clientId]);

  useEffect(() => {
    if (open) return;
    let active = true;
    fetchUnread()
      .then((count) => {
        if (active) setUnread(count);
      })
      .catch(() => {
        // Sin supabase configurado el badge simplemente no se muestra.
      });
    return () => {
      active = false;
    };
  }, [fetchUnread, open]);

  // Con el chat cerrado, los mensajes nuevos del equipo deben subir el badge
  // sin recargar: suscripción realtime a INSERTs del hilo (los propios no
  // cuentan). Si el canal falla, fallback a recalcular cada 30s.
  useEffect(() => {
    if (open) return;
    let active = true;
    let pollId: number | null = null;
    const stopPolling = () => {
      if (pollId !== null) {
        window.clearInterval(pollId);
        pollId = null;
      }
    };
    const startPolling = () => {
      if (pollId !== null) return;
      pollId = window.setInterval(() => {
        fetchUnread()
          .then((count) => {
            if (active) setUnread(count);
          })
          .catch(() => {
            // Reintenta en el próximo tick del interval.
          });
      }, 30_000);
    };
    const channel = supabase
      .channel(`skool-unread-${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "skool_messages", filter: `client_id=eq.${clientId}` },
        (payload) => {
          const incoming = payload.new as MessageRow;
          if (incoming.sender_id !== clientId) setUnread((current) => current + 1);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") stopPolling();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") startPolling();
      });
    return () => {
      active = false;
      stopPolling();
      void supabase.removeChannel(channel);
    };
  }, [clientId, fetchUnread, open]);

  return (
    <section className="portal-card portal-chat" aria-label="Chat con tu equipo">
      <header className="portal-card__header">
        <h3>
          Chat con tu equipo
          {!open && unread > 0 ? (
            <span aria-label={`${unread} mensajes sin leer`} className="chat-badge">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </h3>
        <button className="secondary-button" onClick={() => setOpen((current) => !current)} type="button">
          {open ? "Ocultar chat" : unread > 0 ? "Ver mensajes" : "Abrir chat"}
        </button>
      </header>
      {open ? (
        <ChatThread
          clientId={clientId}
          meId={clientId}
          members={members.map(threadMemberToChatMember)}
          onRead={() => setUnread(0)}
          title="Tu equipo Growkey"
        />
      ) : (
        <p className="route-status">
          Tu equipo Growkey está a un mensaje de distancia: dudas, bloqueos o avances, todo va aquí.
        </p>
      )}
    </section>
  );
}

function Completed({ data }: { data: PortalData }) {
  const { program, client } = data;
  const phase = program.phases.find((item) => item.id === client.current_phase) ?? program.phases[program.phases.length - 1];

  return (
    <main className="portal">
      <PortalHeader data={data} />

      <section className="portal-complete">
        <p className="eyebrow">Camino completado</p>
        <h2>Lo lograste: cerraste el programa.</h2>
        <p>
          Recorriste las {program.phases.length} fases del camino de {program.totalDays} días.
          Tu checklist queda aquí como registro — y tu equipo Growkey sigue a un mensaje de
          distancia para lo que viene.
        </p>
      </section>

      <section className="portal-card" aria-label="Tu camino">
        <header className="portal-card__header">
          <h3>Tu camino de {program.totalDays} días</h3>
          <small>{program.goal}</small>
        </header>
        <PhaseTimeline
          currentPhase={program.phases.length + 1}
          day={client.day !== null ? Math.min(client.day, program.totalDays) : null}
          startDate={client.start_date}
        />
      </section>

      <div className="portal-grid">
        <div className="portal-col">
          <Checklist
            canToggle={false}
            onToggle={() => undefined}
            phase={phase}
            submittedFormSlugs={client.submittedFormSlugs}
            tasks={client.tasks}
          />
        </div>
        <div className="portal-col">
          <PhaseClasses phase={phase} title="Clases de tu última fase" />
        </div>
      </div>

      <TeamChatCard clientId={client.id} />
    </main>
  );
}

function PhaseClasses({ phase, title = "Clases de esta fase" }: { phase: PhaseConfig; title?: string }) {
  return (
    <section className="portal-card" aria-label={title}>
      <header className="portal-card__header">
        <h3>{title}</h3>
        <small>
          Fase {phase.id} · {phase.name}
        </small>
      </header>
      {phase.classes.length ? (
        <ul className="class-list">
          {phase.classes.map((skoolClass) => (
            <li className="class-row" key={skoolClass.id}>
              <span>{skoolClass.title}</span>
              <a className="class-link" href={skoolClass.url} rel="noreferrer" target="_blank">
                Ver clase ↗
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">Esta fase no tiene clases asociadas.</p>
      )}
    </section>
  );
}
