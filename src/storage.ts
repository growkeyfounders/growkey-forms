import { OFFER_SLUG, ONBOARDING_SLUG, type FormValues } from "./formSchema";

const STORAGE_KEY = "client-intake:submissions";
export const FORM_SLUG = OFFER_SLUG;

export type Submission = {
  id: string;
  createdAt: string;
  values: FormValues;
  score: number;
  stage: string;
};

export async function loadSubmissions(formSlug: string | null = FORM_SLUG): Promise<Submission[]> {
  try {
    const response = await fetch(formSlug ? `/api/submissions?form=${formSlug}` : "/api/submissions");
    if (response.ok) return (await response.json()) as Submission[];
  } catch {
    // Local fallback for pure static previews.
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Submission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSubmission(submission: Submission, formSlug = FORM_SLUG): Promise<Submission> {
  const submissionWithForm = {
    ...submission,
    values: {
      ...submission.values,
      formSlug,
    },
  };

  let authHeader: Record<string, string> = {};
  try {
    const { supabase } = await import("./supabaseClient");
    const { data } = await supabase.auth.getSession();
    if (data.session) authHeader = { Authorization: `Bearer ${data.session.access_token}` };
  } catch { /* formulario público sin supabase configurado */ }

  try {
    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify(submissionWithForm),
    });
    if (response.ok) return (await response.json()) as Submission;
  } catch {
    // Local fallback for pure static previews.
  }

  const current = await loadSubmissions();
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([submissionWithForm, ...current]),
  );
  return submissionWithForm;
}

export async function clearSubmissions() {
  try {
    const response = await fetch("/api/submissions", { method: "DELETE" });
    if (response.ok) return;
  } catch {
    // Local fallback for pure static previews.
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function exportJson(submissions: Submission[]) {
  download(
    "client-intake-submissions.json",
    JSON.stringify(submissions, null, 2),
    "application/json",
  );
}

function download(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildScore(values: FormValues, formSlug = FORM_SLUG) {
  if (formSlug === ONBOARDING_SLUG) return buildOnboardingScore(values);
  return buildOfferScore(values);
}

function buildOfferScore(values: FormValues) {
  let score = 0;
  const avatarDepth = String(values.avatarNiche || "").trim().length > 24 ? 14 : 6;
  const opportunityDepth = String(values.newOpportunity || "").trim().length > 40 ? 16 : 7;
  const mechanismDepth = String(values.uniqueMechanism || "").trim().length > 24 ? 12 : 5;
  const desiresDepth = String(values.avatarDesires || "").trim().length > 80 ? 15 : 7;
  const problemsDepth = String(values.avatarProblems || "").trim().length > 80 ? 15 : 7;
  const offerDepth = String(values.offerStatement || "").trim().length > 60 ? 16 : 7;
  const differentiationDepth = String(values.differentiation || "").trim().length > 80 ? 12 : 5;
  const competitors = Array.from({ length: 10 }, (_, index) =>
    String(values[`competitor${index + 1}`] || "").trim(),
  ).filter(Boolean).length;

  score += avatarDepth;
  score += opportunityDepth;
  score += mechanismDepth;
  score += desiresDepth;
  score += problemsDepth;
  score += offerDepth;
  score += differentiationDepth;
  score += Math.min(10, competitors);

  const normalized = Math.max(0, Math.min(100, score));
  return {
    score: normalized,
    stage:
      normalized >= 75
        ? "Oferta con buen material base"
        : normalized >= 50
          ? "Oferta lista para feedback"
          : "Oferta necesita más detalle",
  };
}

function buildOnboardingScore(values: FormValues) {
  let score = 0;
  const problemClarity = Number(values.problemClarity || 0);
  const differentiator = values.differentiator === "Sí" ? 18 : 8;
  const hasPitch = String(values.elevatorPitch || "").trim().length > 24 ? 16 : 6;
  const hasRevenue = Number(values.lastMonthRevenue || 0) > 0 ? 12 : 0;
  const hasTicket = Number(values.ticket || 0) > 0 ? 10 : 0;
  const goalsDepth = String(values.goals || "").trim().length > 40 ? 12 : 5;
  const clarityCount = Array.isArray(values.clarity) ? values.clarity.length : 0;
  const challengesCount = Array.isArray(values.challenges) ? values.challenges.length : 0;

  score += problemClarity * 6;
  score += differentiator;
  score += hasPitch;
  score += hasRevenue;
  score += hasTicket;
  score += goalsDepth;
  score += Math.max(0, 10 - clarityCount * 2);
  score += Math.max(0, 8 - challengesCount);

  const normalized = Math.max(0, Math.min(100, score));
  return {
    score: normalized,
    stage:
      normalized >= 75
        ? "Listo/a para acelerar"
        : normalized >= 50
          ? "Necesita foco estratégico"
          : "Requiere diagnóstico profundo",
  };
}
