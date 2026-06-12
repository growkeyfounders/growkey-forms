import { useMemo, useState } from "react";
import {
  createEmptyValues,
  type FieldDefinition,
  type FormConfig,
  type FormValues,
} from "../formSchema";
import { buildScore, saveSubmission, type Submission } from "../storage";

const OTHER_VALUE = "Otro";
const otherFieldId = (fieldId: string) => `${fieldId}Other`;

export function FormPage({ form, onSubmitted }: { form: FormConfig; onSubmitted?: () => void }) {
  const currentFields = useMemo(
    () => form.sections.flatMap((section) => section.fields),
    [form],
  );
  // ?embedded=1: el cliente llegó desde su portal (/app). Tras enviar, si el
  // server reporta avance de fase volvemos al portal celebrando; si no,
  // ofrecemos el botón "Volver a mi panel".
  const embedded = useMemo(
    () => new URLSearchParams(window.location.search).get("embedded") === "1",
    [],
  );
  const [values, setValues] = useState<FormValues>(() => createEmptyValues(form.sections));
  const [submitted, setSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const completion = useMemo(() => getCompletion(values, currentFields), [currentFields, values]);
  const visibleFieldIds = useMemo(() => getVisibleFieldIds(values, currentFields), [currentFields, values]);
  const formIsValid = useMemo(() => isFormValid(values, currentFields), [currentFields, values]);

  function updateValue(field: FieldDefinition, nextValue: FormValues[string]) {
    setValues((current) => ({ ...current, [field.id]: nextValue }));
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);
    if (!isFormValid(values, currentFields)) return;
    setIsSaving(true);

    const score = buildScore(values, form.slug);
    const submission: Submission = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      values,
      score: score.score,
      stage: score.stage,
    };

    try {
      // POST /api/submissions devuelve {...saved, advanced} cuando hay sesión
      // de cliente: el server liga la submission y corre el motor (spec §6).
      const saved = await saveSubmission(submission, form.slug);
      if (embedded && (saved as Submission & { advanced?: boolean }).advanced === true) {
        window.location.assign("/app?celebrate=1");
        return;
      }
      setSubmitted(true);
      setValues(createEmptyValues(form.sections));
      setAttemptedSubmit(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      onSubmitted?.();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="form-layout">
      <aside className="progress-rail" aria-label="Progreso del formulario">
        <p className="rail-kicker">{form.railKicker}</p>
        <h1>{form.railTitle}</h1>
        <div className="progress-meter" aria-label={`${completion}% completado`}>
          <span style={{ width: `${completion}%` }} />
        </div>
        <p className="rail-copy">
          {completion}% completo
        </p>
        <ol className="steps">
          {form.sections.map((section) => (
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
          <p className="eyebrow">{form.introEyebrow}</p>
          <h2>{form.introTitle}</h2>
          <p>{form.introCopy}</p>
        </section>

        {submitted ? (
          <section className="thanks-panel">
            <p className="eyebrow">Información recibida</p>
            <h3>{form.thanksTitle}</h3>
            <p>{form.thanksCopy}</p>
            {embedded ? (
              <a className="primary-button thanks-panel__action" href="/app">
                Volver a mi panel
              </a>
            ) : null}
          </section>
        ) : null}

        {form.sections.map((section) => {
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
            {isSaving ? "Guardando..." : form.submitLabel}
          </button>
        </div>
      </form>
    </main>
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
