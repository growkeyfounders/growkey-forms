import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PROGRAM } from "../../shared/program.mjs";
import { ApiError, apiGet, apiPost } from "../api";
import { ChatThread, ThreadMembersManager, threadMemberToChatMember } from "../components/ChatThread";
import { PhaseTimeline } from "../components/PhaseTimeline";
import { OFFER_SLUG, ONBOARDING_SLUG } from "../formSchema";
import { useSession } from "../session";
import type { AdminClientView, ClientsData, InboxData, InboxThread, ThreadMemberRow } from "../skoolTypes";
import { SubmissionsPage } from "./SubmissionsPage";

export type AdminTab = "clients" | "roadmap" | "conversations" | "forms";

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: "clients", label: "Clientes" },
  { id: "roadmap", label: "Roadmap" },
  { id: "conversations", label: "Conversaciones" },
  { id: "forms", label: "Formularios" },
];

// Estado operativo derivado para filtros y badges del panel.
export type ClientStatusKey = "ontrack" | "late" | "paused" | "invited" | "completed";

export const STATUS_LABEL: Record<ClientStatusKey, string> = {
  ontrack: "al día",
  late: "atrasado",
  paused: "pausado",
  invited: "invitado",
  completed: "completado",
};

export function statusKey(client: Pick<AdminClientView, "status" | "late">): ClientStatusKey {
  if (client.status === "invited") return "invited";
  if (client.status === "paused") return "paused";
  if (client.status === "completed") return "completed";
  return client.late ? "late" : "ontrack";
}

// 401/403 = sesión expirada (mensaje con link al login); el resto, error de red.
type LoadError = "auth" | "network" | null;

function toLoadError(error: unknown): LoadError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
    ? "auth"
    : "network";
}

function SessionExpiredStatus() {
  return (
    <div className="portal-status">
      <p className="route-status">Tu sesión expiró, vuelve a entrar.</p>
      <a className="secondary-button" href="/login">
        Ir al login
      </a>
    </div>
  );
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "GK"
  );
}

