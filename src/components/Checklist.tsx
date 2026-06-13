import type { PhaseConfig } from "../../shared/program.mjs";
import { formConfigs } from "../formSchema";
import type { TaskRow } from "../skoolTypes";

type ChecklistProps = {
  tasks: TaskRow[];
  phase: PhaseConfig;
  submittedFormSlugs: string[];
  // El padre hace el toggle optimista con rollback (spec §11).
  onToggle: (task: TaskRow) => void;
  busyTaskId?: string | null;
  canToggle: boolean;
};

export function Checklist({
  tasks,
  phase,
  submittedFormSlugs,
  onToggle,
  busyTaskId = null,
  canToggle,
}: ChecklistProps) {
  const phaseTasks = tasks
    .filter((task) => task.phase === phase.id)
    .sort(
      (a, b) =>
        a.position - b.position ||
        (a.source === b.source ? 0 : a.source === "base" ? -1 : 1) ||
        a.created_at.localeCompare(b.created_at),
    );

  const submitted = new Set(submittedFormSlugs);
  const doneCount =
    phaseTasks.filter((task) => task.done).length +
    phase.requiredForms.filter((slug) => submitted.has(slug)).length;
  const totalCount = phaseTasks.length + phase.requiredForms.length;

  return (
    <section className="checklist" aria-label={`Checklist de la fase ${phase.id}`}>
      <header className="checklist__header">
        <div>
          <h3>Checklist de la fase</h3>
          <p>
            Fase {phase.id} · {phase.name}
          </p>
        </div>
        <span className="checklist__count">
          {doneCount} de {totalCount} listas
        </span>
      </header>
      <div className="checklist__items">
        {phaseTasks.map((task) => {
          const classUrl = task.class_id
            ? phase.classes.find((skoolClass) => skoolClass.id === task.class_id)?.url
            : undefined;
          const busy = busyTaskId === task.id;
          return (
            <div key={task.id} className={task.done ? "check-item check-item--done" : "check-item"}>
              <button
                type="button"
                role="checkbox"
                aria-checked={task.done}
                aria-label={task.done ? `Desmarcar: ${task.title}` : `Marcar como lista: ${task.title}`}
                className={busy ? "check-toggle check-toggle--busy" : "check-toggle"}
                // Con un toggle en vuelo se deshabilitan TODOS los checkboxes:
                // evita toggles concurrentes que el padre descartaría en silencio.
                disabled={!canToggle || busyTaskId !== null}
                onClick={() => onToggle(task)}
              >
                {task.done ? "✓" : ""}
              </button>
              <div className="check-item__body">
                <span className="check-item__title">{task.title}</span>
                {task.source === "custom" || classUrl ? (
                  <span className="check-item__meta">
                    {task.source === "custom" ? (
                      <span className="coach-badge">de tu coach</span>
                    ) : null}
                    {classUrl ? (
                      <a className="class-link" href={classUrl} target="_blank" rel="noreferrer">
                        ver clase ↗
                      </a>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
        {phaseTasks.length === 0 ? (
          <p className="empty-state">Aún no hay tareas en esta fase.</p>
        ) : null}
        {phase.requiredForms.map((slug) => {
          const form = formConfigs.find((config) => config.slug === slug) ?? null;
          const isSubmitted = submitted.has(slug);
          return (
            <div key={slug} className={isSubmitted ? "check-item check-item--done" : "check-item"}>
              <span
                className={
                  isSubmitted
                    ? "check-toggle check-toggle--static check-toggle--on"
                    : "check-toggle check-toggle--static"
                }
                aria-hidden="true"
              >
                {isSubmitted ? "✓" : ""}
              </span>
              <div className="check-item__body">
                <span className="check-item__title">
                  {form ? `Formulario: ${form.shortTitle}` : slug}
                </span>
                <span className="check-item__meta">
                  <span className="form-badge">requerido para avanzar</span>
                </span>
              </div>
              {isSubmitted ? (
                <span className="form-status">enviado ✓</span>
              ) : form ? (
                <a className="secondary-button check-item__action" href={`${form.path}?embedded=1`}>
                  Llenar formulario
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
