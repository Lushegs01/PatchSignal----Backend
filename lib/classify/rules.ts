// Deterministic classification. Model may explain, never set status.
export type RunOutcome = "passed" | "failed" | "error" | "timeout";
export type Status = "Reproduced" | "Not_reproduced" | "Inconclusive";

export type ClassifiableRun = {
  role: "target" | "control";
  outcome: RunOutcome;
  exitCode?: number | null;
  predictedAssertionFailed: boolean; // did it fail the way the hypothesis predicted?
  unrelatedFailure: boolean; // failed for a different reason / compile error / setup error
  stdout?: string;
};

export function classify(
  target: ClassifiableRun | null,
  control: ClassifiableRun | null
): { status: Status; rule: string; justification: string } {
  if (!target || target.outcome === "error" || target.outcome === "timeout" || target.unrelatedFailure) {
    return {
      status: "Inconclusive",
      rule: "CLS-4",
      justification: `Target run ${!target ? "missing" : target.outcome}${
        target?.unrelatedFailure ? " (unrelated/compile/setup failure)" : ""
      }; cannot answer. Not evidence of absence.`,
    };
  }
  if (control && (control.outcome === "error" || control.outcome === "timeout" || control.unrelatedFailure)) {
    return {
      status: "Inconclusive",
      rule: "CLS-4",
      justification: "Control run errored; discrimination unproven.",
    };
  }
  if (target.outcome === "failed" && target.predictedAssertionFailed && !target.unrelatedFailure) {
    if (!control || control.outcome === "passed") {
      return {
        status: "Reproduced",
        rule: "CLS-2",
        justification: `Target failed with predicted assertion (exit ${target.exitCode ?? "?"}); ${
          control ? "control passed — test discriminates." : "no control ran; target evidence only."
        }`,
      };
    }
    return {
      status: "Inconclusive",
      rule: "CLS-4",
      justification: "Target failed as predicted but control also failed — unrelated breakage suspected.",
    };
  }
  if (target.outcome === "passed") {
    return {
      status: "Not_reproduced",
      rule: "CLS-3",
      justification: "Test ran and passed on target; this does not prove the bug is absent.",
    };
  }
  return { status: "Inconclusive", rule: "CLS-4", justification: "Unmatched outcome; marked Inconclusive by default." };
}
