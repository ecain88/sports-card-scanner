import { formatRatio, type CenteringResult as Result } from "../lib/centering";
import { gradeVerdict } from "../lib/psa";

export function CenteringResult({ result, borderless }: { result: Result; borderless: boolean }) {
  if (borderless) {
    return (
      <div className="card">
        <span className="pill">Borderless</span>
        <p className="muted" style={{ marginTop: 10 }}>
          This looks like a borderless / full-bleed card. Standard PSA centering can't be measured
          reliably without a print frame, so no grade is shown.
        </p>
      </div>
    );
  }

  const grade = result.supportedGrade;
  const tone = grade >= 9 ? "good" : grade >= 7 ? "warn" : "bad";

  return (
    <div className="card">
      <div className={`grade ${tone}`}>PSA {grade}</div>
      <p style={{ margin: "6px 0 14px" }}>{gradeVerdict(grade)}</p>
      <div className="ratio-row">
        <span>Left / Right</span>
        <strong>{formatRatio(result.lr.leftPct, result.lr.rightPct)}</strong>
      </div>
      <div className="ratio-row">
        <span>Top / Bottom</span>
        <strong>{formatRatio(result.tb.topPct, result.tb.bottomPct)}</strong>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        Worst axis: {result.worstAxis === "leftRight" ? "left/right" : "top/bottom"} ({Math.round(result.worstLargerPct)}%)
      </p>
    </div>
  );
}
