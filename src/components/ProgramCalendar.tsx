import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { addDays } from "../../shared/program.mjs";
import type { BaseTask, Milestone, PhaseConfig } from "../../shared/program.mjs";

// Calendario literal del programa: cada fase es un "mes" con su encabezado
// grande. Se ancla a HOY como día 1 y agenda las misiones en días hábiles
// (lunes a viernes), así que siempre refleja la fecha actual del cliente.

const HUES = ["#2f6df6", "#10b981", "#f59e0b", "#ef4444"];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function dow(iso: string) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}
function isWeekend(iso: string) {
  const d = dow(iso);
  return d === 0 || d === 6;
}
function weekdayOnOrAfter(iso: string) {
  let d = iso;
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}
function nextWeekday(iso: string) {
  let d = addDays(iso, 1);
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}
function sundayOnOrBefore(iso: string) {
  let d = iso;
  while (dow(d) !== 0) d = addDays(d, -1);
  return d;
}
function domOf(iso: string) {
  return Number(iso.slice(8, 10));
}
function monthOf(iso: string) {
  return MONTHS[Number(iso.slice(5, 7)) - 1];
}

type Schedule = {
  dayToDate: Map<number, string>;
  dateToTask: Map<string, { task: BaseTask; phaseId: number }>;
  dateToMs: Map<string, Milestone>;
};

function buildSchedule(phases: PhaseConfig[], anchorIso: string): Schedule {
  const dayToDate = new Map<number, string>();
  const dateToTask = new Map<string, { task: BaseTask; phaseId: number }>();
  const dateToMs = new Map<string, Milestone>();
  let cur = weekdayOnOrAfter(anchorIso);
  let first = true;
  for (const phase of phases) {
    for (const t of phase.baseTasks) {
      if (t.suggestedDay == null) continue;
      if (!first) cur = nextWeekday(cur);
      first = false;
      dayToDate.set(t.suggestedDay, cur);
      dateToTask.set(cur, { task: t, phaseId: phase.id });
    }
  }
  for (const phase of phases) {
    for (const m of phase.milestones) {
      const d = dayToDate.get(m.day);
      if (d) dateToMs.set(d, m);
    }
  }
  return { dayToDate, dateToTask, dateToMs };
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
  schedule,
  todayIso,
}: {
  phase: PhaseConfig;
  hue: string;
  schedule: Schedule;
  todayIso: string;
}) {
  const days = phase.baseTasks.map((t) => t.suggestedDay).filter((d): d is number => d != null);
  const firstDate = schedule.dayToDate.get(days[0])!;
  const lastDate = schedule.dayToDate.get(days[days.length - 1])!;
  const span = monthOf(firstDate) === monthOf(lastDate) ? monthOf(firstDate) : `${monthOf(firstDate)}–${monthOf(lastDate)}`;

  const weeks: Array<Array<{ date: string; task?: BaseTask; ms?: Milestone; isToday: boolean }>> = [];
  for (let wk = sundayOnOrBefore(firstDate); wk <= lastDate; wk = addDays(wk, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, off) => {
        const date = addDays(wk, off);
        const entry = schedule.dateToTask.get(date);
        const mine = entry && entry.phaseId === phase.id ? entry.task : undefined;
        return {
          date,
          task: mine,
          ms: mine ? schedule.dateToMs.get(date) : undefined,
          isToday: date === todayIso,
        };
      }),
    );
  }

  return (
    <div className="pcal-month" style={{ "--hue": hue } as React.CSSProperties}>
      <header className="pcal-month__head">
        <div className="pcal-month__eyebrow">
          <span className="pcal-month__tag">Fase {phase.id}</span>
          <span className="pcal-month__span">{span}</span>
        </div>
        <strong className="pcal-month__name">{phase.name}</strong>
        <span className="pcal-month__sub">
          {Math.round((phase.endDay - phase.startDay) / 7)} semanas · {phase.baseTasks.length} misiones
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
        {weeks.map((row, wi) =>
          row.map((c) => {
            const hero = c.ms?.type === "hero";
            const call = c.ms?.type === "call";
            const cls = [
              "pcal-cell",
              !c.task ? "pcal-cell--rest" : "",
              c.isToday ? "pcal-cell--today" : "",
              hero ? "pcal-cell--hero" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div className={cls} key={`${wi}-${c.date}`}>
                <span className="pcal-cell__top">
                  <span className="pcal-cell__date">{domOf(c.date)}</span>
                  {c.isToday ? (
                    <span className="pcal-cell__hoy">hoy</span>
                  ) : hero ? (
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
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

function icsEscape(text: string) {
  return text.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

function buildIcs(phases: PhaseConfig[], schedule: Schedule) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ds = (iso: string) => iso.replace(/-/g, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Growkey//Agentic Sales//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Agentic Sales — Mi camino",
  ];
  for (const phase of phases) {
    for (const t of phase.baseTasks) {
      if (t.suggestedDay == null) continue;
      const iso = schedule.dayToDate.get(t.suggestedDay);
      if (!iso) continue;
      lines.push(
        "BEGIN:VEVENT",
        `UID:gk-${t.id}@growkey.ai`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ds(iso)}`,
        `DTEND;VALUE=DATE:${ds(addDays(iso, 1))}`,
        `SUMMARY:${icsEscape(`${t.mission ?? "Misión"} · Fase ${phase.id}`)}`,
        `DESCRIPTION:${icsEscape(t.title)}`,
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
  todayIso: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const schedule = buildSchedule(phases, startDate);

  // El carrusel toma la altura de la fase ACTIVA (no de la más larga), para no
  // dejar espacio vacío debajo de las fases cortas.
  useLayoutEffect(() => {
    const el = scroller.current;
    const child = el?.children[active] as HTMLElement | undefined;
    if (el && child) el.style.height = `${child.offsetHeight}px`;
  }, [active]);
  useEffect(() => {
    function onResize() {
      const el = scroller.current;
      const child = el?.children[active] as HTMLElement | undefined;
      if (el && child) el.style.height = `${child.offsetHeight}px`;
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);

  function go(i: number) {
    const el = scroller.current;
    if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    if (child) el.style.height = `${child.offsetHeight}px`;
    el.scrollLeft = i * el.clientWidth;
    setActive(i);
  }
  function onScroll() {
    const el = scroller.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  }
  function downloadIcs() {
    const blob = new Blob([buildIcs(phases, schedule)], { type: "text/calendar;charset=utf-8" });
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
      <div className="pcal__nav">
        <div className="pcal__tabs" role="tablist" aria-label="Fases del programa">
          {phases.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`pcal__tab${active === i ? " is-active" : ""}`}
              style={{ "--hue": HUES[i] } as React.CSSProperties}
              onClick={() => go(i)}
              aria-selected={active === i}
              role="tab"
            >
              Fase {p.id}
            </button>
          ))}
        </div>
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
      <div className="pcal__scroll" ref={scroller} onScroll={onScroll}>
        {phases.map((phase, i) => (
          <PhaseMonth key={phase.id} phase={phase} hue={HUES[i]} schedule={schedule} todayIso={todayIso} />
        ))}
      </div>
    </div>
  );
}
