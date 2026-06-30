import { describe, it, expect } from "vitest";
import { supportedPsaGrade, gradeVerdict, FLOOR_GRADE } from "./psa";

describe("supportedPsaGrade (front)", () => {
  it.each([
    [50, 10],
    [55, 10],
    [56, 9],
    [60, 9],
    [65, 8],
    [70, 7],
    [80, 6],
    [85, 5],
    [86, FLOOR_GRADE],
    [100, FLOOR_GRADE],
  ])("%i%% larger-side -> PSA %i", (pct, grade) => {
    expect(supportedPsaGrade(pct, "front")).toBe(grade);
  });

  it("clamps below 50 to PSA 10", () => {
    expect(supportedPsaGrade(40)).toBe(10);
  });

  it("non-finite input returns the floor grade", () => {
    expect(supportedPsaGrade(Number.NaN)).toBe(FLOOR_GRADE);
  });
});

describe("supportedPsaGrade (back)", () => {
  it("uses looser back tolerances", () => {
    expect(supportedPsaGrade(75, "back")).toBe(10);
    expect(supportedPsaGrade(80, "back")).toBe(9);
  });
});

describe("gradeVerdict", () => {
  it("describes the grade in words", () => {
    expect(gradeVerdict(10)).toMatch(/PSA 10/);
    expect(gradeVerdict(8)).toMatch(/up to PSA 8/);
    expect(gradeVerdict(FLOOR_GRADE)).toMatch(/caps/);
  });
});
