import { addDays } from "../../shared/program.mjs";
import type { BaseTask, Milestone, PhaseConfig } from "../../shared/program.mjs";

// Calendario literal del programa: cada fase es un "mes" con su encabezado
// grande, y los 4 van uno tras otro de izquierda a derecha. Cada día muestra
// su misión y su fecha real (calculada desde la fecha de inicio del cliente).

const HUES = ["#2f6df6", "#10b981", "#f59e0b", "#ef4444"];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];

function dom(iso: string) {
  return Number(iso.slice(8, 10));
}
function monthOf(iso: string) {
  return MONTHS[Number(iso.slice(5, 7)) - 1];
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18 2H6v2H3v3a4 4 0 0 0 4 4h.3A5 5 0 0 0 11 13.9V16H8v2h8v-2h-3v-2.1A5 5 0 0 0 16.7 11H17a4 4 0 0 0 4-4V4h-3V2zM5 7V6h1v3a2 2 0 0 1-1-2zm14 0a2 2 0 0 1-1 2V6h1v1z"
      />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1l-2.2 2.2z"
      />
    </svg>
  );
}

function PhaseMonth({
  phase,
  hue,
  startDate,
  todayIso,
}: {
  phase: PhaseConfig;
  hue: string;
  startDate: string;
  todayIso?: string;
}) {
  const weeks = Math.round((phase.endDay - phase.startDay) / 7);
  const taskByDay = new Map<number, BaseTask>();
  for (const t of phase.baseTasks) if (t.suggestedDay != null) taskByDay.set(t.suggestedDay, t);
  const msByDay = new Map<number, Milestone>();
  for (const m of phase.milestones ?? []) msByDay.set(m.day, m);

  const firstIso = addDays(startDate, phase.startDay);
  const lastIso = addDays(startDate, phase.endDay - 1);
  const span =
    monthOf(firstIso) === monthOf(lastIso)
      ? monthOf(firstIso)
      : `${monthOf(firstIso)}–${monthOf(lastIso)}`;

  const rows = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, off) => {
      const day = phase.startDay + w * 7 + off;
      const iso = addDays(startDate, day);
      return { day, iso, task: taskByDay.get(day), ms: msByDay.get(day), isToday: iso === todayIso };
    }),
  );

  return (
    <div className="pcal-month" style={{ "--hue": hue } as React.CSSProperties}>
      <header className="pcal-month__head">
        <div className="pcal-month__eyebrow">
          <span className="pcal-month__tag">Fase {phase.id}</span>
          <span className="pcal-month__span">{span}</span>
        </div>
        <strong className="pcal-month__name">{phase.name}</strong>
        <span className="pcal-month__sub">
          {weeks} semanas · {phase.baseTasks.length} misiones
        </span>
      </header>
      <div className="pcal-wdrow">
        {WEEKDAYS.map((d) => (
          <span className="pcal-wd" key={d}>
            {d}
          </span>
        ))}
      </div>
      <div className="pcal-grid">
        {rows.map((row, wi) =>
          row.map((c) => {
            const hero = c.ms?.type === "hero";
            const call = c.ms?.type === "call";
            const cls = [
              "pcal-cell",
              !c.task && !c.ms ? "pcal-cell--rest" : "",
              c.isToday ? "pcal-cell--today" : "",
              hero ? "pcal-cell--hero" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div className={cls} key={`${wi}-${c.day}`}>
                <span className="pcal-cell__top">
                  <span className="pcal-cell__date">{dom(c.iso)}</span>
                  {hero ? (
                    <span className="pcal-cell__mk pcal-cell__mk--hero">
                      <TrophyIcon />
                    </span>
                  ) : call ? (
                    <span className="pcal-cell__mk">
                      <PhoneIcon />
                    </span>
                  ) : null}
                </span>
                {c.task ? <span className="pcal-cell__mission">{c.task.mission}</span> : null}
                {!c.task && call ? <span className="pcal-cell__mission">{shortCall(c.ms!.title)}</span> : null}
                {c.isToday ? <span className="pcal-cell__today">hoy</span> : null}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

function shortCall(title: string) {
  if (/onboarding/i.test(title)) return "Llamada · Onboarding";
  if (/weekly/i.test(title)) return "Llamada · Weekly";
  if (/monthly|mensual/i.test(title)) return "Llamada · Mensual";
  if (/cierre/i.test(title)) return "Llamada · Cierre";
  return "Llamada";
}

function icsEscape(text: string) {
  return text.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

function buildIcs(phases: PhaseConfig[], startDate: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Growkey//Agentic Sales//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Agentic Sales — Mi camino",
  ];
  const dateStamp = (iso: string) => iso.replace(/-/g, "");
  for (const phase of phases) {
    for (const t of phase.baseTasks) {
      if (t.suggestedDay == null) continue;
      const iso = addDays(startDate, t.suggestedDay);
      lines.push(
        "BEGIN:VEVENT",
        `UID:gk-${t.id}@growkey.ai`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dateStamp(iso)}`,
        `DTEND;VALUE=DATE:${dateStamp(addDays(iso, 1))}`,
        `SUMMARY:${icsEscape(`${t.mission ?? "Misión"} · Fase ${phase.id}`)}`,
        `DESCRIPTION:${icsEscape(t.title)}`,
        "END:VEVENT",
      );
    }
    for (const m of phase.milestones ?? []) {
      const iso = addDays(startDate, m.day);
      const prefix = m.type === "hero" ? "🏆 " : "📞 ";
      lines.push(
        "BEGIN:VEVENT",
        `UID:gk-ms-${phase.id}-${m.day}@growkey.ai`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dateStamp(iso)}`,
        `DTEND;VALUE=DATE:${dateStamp(addDays(iso, 1))}`,
        `SUMMARY:${icsEscape(prefix + m.title)}`,
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function ProgramCalendar({
  phases,
  startDate,
  todayIso,
}: {
  phases: PhaseConfig[];
  startDate: string;
  todayIso?: string;
}) {
  function downloadIcs() {
    const blob = new Blob([buildIcs(phases, startDate)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agentic-sales-mi-camino.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="pcal">
      <div className="pcal__scroll" role="group" aria-label="Calendario del programa por fases">
        {phases.map((phase, i) => (
          <PhaseMonth
            key={phase.id}
            phase={phase}
            hue={HUES[i]}
            startDate={startDate}
            todayIso={todayIso}
          />
        ))}
      </div>
      <div className="pcal__foot">
        <span className="pcal__hint">Desliza → para ver las 4 fases · cada misión es un día</span>
        <button type="button" className="pcal__ics" onClick={downloadIcs}>
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path
              fill="currentColor"
              d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 7v10H5V9h14zM12 11l-3 3h2v3h2v-3h2l-3-3z"
            />
          </svg>
          Añadir a mi calendario
        </button>
      </div>
    </div>
  );
}