// Fecha relativa corta en español ("hace 5 min", "hace 2 h", "hace 3 días").
export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? "hace 1 día" : `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminPanel({
  initialTab,
  initialFormsFilter,
}: {
  initialTab: AdminTab;
  initialFormsFilter: string | null;
}) {
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [formsFilter, setFormsFilter] = useState<string | null>(initialFormsFilter);

  const [clients, setClients] = useState<AdminClientView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiGet<ClientsData>("/api/skool/clients");
      setClients(data.clients);
    } catch (error) {
      setLoadError(toLoadError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="admin-panel">
      <nav className="admin-tabs" aria-label="Secciones del panel">
        {TABS.map((item) => (
          <button
            className={tab === item.id ? "nav-button nav-button--active" : "nav-button"}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "clients" ? (
        <ClientsTab clients={clients} loadError={loadError} loading={loading} onRefresh={load} />
      ) : null}
      {tab === "roadmap" ? (
        <RoadmapTab clients={clients} loadError={loadError} loading={loading} onRetry={load} />
      ) : null}
      {tab === "conversations" ? <ConversationsTab /> : null}
      {tab === "forms" ? (
        <section className="admin-forms">
          <nav className="admin-subnav" aria-label="Filtro de formularios">
            <button
              className={formsFilter === ONBOARDING_SLUG ? "nav-button nav-button--active" : "nav-button"}
              onClick={() => setFormsFilter(ONBOARDING_SLUG)}
              type="button"
            >
              Onboarding
            </button>
            <button
              className={formsFilter === OFFER_SLUG ? "nav-button nav-button--active" : "nav-button"}
              onClick={() => setFormsFilter(OFFER_SLUG)}
              type="button"
            >
              Oferta
            </button>
            <button
              className={formsFilter === null ? "nav-button nav-button--active" : "nav-button"}
              onClick={() => setFormsFilter(null)}
              type="button"
            >
              Todos
            </button>
          </nav>
          <SubmissionsPage filterSlug={formsFilter} />
        </section>
      ) : null}
    </main>
  );
}

// ===== Pestaña Clientes =====

function ClientsTab({
  clients,
  loading,
  loadError,
  onRefresh,
}: {
  clients: AdminClientView[];
  loading: boolean;
  loadError: LoadError;
  onRefresh: () => Promise<void>;
}) {
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClientStatusKey | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const sentTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (sentTimer.current !== null) window.clearTimeout(sentTimer.current);
    },
    [],
  );

  const metrics = useMemo(() => {
    const active = clients.filter((client) => client.status === "active");
    const byPhase = PROGRAM.phases.map(
      (phase) => active.filter((client) => client.current_phase === phase.id).length,
    );
    return {
      active: active.length,
      late: active.filter((client) => client.late).length,
      byPhase,
    };
  }, [clients]);

  const pendingClients = clients.filter((client) => client.pending);
  const visible = clients.filter((client) => {
    if (client.pending) return false; // las solicitudes van en su propia sección
    if (phaseFilter !== null && client.current_phase !== phaseFilter) return false;
    if (statusFilter !== null && statusKey(client) !== statusFilter) return false;
    return true;
  });

  async function approve(client: AdminClientView) {
    if (actionBusyId) return;
    setActionBusyId(client.id);
    try {
      await apiPost(`/api/skool/clients/${client.id}/approve`);
    } catch {
      /* el refresh mostrará el estado real */
    }
    setActionBusyId(null);
    void onRefresh();
  }

  async function reject(client: AdminClientView) {
    if (actionBusyId) return;
    if (!window.confirm(`¿Rechazar y borrar la solicitud de ${client.name || client.email}?`)) return;
    setActionBusyId(client.id);
    try {
      await apiPost(`/api/skool/clients/${client.id}/reject`);
    } catch {
      /* idem */
    }
    setActionBusyId(null);
    void onRefresh();
  }

  function onInvited() {
    setInviteOpen(false);
    setInviteSent(true);
    if (sentTimer.current !== null) window.clearTimeout(sentTimer.current);
    sentTimer.current = window.setTimeout(() => setInviteSent(false), 4800);
    void onRefresh();
  }

  if (loading) {
    return (
      <div className="portal-status" role="status">
        <span className="spinner" aria-hidden="true" />
        <p className="route-status">Cargando clientes…</p>
      </div>
    );
  }

  if (loadError === "auth") {
    return <SessionExpiredStatus />;
  }

  if (loadError) {
    return (
      <div className="portal-status">
        <p className="route-status">No pudimos cargar los clientes. Revisa tu conexión e intenta de nuevo.</p>
        <button className="secondary-button" onClick={() => void onRefresh()} type="button">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      {pendingClients.length > 0 ? (
        <section className="admin-card admin-requests">
          <header className="admin-card__header">
            <div>
              <p className="eyebrow">Solicitudes</p>
              <h2>
                {pendingClients.length === 1
                  ? "1 solicitud de acceso"
                  : `${pendingClients.length} solicitudes de acceso`}
              </h2>
            </div>
          </header>
          <ul className="request-list">
            {pendingClients.map((client) => (
              <li className="request-row" key={client.id}>
                <div className="request-who">
                  <strong>{client.name || client.email}</strong>
                  <small>
                    {client.email}
                    {client.business ? ` · ${client.business}` : ""}
                  </small>
                </div>
                <div className="request-actions">
                  <button
                    className="primary-button"
                    disabled={actionBusyId === client.id}
                    onClick={() => void approve(client)}
                    type="button"
                  >
                    {actionBusyId === client.id ? "…" : "Aprobar"}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={actionBusyId === client.id}
                    onClick={() => void reject(client)}
                    type="button"
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="admin-metrics">
        <div className="metric">
          <span>Clientes activos</span>
          <strong>{metrics.active}</strong>
        </div>
        {PROGRAM.phases.map((phase, index) => (
          <div className="metric" key={phase.id}>
            <span>Fase {phase.id} · {phase.name}</span>
            <strong>{metrics.byPhase[index]}</strong>
          </div>
        ))}
        <div className={metrics.late > 0 ? "metric metric--alert" : "metric"}>
          <span>Atrasados</span>
          <strong>{metrics.late}</strong>
        </div>
      </div>

      <section className="admin-card">
        <header className="admin-card__header">
          <div>
            <p className="eyebrow">Panel interno</p>
            <h2>{clients.length === 1 ? "1 cliente" : `${clients.length} clientes`}</h2>
          </div>
          <div className="admin-toolbar">
            <label className="admin-filter">
              <span>Fase</span>
              <select
                onChange={(event) =>
                  setPhaseFilter(event.currentTarget.value === "" ? null : Number(event.currentTarget.value))
                }
                value={phaseFilter ?? ""}
              >
                <option value="">Todas</option>
                {PROGRAM.phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    Fase {phase.id} · {phase.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-filter">
              <span>Estado</span>
              <select
                onChange={(event) =>
                  setStatusFilter(
                    event.currentTarget.value === "" ? null : (event.currentTarget.value as ClientStatusKey),
                  )
                }
                value={statusFilter ?? ""}
              >
                <option value="">Todos</option>
                {(Object.keys(STATUS_LABEL) as ClientStatusKey[]).map((key) => (
                  <option key={key} value={key}>
                    {STATUS_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button admin-invite-button" onClick={() => setInviteOpen(true)} type="button">
              Invitar cliente
            </button>
          </div>
        </header>

        {inviteSent ? (
          <p className="success-pill admin-invite-sent" role="status">
            Invitación enviada
          </p>
        ) : null}

        {visible.length === 0 ? (
          <p className="empty-state">
            {clients.length === 0
              ? "Todavía no hay clientes. Invita al primero con el botón de arriba."
              : "Ningún cliente coincide con los filtros."}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Fase</th>
                  <th scope="col">Semana</th>
                  <th scope="col">Progreso</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((client) => {
                  const phase = PROGRAM.phases.find((item) => item.id === client.current_phase);
                  const key = statusKey(client);
                  return (
                    <tr
                      className="admin-table__row"
                      key={client.id}
                      onClick={() => window.location.assign(`/admin/clients/${client.id}`)}
                    >
                      <td>
                        <span className="admin-client">
                          <span className="admin-avatar" aria-hidden="true">
                            {initials(client.name || client.email)}
                          </span>
                          <span className="admin-client__name">
                            <a
                              href={`/admin/clients/${client.id}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {client.name || client.email}
                            </a>
                            <small>{client.business || client.email}</small>
                          </span>
                        </span>
                      </td>
                      <td>{phase ? `Fase ${phase.id} · ${phase.name}` : `Fase ${client.current_phase}`}</td>
                      <td>{client.week === null ? "—" : `Semana ${client.week}`}</td>
                      <td>
                        <span className="admin-progress" aria-label={`Progreso ${client.progressPct}%`}>
                          <span className="admin-progress__bar">
                            <span style={{ width: `${client.progressPct}%` }} />
                          </span>
                          <small>{client.progressPct}%</small>
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${key}`}>{STATUS_LABEL[key]}</span>
                      </td>
                      <td className="admin-table__muted">{relativeTime(client.lastActivityAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {inviteOpen ? <InviteModal onClose={() => setInviteOpen(false)} onInvited={onInvited} /> : null}
    </>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tras crear la cuenta, mostramos el enlace de acceso para compartir (null = aún en el formulario).
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await apiPost<{ activationLink?: string | null }>("/api/skool/clients", {
        email: email.trim(),
        name: name.trim(),
        business: business.trim(),
      });
      setLink(result.activationLink ?? "");
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      setError(
        code === "invalid_email"
          ? "Revisa el email: no parece válido."
          : code === "invite_failed"
            ? "No pudimos crear la cuenta. ¿Ya existe una con ese email?"
            : "No pudimos crear la cuenta, intenta de nuevo.",
      );
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el input es seleccionable como fallback */
    }
  }

  if (link !== null) {
    return (
      <div aria-label="Cliente creado" aria-modal="true" className="modal" role="dialog">
        <div className="modal__card">
          <header className="modal__header">
            <h3>Cliente creado ✓</h3>
            <button aria-label="Cerrar" className="ghost-button modal__close" onClick={onInvited} type="button">
              ✕
            </button>
          </header>
          {link ? (
            <>
              <p className="modal__copy">
                Envíale este enlace al cliente (WhatsApp, etc.). Al abrirlo crea su contraseña y entra a su
                camino. El enlace es de un solo uso.
              </p>
              <div className="modal__form">
                <input
                  className="field"
                  onFocus={(event) => event.currentTarget.select()}
                  readOnly
                  value={link}
                />
                <div className="modal__actions">
                  <button className="secondary-button" onClick={copyLink} type="button">
                    {copied ? "¡Copiado!" : "Copiar enlace"}
                  </button>
                  <button className="primary-button" onClick={onInvited} type="button">
                    Listo
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="modal__copy">
                La cuenta se creó, pero no pudimos generar el enlace ahora. Genera uno desde el detalle del
                cliente con “Copiar enlace de acceso”.
              </p>
              <div className="modal__actions">
                <button className="primary-button" onClick={onInvited} type="button">
                  Listo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div aria-label="Invitar cliente" aria-modal="true" className="modal" role="dialog">
      <div className="modal__card">
        <header className="modal__header">
          <h3>Invitar cliente</h3>
          <button aria-label="Cerrar" className="ghost-button modal__close" onClick={onClose} type="button">
            ✕
          </button>
        </header>
        <p className="modal__copy">
          Se crea su cuenta y te damos un enlace para enviarle. Al abrirlo, crea su contraseña y entra.
        </p>
        <form className="modal__form" onSubmit={submit}>
          <label className="field">
            <span className="field__label">Email</span>
            <input
              autoFocus
              onChange={(event) => setEmail(event.currentTarget.value)}
              placeholder="cliente@correo.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field">
            <span className="field__label">Nombre</span>
            <input
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Nombre y apellido"
              value={name}
            />
          </label>
          <label className="field">
            <span className="field__label">Negocio</span>
            <input
              onChange={(event) => setBusiness(event.currentTarget.value)}
              placeholder="Nombre del negocio o comunidad"
              value={business}
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <div className="modal__actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Cancelar
            </button>
            <button className="primary-button" disabled={sending || !email.trim()} type="submit">
              {sending ? "Enviando…" : "Enviar invitación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Pestaña Roadmap (swimlanes) =====

function RoadmapTab({
  clients,
  loading,
  loadError,
  onRetry,
}: {
  clients: AdminClientView[];
  loading: boolean;
  loadError: LoadError;
  onRetry: () => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="portal-status" role="status">
        <span className="spinner" aria-hidden="true" />
        <p className="route-status">Cargando roadmap…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="portal-status">
        <p className="route-status">No pudimos cargar el roadmap. Revisa tu conexión e intenta de nuevo.</p>
        <button className="secondary-button" onClick={() => void onRetry()} type="button">
          Reintentar
        </button>
      </div>
    );
  }

  const lanes = clients.filter((client) => client.status === "active" && client.day !== null);
  const pct = (day: number) => `${Math.min(100, (day / PROGRAM.totalDays) * 100)}%`;

  return (
    <section className="admin-card">
      <header className="admin-card__header">
        <div>
          <p className="eyebrow">Roadmap</p>
          <h2>Clientes sobre el camino de {PROGRAM.totalDays} días</h2>
        </div>
        <small className="admin-card__hint">Anillo ámbar = atrasado según su fase</small>
      </header>

      <PhaseTimeline compact currentPhase={0} day={null} neutral startDate={null} />

      {lanes.length === 0 ? (
        <p className="empty-state">No hay clientes activos sobre el roadmap todavía.</p>
      ) : (
        <div className="swimlanes">
          {lanes.map((client) => (
            <a className="swimlane" href={`/admin/clients/${client.id}`} key={client.id}>
              <span className="swimlane__grid" aria-hidden="true">
                {PROGRAM.phases.slice(0, -1).map((phase) => (
                  <i key={phase.id} style={{ left: pct(phase.endDay) }} />
                ))}
              </span>
              <span
                className={client.late ? "swimlane__marker swimlane__marker--late" : "swimlane__marker"}
                style={{ left: pct(client.day ?? 0) }}
              >
                <span className="admin-avatar" aria-hidden="true">
                  {initials(client.name || client.email)}
                </span>
                <span className="swimlane__label">
                  {client.name || client.email}
                  <small>día {client.day}</small>
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

// ===== Pestaña Conversaciones (bandeja + hilo, spec §8.4) =====

function ConversationsTab() {
  const { me } = useSession();
  const meId = me?.profile?.userId ?? "";

  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await apiGet<InboxData>("/api/skool/inbox");
      setThreads(data.threads);
    } catch (error) {
      setLoadError(toLoadError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = threads.find((thread) => thread.client.id === selectedId) ?? null;

  function open(thread: InboxThread) {
    setSelectedId(thread.client.id);
    // ChatThread marca el hilo como leído al montar: el badge se limpia ya.
    setThreads((current) =>
      current.map((item) => (item.client.id === thread.client.id ? { ...item, unread: 0 } : item)),
    );
  }

  function onMembersChanged(clientId: string, members: ThreadMemberRow[]) {
    setThreads((current) =>
      current.map((item) => (item.client.id === clientId ? { ...item, members } : item)),
    );
  }

  if (loading) {
    return (
      <div className="portal-status" role="status">
        <span className="spinner" aria-hidden="true" />
        <p className="route-status">Cargando conversaciones…</p>
      </div>
    );
  }

  if (loadError === "auth") {
    return <SessionExpiredStatus />;
  }

  if (loadError) {
    return (
      <div className="portal-status">
        <p className="route-status">No pudimos cargar las conversaciones. Revisa tu conexión e intenta de nuevo.</p>
        <button className="secondary-button" onClick={() => void load()} type="button">
          Reintentar
        </button>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <section className="admin-card admin-card--empty">
        <p className="eyebrow">Conversaciones</p>
        <h2>Todavía no hay hilos</h2>
        <p className="route-status">
          Cada cliente invitado abre su propio hilo de chat con el equipo. Invita al primero desde la
          pestaña Clientes.
        </p>
      </section>
    );
  }

  return (
    <section className="admin-card" aria-label="Conversaciones">
      <header className="admin-card__header">
        <div>
          <p className="eyebrow">Conversaciones</p>
          <h2>Hilos con tus clientes</h2>
        </div>
        <button className="ghost-button" onClick={() => void load()} type="button">
          Actualizar
        </button>
      </header>

      <div className="inbox">
        {/* <ul>/<li> reales con el botón adentro: role="listitem" sobre el
            button hacía que los lectores de pantalla perdieran la semántica
            de botón. */}
        <ul className="inbox-list">
          {threads.map((thread) => {
            const active = thread.client.id === selectedId;
            return (
              <li key={thread.client.id}>
                <button
                  className={active ? "inbox-row inbox-row--active" : "inbox-row"}
                  onClick={() => open(thread)}
                  type="button"
                >
                  <span aria-hidden="true" className="admin-avatar">
                    {initials(thread.client.name || thread.client.email)}
                  </span>
                  <span className="inbox-row__body">
                    <strong>{thread.client.name || thread.client.email}</strong>
                    <small>
                      {thread.lastMessage
                        ? thread.lastMessage.body
                        : thread.client.business || "Sin mensajes todavía"}
                    </small>
                  </span>
                  <span className="inbox-row__meta">
                    {thread.lastMessage ? <small>{relativeTime(thread.lastMessage.created_at)}</small> : null}
                    {thread.unread > 0 ? (
                      <span aria-label={`${thread.unread} mensajes sin leer`} className="chat-badge">
                        {thread.unread > 99 ? "99+" : thread.unread}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {selected && meId ? (
          <div className="inbox-thread">
            <ChatThread
              clientId={selected.client.id}
              clientName={selected.client.name || selected.client.email}
              meId={meId}
              members={selected.members.map(threadMemberToChatMember)}
              title={selected.client.name || selected.client.email}
            />
            <ThreadMembersManager
              clientId={selected.client.id}
              members={selected.members}
              onChanged={(members) => onMembersChanged(selected.client.id, members)}
            />
          </div>
        ) : (
          <div className="inbox-thread inbox-thread--empty">
            <p className="route-status">Elige una conversación para abrir el hilo.</p>
          </div>
        )}
      </div>
    </section>
  );
}
