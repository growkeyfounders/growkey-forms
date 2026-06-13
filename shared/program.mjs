// Config del programa Agentic Skool + helpers puros de fechas.
// Sin dependencias. Compartido entre server.mjs y la SPA.
// Editar este archivo = editar el programa (fases, hitos, clases, checklists).

export const MS_DAY = 86_400_000;

export const PROGRAM = {
  totalDays: 120,
  goal: "Meta +$10K MRR",
  phases: [
    {
      id: 1,
      name: "Oferta",
      headline: "Diseñamos tu escalera de valor",
      startDay: 0,
      endDay: 14,
      milestones: [
        { day: 7, title: "Auditoría de oferta", type: "call" },
        { day: 14, title: "Cierre de oferta", type: "call" },
      ],
      classes: [
        { id: "c1-escalera", title: "Diseña tu escalera de valor", url: "https://www.skool.com/" },
        { id: "c1-oferta", title: "Construye tu Skool Offer", url: "https://www.skool.com/" },
      ],
      baseTasks: [
        { id: "t1-onboarding", title: "Completa el formulario de onboarding", week: 1, suggestedDay: 1 },
        { id: "t1-escalera", title: "Define tu escalera de valor (free, low ticket, high ticket)", week: 1, suggestedDay: 3, classId: "c1-escalera" },
        { id: "t1-oferta-doc", title: "Llena el ejercicio de oferta", week: 2, suggestedDay: 8, classId: "c1-oferta" },
        { id: "t1-auditoria", title: "Agenda y asiste a tu auditoría de oferta", week: 2, suggestedDay: 10 },
      ],
      requiredForms: ["growkey-onboarding-v1", "growkey-offer-v1"],
    },
    {
      id: 2,
      name: "Blueprint",
      headline: "Creamos el mejor producto de tu vida (comunidad)",
      startDay: 14,
      endDay: 28,
      milestones: [
        { day: 28, title: "Revisión de Skool Blueprint", type: "call" },
      ],
      classes: [
        { id: "c2-dinamicas", title: "Dinámicas de comunidad", url: "https://www.skool.com/" },
        { id: "c2-contenido", title: "Contenido de valor", url: "https://www.skool.com/" },
        { id: "c2-workflow", title: "Workflow de ventas", url: "https://www.skool.com/" },
      ],
      baseTasks: [
        { id: "t2-dinamicas", title: "Define las dinámicas de tu comunidad", week: 3, suggestedDay: 16, classId: "c2-dinamicas" },
        { id: "t2-contenido", title: "Sube tu contenido de valor", week: 3, suggestedDay: 18, classId: "c2-contenido" },
        { id: "t2-eventos", title: "Configura los eventos del mes", week: 4, suggestedDay: 22 },
        { id: "t2-workflow", title: "Configura el workflow de ventas", week: 4, suggestedDay: 24, classId: "c2-workflow" },
        { id: "t2-branding", title: "Completa el branding de tu comunidad", week: 4, suggestedDay: 26 },
      ],
      requiredForms: [],
    },
    {
      id: 3,
      name: "Prelanzamiento",
      headline: "Llenamos tu lista de espera con contenido orgánico",
      startDay: 28,
      endDay: 50,
      milestones: [
        { day: 37, title: "Llamada de prelanzamiento", type: "call" },
      ],
      classes: [
        { id: "c3-waitlist", title: "Estrategia de waitlist", url: "https://www.skool.com/" },
        { id: "c3-contenido", title: "Contenido orgánico con CTA", url: "https://www.skool.com/" },
      ],
      baseTasks: [
        { id: "t3-waitlist", title: "Monta tu estrategia de waitlist", week: 5, suggestedDay: 30, classId: "c3-waitlist" },
        { id: "t3-whatsapp", title: "Crea el grupo de WhatsApp de lista de espera", week: 5, suggestedDay: 32 },
        { id: "t3-contenido", title: "Publica contenido orgánico con CTA al grupo", week: 6, suggestedDay: 37, classId: "c3-contenido" },
        { id: "t3-prelaunch", title: "Ejecuta el prelanzamiento con tu lista", week: 7, suggestedDay: 44 },
      ],
      requiredForms: [],
    },
    {
      id: 4,
      name: "Lanzamiento y evergreen",
      headline: "Lanzamos tu Skool y escalas a +$10K de MRR",
      startDay: 50,
      endDay: 120,
      milestones: [
        { day: 50, title: "Lanzamiento oficial", type: "launch" },
        { day: 61, title: "Inicio de evergreen scaling", type: "launch" },
        { day: 120, title: "Meta +$10K MRR", type: "goal" },
      ],
      classes: [
        { id: "c4-launch", title: "Launch oficial", url: "https://www.skool.com/" },
        { id: "c4-evergreen", title: "Evergreen scaling", url: "https://www.skool.com/" },
      ],
      baseTasks: [
        { id: "t4-launch", title: "Ejecuta tu lanzamiento oficial", week: 8, suggestedDay: 51, classId: "c4-launch" },
        { id: "t4-onboard-miembros", title: "Onboardea a tus primeros miembros", week: 9, suggestedDay: 58 },
        { id: "t4-evergreen", title: "Activa tu sistema evergreen", week: 9, suggestedDay: 62, classId: "c4-evergreen" },
        { id: "t4-offboarding", title: "Llamada de offboarding con el equipo", week: 10, suggestedDay: 68 },
      ],
      requiredForms: [],
    },
  ],
};

function toUtc(dateIso) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Valida una fecha YYYY-MM-DD real: el formato correcto no basta ("2026-99-99"
// pasa el regex), así que exigimos round-trip UTC exacto contra el input.
export function isValidDateIso(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function programDay(startDateIso, todayIso) {
  return Math.max(0, Math.round((toUtc(todayIso) - toUtc(startDateIso)) / MS_DAY));
}

export function currentWeek(day) {
  return Math.floor(day / 7) + 1;
}

export function addDays(dateIso, days) {
  return fromUtc(toUtc(dateIso) + days * MS_DAY);
}

export function milestoneDate(startDateIso, milestoneDay) {
  return addDays(startDateIso, milestoneDay);
}

export function weekRange(startDateIso, week) {
  const from = addDays(startDateIso, (week - 1) * 7);
  return { from, to: addDays(from, 6) };
}

export function phaseById(id) {
  const phase = PROGRAM.phases.find((p) => p.id === id);
  if (!phase) throw new Error(`Fase desconocida: ${id}`);
  return phase;
}

export function expectedPhaseForDay(day) {
  return (
    PROGRAM.phases.find((phase) => day >= phase.startDay && day < phase.endDay) ??
    PROGRAM.phases[PROGRAM.phases.length - 1]
  );
}

export function isLate(currentPhaseId, day) {
  return day > phaseById(currentPhaseId).endDay;
}
