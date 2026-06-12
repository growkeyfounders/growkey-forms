import { useEffect, useState } from "react";
import {
  getFormBySlug,
  inferFormSlug,
  ONBOARDING_SLUG,
  type FormValues,
} from "../formSchema";
import {
  clearSubmissions,
  exportJson,
  loadSubmissions,
  type Submission,
} from "../storage";

export function SubmissionsPage({ filterSlug }: { filterSlug: string | null }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  const selectedSubmission = submissions.find((item) => item.id === activeSubmissionId) ?? submissions[0];

  useEffect(() => {
    void loadSubmissions(filterSlug).then(setSubmissions);
  }, [filterSlug]);

  async function resetDemoData() {
    await clearSubmissions();
    setSubmissions([]);
    setActiveSubmissionId(null);
  }

  return (
    <main className="ops-layout">
      <section className="ops-sidebar">
        <div className="ops-sidebar__header">
          <div>
            <p className="eyebrow">Panel interno</p>
            <h2>{submissions.length} enviados</h2>
          </div>
          <button className="ghost-button" onClick={resetDemoData} type="button">
            Limpiar
          </button>
        </div>
        <div className="client-list">
          {submissions.length === 0 ? (
            <p className="empty-state">Todavía no hay respuestas.</p>
          ) : (
            submissions.map((submission) => (
              <button
                className={
                  selectedSubmission?.id === submission.id
                    ? "client-row client-row--active"
                    : "client-row"
                }
                key={submission.id}
                onClick={() => setActiveSubmissionId(submission.id)}
                type="button"
              >
                <span>{initials(String(submission.values.client || "GK"))}</span>
                <strong>{String(submission.values.client || "Sin nombre")}</strong>
                <small>{submissionKind(submission)} · {submission.stage}</small>
              </button>
            ))
          )}
        </div>
        <div className="export-row">
          <button className="secondary-button" onClick={() => { window.location.href = filterSlug ? `/api/submissions.csv?form=${filterSlug}` : "/api/submissions.csv"; }} type="button">
            CSV
          </button>
          <button className="secondary-button" onClick={() => exportJson(submissions)} type="button">
            JSON
          </button>
        </div>
      </section>

      <section className="ops-detail">
        {selectedSubmission ? (
          <ClientDetail submission={selectedSubmission} />
        ) : (
          <div className="detail-empty">
            <p className="eyebrow">Panel interno</p>
            <h2>Esperando el primer cliente</h2>
          </div>
        )}
      </section>
    </main>
  );
}

export function ClientDetail({ submission }: { submission: Submission }) {
  const form = getFormBySlug(inferFormSlug(submission.values));
  const isOnboarding = form.slug === ONBOARDING_SLUG;
  const displaySections = form.sections.map((section) => ({
    step: section.step,
    title: section.title,
    fields: section.fields.map((field) => ({ id: field.id, label: field.label })),
  }));
  const highlights: Array<[string, unknown]> = isOnboarding
    ? [
        ["Negocio", submission.values.business],
        ["Email", submission.values.email],
        ["Red principal", submission.values.mainProfile],
        ["Nicho", submission.values.niche],
        ["Ingreso último mes", money(submission.values.lastMonthRevenue)],
        ["Ticket", money(submission.values.ticket)],
      ]
    : [
        ["Avatar / nicho", submission.values.avatarNiche],
        ["Nueva oportunidad", submission.values.newOpportunity],
        ["Mecanismo", submission.values.uniqueMechanism],
        ["Oferta", submission.values.offerStatement],
        ["Referente #1", submission.values.competitor1],
        ["Referente #2", submission.values.competitor2],
      ];

  return (
    <>
      <div className="client-hero">
        <div>
          <p className="eyebrow">{submissionKind(submission)}</p>
          <h1>{String(submission.values.client || "Cliente")}</h1>
          <p>{submission.stage}</p>
        </div>
        <div className="score-ring">
          <strong>{submission.score}</strong>
          <span>score</span>
        </div>
      </div>

      <div className="metric-grid">
        {highlights.map(([label, raw]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{formatValue(raw)}</strong>
          </div>
        ))}
      </div>

      <div className="answer-sections">
        {displaySections.map((section) => (
          <section className="answer-section" key={`${section.step}-${section.title}`}>
            <div className="section-heading section-heading--compact">
              <span>{section.step}</span>
              <h3>{section.title}</h3>
            </div>
            <dl>
              {section.fields.map((field) => (
                <div key={field.id}>
                  <dt>{field.label}</dt>
                  <dd>{formatValue(submission.values[field.id])}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}

function submissionKind(submission: Submission) {
  const form = getFormBySlug(inferFormSlug(submission.values));
  if (form.slug === ONBOARDING_SLUG) return "Onboarding inicial · 23 preguntas";
  return "Ejercicio de oferta";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function money(value: FormValues[string]) {
  const amount = Number(value || 0);
  if (!amount) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Sin dato";
  if (typeof value === "number") return value ? String(value) : "Sin dato";
  const formatted = String(value ?? "").trim();
  return formatted || "Sin dato";
}
