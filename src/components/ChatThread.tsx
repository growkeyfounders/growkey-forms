import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../api";
import { supabase } from "../supabaseClient";
import type { AdminProfileRow, MessageRow, ThreadMemberRow } from "../skoolTypes";

// Miembro del hilo ya resuelto para la UI (nombre + foto del perfil).
export type ChatMember = { user_id: string; name: string; photo_url?: string | null };

// Mensaje local: fila de skool_messages + estado optimista (spec §11).
type ChatMessage = MessageRow & { pending?: boolean; failed?: boolean };

const POLL_MS = 15_000;
const MAX_MESSAGES = 500;

export function threadMemberToChatMember(row: ThreadMemberRow): ChatMember {
  return {
    user_id: row.user_id,
    name: row.profiles?.name || "Equipo Growkey",
    photo_url: row.profiles?.photo_url ?? null,
  };
}

function chatInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "GK"
  );
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Hoy";
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// Mezcla el select fresco con los mensajes locales que aún no están en el
// servidor (optimistas pendientes o fallidos) para que el polling no los borre.
function mergeFetched(fetched: ChatMessage[], current: ChatMessage[]): ChatMessage[] {
  const ids = new Set(fetched.map((message) => message.id));
  const localOnly = current.filter((message) => !ids.has(message.id) && (message.pending || message.failed));
  return [...fetched, ...localOnly];
}

