import { describe, expect, it } from "vitest";
import { demoScenarios } from "./scenarios";
import { verdictFor } from "./seed";

const verdict = (id: string) => verdictFor(demoScenarios.find((s) => s.id === id)!);

describe("demo seed verdicts come from classify() over captured runs", () => {
  it("reproduces the plus-sign bug: target fails as predicted, control passes", () => {
    expect(verdict("inv_demo0001")).toMatchObject({ status: "Reproduced", rule: "CLS-2" });
    expect(verdict("inv_demo0002")).toMatchObject({ status: "Reproduced", rule: "CLS-2" });
  });

  it("reproduces without a control run and says so", () => {
    expect(verdict("inv_demo0003")?.justification).toContain("no control ran");
  });

  it("marks a passing target Not reproduced", () => {
    expect(verdict("inv_demo0004")).toMatchObject({ status: "Not_reproduced", rule: "CLS-3" });
  });

  it("never treats a module-load failure or a timeout as reproduction", () => {
    expect(verdict("inv_demo0005")).toMatchObject({ status: "Inconclusive", rule: "CLS-4" });
    expect(verdict("inv_demo0006")).toMatchObject({ status: "Inconclusive", rule: "CLS-4" });
  });

  it("leaves in-progress investigations without a verdict", () => {
    for (const id of ["inv_demo0007", "inv_demo0008", "inv_demo0009"]) expect(verdict(id)).toBeNull();
  });
});
