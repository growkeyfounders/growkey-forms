import { useCallback, useEffect, useRef, useState } from "react";
import type { PhaseConfig } from "../../shared/program.mjs";
import { addDays } from "../../shared/program.mjs";
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

// El programa corre de lunes a viernes, así que el "día 0" ideal es un domingo
// (día 1 = lunes = primera misión). Por defecto sugerimos el próximo domingo.
function nextSundayIso() {
  const base = localTodayIso();
  const dow = new Date(`${base}T12:00:00Z`).getUTCDay();
  return addDays(base, dow === 0 ? 0 : 7 - dow);
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

  const [startDate, setStartDate] = useState(nextSundayIso);
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
  return (
    <main className="portal portal--welcome">
      <section className="welcome-card">
        <p className="eyebrow">Agentic Sales · {program.goal}</p>
        <h1>Hola, {firstName(client.name)}.</h1>
        <p className="welcome-copy">
          Vas a construir un sistema de ventas predecible con tu conocimiento, que te trae clientes de
          forma constante. Lo armas en 4 pasos: oferta, primeras ventas, validación y escala. Elige tu
          fecha y empezamos hoy.
        </p>
        <ProgramCalendar phases={program.phases} startDate={startDate} todayIso={localTodayIso()} />
        <form className="welcome-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field__label">¿Qué día arrancas?</span>
            <span className="field__hint">
              Tu calendario corre de lunes a viernes. Por defecto es el próximo domingo (tu día 0);
              el lunes arranca tu primera misión. Cámbiala si ya empezaste con el equipo.
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

  return (
    <main className="portal">
      {paused ? (
        <div className="pause-banner" role="status">
          <strong>Tu programa está en pausa</strong>
          <span>— habla con tu equipo en el chat.</span>
        </div>
      ) : null}

      <PortalHeader data={data} />

      <section className="portal-card" aria-label="Tu camino">
        <header className="portal-card__header">
          <h3>Tu camino de {program.totalDays} días</h3>
          <small>{phase.headline}</small>
        </header>
        <PhaseTimeline currentPhase={client.current_phase} day={client.day} startDate={client.start_date} />
      </section>

      <div className="portal-grid">
        <div className="portal-col">
          {client.start_date && client.day !== null ? (
            <WeekView day={client.day} startDate={client.start_date} tasks={client.tasks} />
          ) : null}
          <PhaseClasses phase={phase} />
        </div>
        <div className="portal-col">
          <Checklist
            busyTaskId={busyTaskId}
            canToggle={!paused}
            onToggle={onToggle}
            phase={phase}
            submittedFormSlugs={client.submittedFormSlugs}
            tasks={client.tasks}
          />
        </div>
      </div>

      <TeamChatCard clientId={client.id} />
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
