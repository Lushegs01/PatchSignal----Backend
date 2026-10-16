import { describe, expect, it } from "vitest";
import { classify } from "@/lib/classify/rules";

describe("classify", () => {
  it("E1 reproduced: target fails predicted, control passes", () => {
    const r = classify(
      { role: "target", outcome: "failed", exitCode: 1, predictedAssertionFailed: true, unrelatedFailure: false },
      { role: "control", outcome: "passed", predictedAssertionFailed: false, unrelatedFailure: false }
    );
    expect(r.status).toBe("Reproduced");
  });
  it("E3 not reproduced: target passes", () => {
    const r = classify(
      { role: "target", outcome: "passed", predictedAssertionFailed: false, unrelatedFailure: false },
      null
    );
    expect(r.status).toBe("Not_reproduced");
  });
  it("E4 inconclusive: target error (missing DB)", () => {
    const r = classify(
      { role: "target", outcome: "error", predictedAssertionFailed: false, unrelatedFailure: true },
      null
    );
    expect(r.status).toBe("Inconclusive");
  });
  it("E5 inconclusive: syntax error is unrelated failure", () => {
    const r = classify(
      { role: "target", outcome: "failed", exitCode: 1, predictedAssertionFailed: false, unrelatedFailure: true },
      null
    );
    expect(r.status).toBe("Inconclusive");
  });
  it("E6 inconclusive: control also fails", () => {
    const r = classify(
      { role: "target", outcome: "failed", exitCode: 1, predictedAssertionFailed: true, unrelatedFailure: false },
      { role: "control", outcome: "failed", exitCode: 1, predictedAssertionFailed: false, unrelatedFailure: false }
    );
    expect(r.status).toBe("Inconclusive");
  });
});
