import { describe, expect, it } from "vitest";
import { evaluateAdvance } from "../server/engine.mjs";

const tasks = (phase, dones) => dones.map((done, i) => ({ id: `x${i}`, phase, done }));

describe("evaluateAdvance", () => {
  it("no avanza si falta una tarea", () => {
    expect(
      evaluateAdvance({ currentPhaseId: 2, tasks: tasks(2, [true, false]), submittedFormSlugs: [] }),
    ).toEqual({ complete: false });
  });
  it("la fase 1 avanza solo con tareas: el programa no exige formularios", () => {
    // Agentic Sail avanza por entregables/tareas, no por formularios (requiredForms vacío).
    expect(
      evaluateAdvance({
        currentPhaseId: 1,
        tasks: tasks(1, [true, true]),
        submittedFormSlugs: [],
      }),
    ).toEqual({ complete: true, nextPhaseId: 2 });
  });
  it("avanza cuando todas las tareas de la fase están completas", () => {
    expect(
      evaluateAdvance({
        currentPhaseId: 1,
        tasks: tasks(1, [true, true, true]),
        submittedFormSlugs: [],
      }),
    ).toEqual({ complete: true, nextPhaseId: 2 });
  });
  it("ignora tareas de otras fases", () => {
    const mixed = [...tasks(2, [true, true]), ...tasks(3, [false])];
    expect(evaluateAdvance({ currentPhaseId: 2, tasks: mixed, submittedFormSlugs: [] })).toEqual({
      complete: true,
      nextPhaseId: 3,
    });
  });
  it("fase 4 completa → programa completado", () => {
    expect(
      evaluateAdvance({ currentPhaseId: 4, tasks: tasks(4, [true]), submittedFormSlugs: [] }),
    ).toEqual({ complete: true, programCompleted: true });
  });
  it("sin tareas materializadas no está completa", () => {
    expect(evaluateAdvance({ currentPhaseId: 3, tasks: [], submittedFormSlugs: [] })).toEqual({
      complete: false,
    });
  });
});
