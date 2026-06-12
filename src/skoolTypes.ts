// Tipos de las respuestas de /api/skool/* tal como llegan del servidor:
// filas snake_case de Supabase (spec §5) + campos derivados que arma
// clientView() en server/skool.mjs. No transformar a camelCase en el cliente.
import type { PhaseConfig } from "../shared/program.mjs";

export type SkoolClientStatus = "invited" | "active" | "paused" | "completed";

export type TaskSource = "base" | "custom";

// Fila de skool_client_tasks.
export type TaskRow = {
  id: string;
  client_id: string;
  phase: number;
  source: TaskSource;
  template_id: string | null;
  title: string;
  week: number | null;
  suggested_day: number | null;
  class_id: string | null;
  position: number;
  done: boolean;
  done_at: string | null;
  created_by: string | null;
  created_at: string;
};

// Fila de skool_clients.
export type ClientRow = {
  id: string;
  email: string;
  name: string;
  business: string;
  status: SkoolClientStatus;
  start_date: string | null;
  current_phase: number;
  phase_started_at: string | null;
  created_at: string;
};

// Vista derivada (clientView() en server/skool.mjs): fila + día/semana del
// programa, semáforo de atraso, tareas y slugs de formularios enviados.
export type ClientView = ClientRow & {
  day: number | null;
  week: number | null;
  late: boolean;
  tasks: TaskRow[];
  submittedFormSlugs: string[];
};

export type ProgramConfig = {
  totalDays: number;
  goal: string;
  phases: PhaseConfig[];
};

// GET /api/skool/portal
export type PortalData = {
  program: ProgramConfig;
  client: ClientView;
};

// POST /api/skool/tasks/:id/toggle
export type ToggleResponse = {
  task: TaskRow;
  advanced: boolean;
  programCompleted: boolean;
  client: ClientView;
};

// GET /api/skool/clients — vista por cliente para el panel interno:
// ClientView + progreso de la fase actual y última actividad registrada.
export type AdminClientView = ClientView & {
  progressPct: number;
  lastActivityAt: string | null;
};

export type ClientsData = {
  clients: AdminClientView[];
};

// Fila cruda de growkey_form_submissions (snake_case, como llega del context).
export type SubmissionRow = {
  id: string;
  form_slug: string;
  created_at: string;
  score: number;
  stage: string;
  client_id: string | null;
  values: Record<string, unknown>;
};

export type SkoolEventType =
  | "task_done"
  | "task_undone"
  | "task_added"
  | "task_deleted"
  | "form_submitted"
  | "phase_advanced"
  | "phase_override"
  | "status_change"
  | "start_date_set"
  | "note";

// Fila de skool_events.
export type EventRow = {
  id: string;
  client_id: string;
  type: SkoolEventType | string;
  payload: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

// Fila de skool_messages.
export type MessageRow = {
  id: string;
  client_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

// Fila de skool_thread_members con el perfil embebido por PostgREST.
export type ThreadMemberRow = {
  client_id: string;
  user_id: string;
  added_at: string;
  profiles?: { name: string; photo_url: string | null } | null;
};

// GET /api/skool/clients/:id/context — contexto unificado (spec §10).
export type AdminContext = {
  program: ProgramConfig;
  client: ClientView;
  submissions: SubmissionRow[];
  events: EventRow[];
  messages: MessageRow[];
  threadMembers: ThreadMemberRow[];
};
