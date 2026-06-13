import { PROGRAM, addDays, currentWeek, milestoneDate, weekRange } from "../../shared/program.mjs";
import type { TaskRow } from "../skoolTypes";

// La semana del programa empieza el día de la semana en que el cliente
// arrancó (NO siempre lunes): la etiqueta de cada chip sale de la fecha real.
const weekdayShort = (iso: string) =>
  new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es-CO", { weekday: "short" })
    .replace(/\.$/, "");

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

const chipLabel = (iso: string) => `${weekdayShort(iso)} ${Number(iso.slice(8, 10))}`;

type WeekViewProps = {
  startDate: string;
  day: number;
  tasks: TaskRow[];
};

export function WeekView({ startDate, day, tasks }: WeekViewProps) {
  const week = currentWeek(day);
  const { from, to } = weekRange(startDate, week);
  const weekStartDay = (week - 1) * 7;
  const milestones = PROGRAM.phases.flatMap((phase) => phase.milestones);

  const chips = Array.from({ length: 7 }, (_, offset) => {
    const dateIso = addDays(from, offset);
    const hasPendingTask = tasks.some(
      (task) =>
        !task.done && task.suggested_day !== null && task.suggested_day - weekStartDay === offset,
    );
    const hasMilestone = milestones.some((m) => m.day - weekStartDay === offset);
    return {
      dateIso,
      weekday: weekdayShort(dateIso),
      dayOfMonth: Number(dateIso.slice(8, 10)),
      isToday: day - weekStartDay === offset,
      hasDot: hasPendingTask || hasMilestone,
    };
  });

  const weekTasks = tasks
    .filter((task) => task.week === week)
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        (a.suggested_day ?? Number.MAX_SAFE_INTEGER) - (b.suggested_day ?? Number.MAX_SAFE_INTEGER) ||
        a.position - b.position,
    );

  const weekMilestones = milestones.filter(
    (m) => m.day >= weekStartDay && m.day <= weekStartDay + 6,
  );

  return (
    <section className="week-view" aria-label="Esta semana">
      <header className="week-view__header">
        <h3>Esta semana</h3>
        <small>
          {shortDate(from)} — {shortDate(to)}
        </small>
      </header>
      <div className="week-days">
        {chips.map((chip) => (
          <div
            key={chip.dateIso}
            className={chip.isToday ? "day-chip day-chip--today" : "day-chip"}
            aria-current={chip.isToday ? "date" : undefined}
          >
            <span>{chip.weekday}</span>
            <strong>{chip.dayOfMonth}</strong>
            {chip.hasDot ? <i className="day-chip__dot" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>
      {weekMilestones.map((m) => (
        <div className="week-milestone" key={m.day}>
          <strong>{m.title}</strong>
          <small>{chipLabel(milestoneDate(startDate, m.day))}</small>
        </div>
      ))}
      <ul className="week-tasks">
        {weekTasks.map((task) => (
          <li key={task.id} className={task.done ? "week-task week-task--done" : "week-task"}>
            <span>{task.title}</span>
            {task.suggested_day !== null ? (
              <small>sugerida · {chipLabel(addDays(startDate, task.suggested_day))}</small>
            ) : null}
          </li>
        ))}
        {weekTasks.length === 0 ? (
          <li className="week-task week-task--empty">Sin tareas sugeridas esta semana.</li>
        ) : null}
      </ul>
    </section>
  );
}
