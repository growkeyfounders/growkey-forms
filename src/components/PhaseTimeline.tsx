import { PROGRAM, milestoneDate } from "../../shared/program.mjs";

// Solo estos hitos llevan etiqueta bajo la banda; el resto, solo punto.
const LABELED_MILESTONES = new Set([7, 28, 50, 120]);

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

type PhaseTimelineProps = {
  startDate: string | null;
  currentPhase: number;
  day: number | null;
  // compact (swimlanes del admin): oculta las etiquetas de hito.
  compact?: boolean;
  // neutral (cabecera de banda del admin): pinta los 4 segmentos en estilo
  // base, sin estados done/current/next.
  neutral?: boolean;
};

export function PhaseTimeline({
  startDate,
  currentPhase,
  day,
  compact = false,
  neutral = false,
}: PhaseTimelineProps) {
  const total = PROGRAM.totalDays;
  const pct = (d: number) => `${Math.min(100, (d / total) * 100)}%`;
  const milestones = PROGRAM.phases.flatMap((phase) => phase.milestones);

  const segClass = (phaseId: number) => {
    if (neutral) return "tl-seg tl-seg--neutral";
    if (phaseId < currentPhase) return "tl-seg tl-seg--done";
    if (phaseId === currentPhase) return "tl-seg tl-seg--current";
    return "tl-seg tl-seg--next";
  };

  return (
    <div className={compact ? "timeline timeline--compact" : "timeline"}>
      <div className="tl-labels">
        {PROGRAM.phases.map((phase) => (
          <span key={phase.id} style={{ width: pct(phase.endDay - phase.startDay) }}>
            Fase {phase.id} · {phase.name}
          </span>
        ))}
      </div>
      <div className="tl-band">
        {PROGRAM.phases.map((phase) => (
          <div
            key={phase.id}
            className={segClass(phase.id)}
            style={{ width: pct(phase.endDay - phase.startDay) }}
          />
        ))}
        {milestones.map((m) => (
          <span className="tl-dot" key={m.day} style={{ left: pct(m.day) }} title={m.title} />
        ))}
        {day !== null && day <= total ? (
          <span className="tl-today" style={{ left: pct(day) }} />
        ) : null}
      </div>
      {!compact && (
        <div className="tl-milestones">
          {milestones
            .filter((m) => LABELED_MILESTONES.has(m.day))
            .map((m) => (
              <div
                className={m.day >= total ? "tl-milestone tl-milestone--end" : "tl-milestone"}
                key={m.day}
                style={{ left: pct(m.day) }}
              >
                <strong>
                  Día {m.day}
                  {startDate ? ` · ${fmt(milestoneDate(startDate, m.day))}` : ""}
                </strong>
                <small>{m.title}</small>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
