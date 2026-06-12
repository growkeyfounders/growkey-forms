import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PROGRAM } from "../../shared/program.mjs";
import { apiGet, apiPost } from "../api";
import { PhaseTimeline } from "../components/PhaseTimeline";
import { OFFER_SLUG, ONBOARDING_SLUG } from "../formSchema";
import type { AdminClientView, ClientsData } from "../skoolTypes";
import { SubmissionsPage } from "./SubmissionsPage";

export type AdminTab = "clients" | "roadmap" | "conversations" | "forms";

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: "clients", label: "Clientes" },
  { id: "roadmap", label: "Roadmap" },
  { id: "conversations", label: "Conversaciones" },
  { id: "forms", label: "Formularios" },
];

// Estado operativo derivado para filtros y badges del panel.
type ClientStatusKey = "ontrack" | "late" | "paused" | "invited" | "completed";

const STATUS_LABEL: Record<ClientStatusKey, string> = {
  ontrack: "al día",
  late: "atrasado",
  paused: "pausado",
  invited: "invitado",
  completed: "completado",
};

function statusKey(client: AdminClientView): ClientStatusKey {
  if (client.status === "invited") return "invited";
  if (client.status === "paused") return "paused";
  if (client.status === "completed") return "completed";
  return client.late ? "late" : "ontrack";
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
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await apiGet<ClientsData>("/api/skool/clients");
      setClients(data.clients);
    } catch {
      setLoadError(true);
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
      {tab === "conversations" ? <ConversationsPlaceholder /> : null}
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
  loadError: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClientStatusKey | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
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

  const visible = clients.filter((client) => {
    if (phaseFilter !== null && client.current_phase !== phaseFilter) return false;
    if (statusFilter !== null && statusKey(client) !== statusFilter) return false;
    return true;
  });

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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await apiPost("/api/skool/clients", { email: email.trim(), name: name.trim(), business: business.trim() });
      onInvited();
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      setError(
        code === "invalid_email"
          ? "Revisa el email: no parece válido."
          : code === "invite_failed"
            ? "No pudimos enviar la invitación. ¿Ya existe una cuenta con ese email?"
            : "No pudimos enviar la invitación, intenta de nuevo.",
      );
    } finally {
      setSending(false);
    }
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
          Le llega un correo con el link para activar su cuenta y entrar a su camino.
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
  loadError: boolean;
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

// ===== Pestaña Conversaciones (placeholder hasta el chat) =====

function ConversationsPlaceholder() {
  return (
    <section className="admin-card admin-card--empty">
      <p className="eyebrow">Conversaciones</p>
      <h2>La bandeja de chat llega en la siguiente entrega</h2>
      <p className="route-status">
        Aquí vas a ver los hilos de cada cliente con sus mensajes no leídos. Mientras tanto,
        el detalle de cada cliente ya muestra su contexto completo.
      </p>
    </section>
  );
}
