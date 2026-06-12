import { phaseById } from "../shared/program.mjs";

// Decisión pura de avance. No toca DB ni HTTP.
export function evaluateAdvance({ currentPhaseId, tasks, submittedFormSlugs }) {
  const phase = phaseById(currentPhaseId);
  const phaseTasks = tasks.filter((task) => task.phase === currentPhaseId);
  if (phaseTasks.length === 0) return { complete: false };
  if (!phaseTasks.every((task) => task.done)) return { complete: false };

  const submitted = new Set(submittedFormSlugs);
  if (!phase.requiredForms.every((slug) => submitted.has(slug))) return { complete: false };

  if (currentPhaseId >= 4) return { complete: true, programCompleted: true };
  return { complete: true, nextPhaseId: currentPhaseId + 1 };
}
