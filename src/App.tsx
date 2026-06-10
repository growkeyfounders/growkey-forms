import { useEffect, useMemo, useState } from "react";
import logoUrl from "./assets/growkey-mascot.png";
import {
  createEmptyValues,
  getFormBySlug,
  inferFormSlug,
  OFFER_SLUG,
  offerForm,
  ONBOARDING_SLUG,
  onboardingForm,
  type FieldDefinition,
  type FormConfig,
  type FormValues,
} from "./formSchema";
import {
  buildScore,
  clearSubmissions,
  exportJson,
  loadSubmissions,
  saveSubmission,
  type Submission,
} from "./storage";

type ViewMode = "form" | "ops";
const OTHER_VALUE = "Otro";
const otherFieldId = (fieldId: string) => `${fieldId}Other`;

export function App() {
  const route = useMemo(() => resolveRoute(), []);
  const { currentForm, isAdmin, adminFilterSlug } = route;
  const currentFields = useMemo(
    () => currentForm.sections.flatMap((section) => section.fields),
    [currentForm],
  );
  const [viewMode, setViewMode] = useState<ViewMode>(isAdmin ? "ops" : "form");
  const [values, setValues] = useState<FormValues>(() => createEmptyValues(currentForm.sections));
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const completion = useMemo(() => getCompletion(values, currentFields), [currentFields, values]);
  const visibleFieldIds = useMemo(() => getVisibleFieldIds(values, currentFields), [currentFields, values]);
  const formIsValid = useMemo(() => isFormValid(values, currentFields), [currentFields, values]);
  const selectedSubmission = submissions.find((item) => item.id === activeSubmissionId) ?? submissions[0];

  useEffect(() => {
    void loadSubmissions(isAdmin ? adminFilterSlug : currentForm.slug).then(setSubmissions);
  }, [adminFilterSlug, currentForm.slug, isAdmin]);

  function updateValue(field: FieldDefinition, nextValue: FormValues[string]) {
    setValues((current) => ({ ...current, [field.id]: nextValue }));
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);
    if (!isFormValid(values, currentFields)) return;
    setIsSaving(true);

    const score = buildScore(values, currentForm.slug);
    const submission: Submission = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      values,
      score: score.score,
      stage: score.stage,
    };

    try {
      const saved = await saveSubmission(submission, currentForm.slug);
      setSubmissions((current) => [saved, ...current]);
      setActiveSubmissionId(saved.id);
      setSubmitted(true);
      if (isAdmin) setViewMode("ops");
      setValues(createEmptyValues(currentForm.sections));
      setAttemptedSubmit(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  }

  async function resetDemoData() {
    await clearSubmissions();
    setSubmissions([]);
    setActiveSubmissionId(null);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={currentForm.path} aria-label={currentForm.title}>
          <img src={logoUrl} alt="" />
          <strong>Growkey</strong>
          <span>{currentForm.shortTitle}</span>
        </a>
        {isAdmin ? (
          <nav className="topbar__nav" aria-label="Vistas">
            <a className={adminFilterSlug === ONBOARDING_SLUG ? "nav-button nav-button--active" : "nav-button"} href="/admin/onboarding">Onboarding</a>
            <a className={adminFilterSlug === OFFER_SLUG ? "nav-button nav-button--active" : "nav-button"} href="/admin/offer">Oferta</a>
            <a className={adminFilterSlug === null ? "nav-button nav-button--active" : "nav-button"} href="/admin">Todos</a>
          </nav>
        ) : null}
      </header>

      {viewMode === "form" ? (
        <main className="form-layout">
          <aside className="progress-rail" aria-label="Progreso del formulario">
            <p className="rail-kicker">{currentForm.railKicker}</p>
            <h1>{currentForm.railTitle}</h1>
            <div className="progress-meter" aria-label={`${completion}% completado`}>
              <span style={{ width: `${completion}%` }} />
            </div>
            <p className="rail-copy">
              {completion}% completo
            </p>
            <ol className="steps">
              {currentForm.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>
                    <span>{section.step}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <form className="intake-form" onSubmit={submitForm}>
            <section className="intro-band">
              <p className="eyebrow">{currentForm.introEyebrow}</p>
              <h2>{currentForm.introTitle}</h2>
              <p>{currentForm.introCopy}</p>
            </section>

            {submitted && !isAdmin ? (
              <section className="thanks-panel">
                <p className="eyebrow">Información recibida</p>
                <h3>{currentForm.thanksTitle}</h3>
                <p>{currentForm.thanksCopy}</p>
              </section>
            ) : null}

            {currentForm.sections.map((section) => {
              const visibleFields = section.fields.filter((field) => visibleFieldIds.has(field.id));
              if (visibleFields.length === 0) return null;

              return (
              <section className="form-section form-section--revealed" id={section.id} key={section.id}>
                <div className="section-heading">
                  <span>{section.step}</span>
                  <div>
                    <h3>{section.title}</h3>
                    {section.eyebrow ? <p>{section.eyebrow}</p> : null}
                  </div>
                </div>
                <div className="field-grid">
                  {visibleFields.map((field) => (
                    <Field
                      attemptedSubmit={attemptedSubmit}
                      field={field}
                      key={field.id}
                      onChange={updateValue}
                      value={values[field.id]}
                      values={values}
                    />
                  ))}
                </div>
              </section>
              );
            })}

            {formIsValid ? (
              <section className="finish-panel">
                <p className="eyebrow">Has terminado</p>
                <h3>Revisa una última vez antes de enviar.</h3>
                <p>
                  Envía el formulario solo si completaste las preguntas de forma adecuada.
                  Después podrás acceder a esta información desde el panel interno.
                </p>
              </section>
            ) : null}

            <div className="submit-row">
              {submitted ? <span className="success-pill">Último envío guardado</span> : <span />}
              <button className="primary-button" disabled={isSaving || !formIsValid} type="submit">
                {isSaving ? "Guardando..." : currentForm.submitLabel}
              </button>
            </div>
          </form>
        </main>
      ) : (
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
              <button className="secondary-button" onClick={() => { window.location.href = adminFilterSlug ? `/api/submissions.csv?form=${adminFilterSlug}` : "/api/submissions.csv"; }} type="button">
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
      )}
    </div>
  );
}

function Field({
  attemptedSubmit,
  field,
  onChange,
  value,
  values,
}: {
  attemptedSubmit: boolean;
  field: FieldDefinition;
  onChange: (field: FieldDefinition, nextValue: FormValues[string]) => void;
  value: FormValues[string];
  values: FormValues;
}) {
  const isEmpty = field.required && !isFieldComplete(field, values);
  const showError = attemptedSubmit && isEmpty;

  return (
    <label className={`field field--${field.span ?? "full"}`}>
      <span className="field__label">
        {field.label}
        {field.required ? <b>*</b> : null}
      </span>
      <span className="field__prompt">{field.prompt}</span>
      <FieldControl field={field} onChange={onChange} value={value} values={values} />
      {showError ? <span className="field__error">Completa este campo</span> : null}
    </label>
  );
}

function FieldControl({
  field,
  onChange,
  value,
  values,
}: {
  field: FieldDefinition;
  onChange: (field: FieldDefinition, nextValue: FormValues[string]) => void;
  value: FormValues[string];
  values: FormValues;
}) {
  const otherValue = String(values[otherFieldId(field.id)] ?? "");
  const renderOtherInput = () => (
    <input
      className="other-input"
      placeholder="Escribe tu opción"
      type="text"
      value={otherValue}
      onChange={(event) =>
        onChange({ ...field, id: otherFieldId(field.id), required: false }, event.currentTarget.value)
      }
    />
  );

  if (field.type === "textarea") {
    return (
      <textarea
        rows={4}
        placeholder={field.placeholder}
        value={String(value ?? "")}
        onChange={(event) => onChange(field, event.currentTarget.value)}
      />
    );
  }

  if (field.type === "currency") {
    return (
      <div className="currency-input">
        <span>$</span>
        <input
          min="0"
          inputMode="decimal"
          type="number"
          value={String(value ?? "")}
          onChange={(event) => onChange(field, event.currentTarget.value)}
        />
      </div>
    );
  }

  if (field.type === "singleSelect") {
    return (
      <div className="control-stack">
        <select
          value={String(value ?? "")}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            onChange(field, nextValue);
            if (nextValue !== OTHER_VALUE) {
              onChange({ ...field, id: otherFieldId(field.id), required: false }, "");
            }
          }}
        >
          <option value="">Selecciona una opción</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {value === OTHER_VALUE ? renderOtherInput() : null}
      </div>
    );
  }

  if (field.type === "multiSelect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="control-stack">
        <div className="chip-group">
          {field.options?.map((option) => (
            <button
              className={selected.includes(option) ? "chip chip--active" : "chip"}
              key={option}
              onClick={() => {
                const isSelected = selected.includes(option);
                onChange(
                  field,
                  isSelected
                    ? selected.filter((item) => item !== option)
                    : [...selected, option],
                );
                if (option === OTHER_VALUE && isSelected) {
                  onChange({ ...field, id: otherFieldId(field.id), required: false }, "");
                }
              }}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
        {selected.includes(OTHER_VALUE) ? renderOtherInput() : null}
      </div>
    );
  }

  if (field.type === "rating") {
    const current = Number(value || 0);
    return (
      <div className="rating" role="radiogroup" aria-label={field.label}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            aria-checked={current === rating}
            className={rating <= current ? "star star--active" : "star"}
            key={rating}
            onClick={() => onChange(field, rating)}
            role="radio"
            type="button"
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  return (
    <input
      type="text"
      placeholder={field.placeholder}
      value={String(value ?? "")}
      onChange={(event) => onChange(field, event.currentTarget.value)}
    />
  );
}

function ClientDetail({ submission }: { submission: Submission }) {
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

function resolveRoute(): {
  adminFilterSlug: string | null;
  currentForm: FormConfig;
  isAdmin: boolean;
} {
  const path = window.location.pathname;
  const isAdmin = path.includes("/admin") || window.location.search.includes("admin=1");
  const currentForm = path.includes("onboarding") ? onboardingForm : offerForm;
  const adminFilterSlug = !isAdmin
    ? currentForm.slug
    : path.includes("/admin/onboarding")
      ? ONBOARDING_SLUG
      : path.includes("/admin/offer")
        ? OFFER_SLUG
        : null;

  return { adminFilterSlug, currentForm, isAdmin };
}

function isFieldEmpty(value: FormValues[string]) {
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "number") return value <= 0;
  return String(value ?? "").trim() === "";
}

function isFormValid(values: FormValues, fields: FieldDefinition[]) {
  return fields.every((field) => !field.required || isFieldComplete(field, values));
}

function getCompletion(values: FormValues, fields: FieldDefinition[]) {
  const required = fields.filter((field) => field.required);
  const complete = required.filter((field) => isFieldComplete(field, values)).length;
  return Math.round((complete / required.length) * 100);
}

function getVisibleFieldIds(values: FormValues, fields: FieldDefinition[]) {
  const visible = new Set<string>();

  for (const field of fields) {
    visible.add(field.id);
    if (field.required && !isFieldComplete(field, values)) break;
  }

  return visible;
}

function isFieldComplete(field: FieldDefinition, values: FormValues) {
  const value = values[field.id];
  if (isFieldEmpty(value)) return false;

  if (value === OTHER_VALUE || (Array.isArray(value) && value.includes(OTHER_VALUE))) {
    return !isFieldEmpty(values[otherFieldId(field.id)]);
  }

  return true;
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