export function ChatThread({
  clientId,
  meId,
  members,
  title,
  clientName,
  onRead,
}: {
  clientId: string;
  meId: string;
  members: ChatMember[];
  /** Cómo ve este usuario el grupo (el cliente lo ve como "Tu equipo Growkey"). */
  title: string;
  /** Nombre del cliente dueño del hilo, para resolver sus burbujas en la vista admin. */
  clientName?: string;
  /** Aviso al padre cuando este usuario marca el hilo como leído (limpia badges). */
  onRead?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<number | null>(null);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;

  const markRead = useCallback(() => {
    void supabase
      .from("skool_message_reads")
      .upsert({ user_id: meId, client_id: clientId, last_read_at: new Date().toISOString() })
      .then(() => onReadRef.current?.());
  }, [clientId, meId]);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("skool_messages")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true })
      .limit(MAX_MESSAGES);
    // Un select fallido no es "todavía no hay mensajes": marcamos el error
    // (la UI lo muestra solo si no hay nada cargado; un fallo de polling con
    // mensajes en pantalla no los tapa).
    if (error) {
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    setMessages((current) => mergeFetched((data ?? []) as ChatMessage[], current));
  }, [clientId]);

  // El borrador es por hilo: en la bandeja el componente no va keyed por
  // cliente, así que al cambiar de hilo el texto no debe arrastrarse.
  useEffect(() => {
    setDraft("");
  }, [clientId]);

  useEffect(() => {
    let active = true;
    setMessages([]);
    setLoading(true);
    setLoadFailed(false);

    void fetchMessages().finally(() => {
      if (!active) return;
      setLoading(false);
      markRead();
    });

    const stopPolling = () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    const startPolling = () => {
      if (pollRef.current !== null) return;
      pollRef.current = window.setInterval(() => void fetchMessages(), POLL_MS);
    };

    const channel = supabase
      .channel(`skool-chat-${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "skool_messages", filter: `client_id=eq.${clientId}` },
        (payload) => {
          const incoming = payload.new as MessageRow;
          // Dedupe por id: el propio insert optimista también llega por realtime.
          setMessages((current) =>
            current.some((message) => message.id === incoming.id)
              ? current.map((message) =>
                  message.id === incoming.id ? { ...message, ...incoming, pending: false, failed: false } : message,
                )
              : [...current, incoming],
          );
          if (incoming.sender_id !== meId) markRead();
        },
      )
      // Fallback a polling (spec §9): si el canal no suscribe, select cada 15s.
      .subscribe((status) => {
        if (status === "SUBSCRIBED") stopPolling();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") startPolling();
      });

    return () => {
      active = false;
      stopPolling();
      void supabase.removeChannel(channel);
    };
  }, [clientId, meId, fetchMessages, markRead]);

  // Auto-scroll al fondo con cada mensaje nuevo (y al cargar).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  function patchMessage(id: string, patch: Partial<ChatMessage>) {
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }

  // Insert directo vía supabase-js (RLS permite escribir solo en el propio hilo).
  async function persist(message: ChatMessage) {
    const { error } = await supabase
      .from("skool_messages")
      .insert({ id: message.id, client_id: clientId, sender_id: meId, body: message.body });
    if (error) patchMessage(message.id, { pending: false, failed: true });
    else {
      patchMessage(message.id, { pending: false, failed: false });
      markRead();
    }
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      client_id: clientId,
      sender_id: meId,
      body,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((current) => [...current, optimistic]);
    await persist(optimistic);
  }

  async function retry(message: ChatMessage) {
    patchMessage(message.id, { pending: true, failed: false });
    await persist(message);
  }

  async function retryLoad() {
    setLoading(true);
    await fetchMessages();
    setLoading(false);
  }

  function senderName(senderId: string) {
    if (senderId === clientId) return clientName || "Cliente";
    return members.find((member) => member.user_id === senderId)?.name || "Equipo Growkey";
  }

  function senderPhoto(senderId: string) {
    return members.find((member) => member.user_id === senderId)?.photo_url ?? null;
  }

  return (
    <div className="chat" aria-label={`Chat: ${title}`}>
      <header className="chat__header">
        <div aria-hidden="true" className="chat__avatars">
          {members.slice(0, 4).map((member) => (
            <Avatar key={member.user_id} name={member.name} photoUrl={member.photo_url} />
          ))}
        </div>
        <div className="chat__title">
          <h3>{title}</h3>
          <small>
            {members.length === 0
              ? "Sin miembros del equipo todavía"
              : members.map((member) => member.name).join(" · ")}
          </small>
        </div>
      </header>

      <div className="chat__scroll" ref={scrollRef}>
        {loading ? (
          <p className="chat__status" role="status">
            Cargando la conversación…
          </p>
        ) : loadFailed && messages.length === 0 ? (
          <div className="chat__status" role="alert">
            No pudimos cargar el chat.{" "}
            <button className="chat-msg__retry" onClick={() => void retryLoad()} type="button">
              Reintentar
            </button>
          </div>
        ) : messages.length === 0 ? (
          <p className="chat__status">Todavía no hay mensajes. Escribe el primero.</p>
        ) : (
          messages.map((message, index) => {
            const mine = message.sender_id === meId;
            const previous = messages[index - 1];
            const newDay = !previous || dayLabel(previous.created_at) !== dayLabel(message.created_at);
            return (
              <div key={message.id}>
                {newDay ? <div className="chat-day">{dayLabel(message.created_at)}</div> : null}
                <div className={mine ? "chat-msg chat-msg--mine" : "chat-msg"}>
                  {!mine ? (
                    <Avatar name={senderName(message.sender_id)} photoUrl={senderPhoto(message.sender_id)} />
                  ) : null}
                  <div
                    className={
                      message.pending ? "chat-msg__bubble chat-msg__bubble--pending" : "chat-msg__bubble"
                    }
                  >
                    {!mine ? <strong className="chat-msg__sender">{senderName(message.sender_id)}</strong> : null}
                    <p>{message.body}</p>
                    {message.failed ? (
                      <button className="chat-msg__retry" onClick={() => void retry(message)} type="button">
                        no enviado · reintentar
                      </button>
                    ) : (
                      <small className="chat-msg__time">
                        {timeLabel(message.created_at)}
                        {message.pending ? " · enviando…" : ""}
                      </small>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form className="chat__composer" onSubmit={send}>
        <input
          aria-label="Mensaje"
          maxLength={4000}
          onChange={(event) => setDraft(event.currentTarget.value)}
          placeholder="Escribe un mensaje…"
          value={draft}
        />
        <button className="primary-button chat__send" disabled={!draft.trim()} type="submit">
          Enviar
        </button>
      </form>
    </div>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) return <img alt="" className="chat-avatar" src={photoUrl} />;
  return (
    <span aria-hidden="true" className="chat-avatar chat-avatar--initials">
      {chatInitials(name)}
    </span>
  );
}

// ===== Gestión de miembros del hilo (solo admin, spec §8.3) =====

export function ThreadMembersManager({
  clientId,
  members,
  onChanged,
}: {
  clientId: string;
  members: ThreadMemberRow[];
  onChanged: (members: ThreadMemberRow[]) => void;
}) {
  const [admins, setAdmins] = useState<AdminProfileRow[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiGet<{ admins: AdminProfileRow[] }>("/api/skool/admins")
      .then((data) => {
        if (active) setAdmins(data.admins);
      })
      .catch(() => {
        if (active) setError("No pudimos cargar el equipo.");
      });
    return () => {
      active = false;
    };
  }, []);

  const available = admins.filter((admin) => !members.some((member) => member.user_id === admin.user_id));

  async function run(userId: string, action: "add" | "remove") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiPost<{ members: ThreadMemberRow[] }>(
        `/api/skool/clients/${clientId}/thread-members`,
        { userId, action },
      );
      onChanged(data.members);
      setSelected("");
    } catch {
      setError("No pudimos actualizar los miembros, intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="thread-members">
      <span className="thread-members__label">Miembros del grupo</span>
      <div className="thread-members__chips">
        {members.length === 0 ? (
          <p className="empty-state">Nadie del equipo está en este hilo todavía.</p>
        ) : (
          members.map((member) => {
            const chat = threadMemberToChatMember(member);
            return (
              <span className="member-chip" key={member.user_id}>
                <Avatar name={chat.name} photoUrl={chat.photo_url} />
                {chat.name}
                <button
                  aria-label={`Quitar a ${chat.name} del grupo`}
                  className="member-chip__remove"
                  disabled={busy}
                  onClick={() => void run(member.user_id, "remove")}
                  type="button"
                >
                  ✕
                </button>
              </span>
            );
          })
        )}
      </div>
      <div className="thread-members__form">
        <select
          aria-label="Agregar miembro del equipo"
          disabled={busy || available.length === 0}
          onChange={(event) => setSelected(event.currentTarget.value)}
          value={selected}
        >
          <option value="">
            {available.length === 0 ? "Todo el equipo ya está en el grupo" : "Agregar del equipo…"}
          </option>
          {available.map((admin) => (
            <option key={admin.user_id} value={admin.user_id}>
              {admin.name || admin.user_id}
            </option>
          ))}
        </select>
        <button
          className="secondary-button"
          disabled={busy || !selected}
          onClick={() => void run(selected, "add")}
          type="button"
        >
          Agregar
        </button>
      </div>
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}
