import { TRL_INFO } from "../lib/types";

/** 9-segment TRL bar — reused on every tech and project. */
export function TrlBar({ trl, showLabel = true }: { trl: number; showLabel?: boolean }) {
  const info = TRL_INFO[trl];
  return (
    <span className="trl-wrap" title={info ? `${trl} — ${info.name}: ${info.description}` : `TRL ${trl}`}>
      <span className="trl-bar" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={i < trl ? "trl-seg filled" : "trl-seg"} />
        ))}
      </span>
      {showLabel && (
        <span className="trl-label">
          TRL {trl}
          <span className="sr-only">{info ? ` — ${info.name}` : ""}</span>
        </span>
      )}
    </span>
  );
}

/** Plain-language TRL explainer shown on tech detail pages. */
export function TrlExplainer({ trl }: { trl: number }) {
  const info = TRL_INFO[trl];
  if (!info) return null;
  return (
    <p className="reason">
      <strong>
        TRL {trl} — {info.name}.
      </strong>{" "}
      {info.description}
    </p>
  );
}
