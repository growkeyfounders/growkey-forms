import { describe, expect, it } from "vitest";
import {
  PROGRAM,
  addDays,
  currentWeek,
  expectedPhaseForDay,
  isLate,
  isValidDateIso,
  milestoneDate,
  phaseById,
  programDay,
  weekRange,
} from "../shared/program.mjs";

describe("PROGRAM config", () => {
  it("tiene 4 fases contiguas que cubren 0..120", () => {
    expect(PROGRAM.phases.map((p) => p.id)).toEqual([1, 2, 3, 4]);
    expect(PROGRAM.phases[0].startDay).toBe(0);
    expect(PROGRAM.phases[3].endDay).toBe(120);
    for (let i = 1; i < 4; i++) {
      expect(PROGRAM.phases[i].startDay).toBe(PROGRAM.phases[i - 1].endDay);
    }
  });
  it("cada fase tiene requiredForms array y baseTasks con ids únicos", () => {
    const ids = PROGRAM.phases.flatMap((p) => p.baseTasks.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const phase of PROGRAM.phases) expect(Array.isArray(phase.requiredForms)).toBe(true);
  });
});

describe("fechas", () => {
  it("programDay cuenta desde 0 el día de inicio", () => {
    expect(programDay("2026-05-12", "2026-05-12")).toBe(0);
    expect(programDay("2026-05-12", "2026-05-19")).toBe(7);
    expect(programDay("2026-05-12", "2026-06-04")).toBe(23);
  });
  it("programDay nunca es negativo", () => {
    expect(programDay("2026-05-12", "2026-05-01")).toBe(0);
  });
  it("currentWeek", () => {
    expect(currentWeek(0)).toBe(1);
    expect(currentWeek(6)).toBe(1);
    expect(currentWeek(7)).toBe(2);
    expect(currentWeek(23)).toBe(4);
  });
  it("addDays y milestoneDate", () => {
    expect(addDays("2026-05-12", 7)).toBe("2026-05-19");
    expect(addDays("2026-05-28", 5)).toBe("2026-06-02");
    expect(milestoneDate("2026-05-12", 28)).toBe("2026-06-09");
  });
  it("weekRange", () => {
    expect(weekRange("2026-05-12", 1)).toEqual({ from: "2026-05-12", to: "2026-05-18" });
    expect(weekRange("2026-05-12", 4)).toEqual({ from: "2026-06-02", to: "2026-06-08" });
  });
});

describe("isValidDateIso", () => {
  it("acepta fechas reales en formato YYYY-MM-DD", () => {
    expect(isValidDateIso("2026-06-12")).toBe(true);
    expect(isValidDateIso("2026-01-01")).toBe(true);
    expect(isValidDateIso("2024-02-29")).toBe(true); // bisiesto
  });
  it("rechaza formato inválido", () => {
    expect(isValidDateIso("")).toBe(false);
    expect(isValidDateIso("12/06/2026")).toBe(false);
    expect(isValidDateIso("2026-6-12")).toBe(false);
    expect(isValidDateIso("2026-06-12T00:00:00Z")).toBe(false);
  });
  it("rechaza fechas imposibles que sí pasan el regex", () => {
    expect(isValidDateIso("2026-99-99")).toBe(false);
    expect(isValidDateIso("2026-02-30")).toBe(false);
    expect(isValidDateIso("2025-02-29")).toBe(false); // no bisiesto
    expect(isValidDateIso("2026-00-10")).toBe(false);
    expect(isValidDateIso("2026-13-01")).toBe(false);
  });
});

describe("fases", () => {
  it("expectedPhaseForDay", () => {
    expect(expectedPhaseForDay(0).id).toBe(1);
    expect(expectedPhaseForDay(13).id).toBe(1);
    expect(expectedPhaseForDay(14).id).toBe(2);
    expect(expectedPhaseForDay(28).id).toBe(3);
    expect(expectedPhaseForDay(50).id).toBe(4);
    expect(expectedPhaseForDay(500).id).toBe(4);
  });
  it("isLate compara contra endDay de la fase ACTUAL del cliente", () => {
    expect(isLate(1, 10)).toBe(false);
    expect(isLate(1, 15)).toBe(true);
    expect(isLate(2, 20)).toBe(false);
    expect(isLate(4, 200)).toBe(true);
  });
  it("phaseById", () => {
    expect(phaseById(2).name).toBe("Blueprint");
  });
});
