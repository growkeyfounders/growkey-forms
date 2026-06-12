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
