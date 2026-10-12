import { useMemo } from "react";
import { abbrProgram, shortSchool } from "../lib/data";
import type { Program } from "../lib/types";

export type RelKind = "strong" | "soft";

interface WheelSvgProps {
  programs: Program[];
  /** All-mode: schools with their programs for the inner ring. */
  schoolRings?: { name: string; programs: Program[] }[];
  mode: "school" | "all";
  selectedId: string | null;
  related: Map<string, RelKind>;
  onSelect: (id: string | null) => void;
  onSchoolClick?: (school: string) => void;
  rotationDeg?: number;
  spinning?: boolean;
  pointer?: boolean;
  hubLabel: string;
  hubSub?: string;
  /** Bottom hub caption override (defaults to `${programs.length} programs`). */
  hubCountLabel?: string;
}

const CX = 320;
const CY = 320;
const R_OUT = 300;
// Pizza-style: slices run from near the center outward; the hub circle sits on top.
const R_IN = 16;
const HUB_R = 88;
// All-mode radii
const R_SCH_IN = 16;
const R_SCH_OUT = 168;
const R_PRG_IN = 180;
const R_PRG_OUT = 300;

function polar(r: number, angleDeg: number): [number, number] {
  // 0deg = 12 o'clock, increasing clockwise
  const a = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

function wedgePath(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${x0.toFixed(2)} ${y0.toFixed(2)}`,
    `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${x0.toFixed(2)} ${y0.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function sliceFill(state: "selected" | "strong" | "soft" | "dim" | "plain", alt: boolean): string {
  switch (state) {
    case "selected":
      return "var(--wheel-selected)";
    case "strong":
      return "var(--wheel-related)";
    case "soft":
      return "var(--wheel-related-soft)";
    case "dim":
      return "var(--wheel-dim)";
    default:
      return alt ? "var(--wheel-unselected-b)" : "var(--wheel-unselected-a)";
  }
}

function sliceLabelFill(state: "selected" | "strong" | "soft" | "dim" | "plain"): string {  switch (state) {
    case "selected":
      return "var(--wheel-selected-label)";
    case "strong":
      return "var(--wheel-related-label)";
    case "soft":
      return "var(--wheel-related-soft-label)";
    case "dim":
      return "var(--wheel-dim-label)";
    default:
      return "var(--wheel-label)";
  }
}

interface SliceGeom {
  program: Program;
  path: string;
  labelR: number;
  mid: number;
  showLabel: boolean;
}

export function WheelSvg(props: WheelSvgProps) {
  const {
    programs,
    schoolRings,
    mode,
    selectedId,
    related,
    onSelect,
    onSchoolClick,
    rotationDeg = 0,
    spinning = false,
    pointer = false,
    hubLabel,
    hubSub,
    hubCountLabel,
  } = props;

  const hasSelection = selectedId !== null;

  const stateOf = (id: string): "selected" | "strong" | "soft" | "dim" | "plain" => {
    if (id === selectedId) return "selected";
    if (!hasSelection) return "plain";
    const k = related.get(id);
    if (k === "strong") return "strong";
    if (k === "soft") return "soft";
    return "dim";
  };

  const slices = useMemo(() => {
    if (mode === "school" || !schoolRings) {
      const n = programs.length;
      const step = 360 / n;
      return programs.map((p, i) => ({
        program: p,
        path: wedgePath(R_IN, R_OUT, i * step, (i + 1) * step),
        labelR: (R_IN + R_OUT) / 2,
        mid: (i + 0.5) * step,
        showLabel: true,
      }));
    }
    // All mode: outer ring = programs grouped by school, angle proportional to count
    const total = schoolRings.reduce((s, r) => s + r.programs.length, 0);
    const out: SliceGeom[] = [];
    let acc = 0;
    for (const ring of schoolRings) {
      const span = (ring.programs.length / total) * 360;
      const step = span / ring.programs.length;
      ring.programs.forEach((p, i) => {
        const a0 = acc + i * step;
        out.push({
          program: p,
          path: wedgePath(R_PRG_IN, R_PRG_OUT, a0, a0 + step),
          labelR: (R_PRG_IN + R_PRG_OUT) / 2,
          mid: a0 + step / 2,
          showLabel: step >= 3.5,
        });
      });
      acc += span;
    }
    return out;
  }, [programs, schoolRings, mode]);

  const schoolWedges = useMemo(() => {
    if (mode !== "all" || !schoolRings) return [];
    const total = schoolRings.reduce((s, r) => s + r.programs.length, 0);
    let acc = 0;
    return schoolRings.map((ring) => {
      const span = (ring.programs.length / total) * 360;
      const w = {
        name: ring.name,
        path: wedgePath(R_SCH_IN, R_SCH_OUT, acc, acc + span),
        labelR: (R_SCH_IN + R_SCH_OUT) / 2,
        mid: acc + span / 2,
        showLabel: span >= 8,
      };
      acc += span;
      return w;
    });
  }, [schoolRings, mode]);

  const spinGroupStyle: React.CSSProperties = {
    transform: `rotate(${rotationDeg}deg)`,
    transformOrigin: `${CX}px ${CY}px`,
    transition: spinning ? "transform 2.4s cubic-bezier(0.12, 0.8, 0.18, 1)" : "none",
  };

  return (
    <div className="wheel-wrap">
      <svg
        viewBox="0 0 640 640"
        role="img"
        aria-label={
          hasSelection
            ? `Program wheel. ${programs.find((p) => p.id === selectedId)?.name ?? ""} selected; related programs highlighted.`
            : "Program wheel. Select a program slice to see related programs."
        }
      >
        {pointer && (
          <g className="spin-pointer" aria-hidden="true">
            <path d={`M ${CX - 14} 6 L ${CX + 14} 6 L ${CX} 30 Z`} fill="var(--go)" stroke="#fff" strokeWidth="2" />
          </g>
        )}
        <g style={spinGroupStyle}>
          {schoolWedges.map((w, i) => {
            const [lx, ly] = polar(w.labelR, w.mid);
            return (
              <g
                key={w.name}
                className="wheel-slice"
                onClick={() => onSchoolClick?.(w.name)}
                role={onSchoolClick ? "button" : undefined}
                tabIndex={onSchoolClick ? 0 : undefined}
                aria-label={onSchoolClick ? `${shortSchool(w.name)} school` : undefined}
                onKeyDown={(e) => {
                  if (onSchoolClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSchoolClick(w.name);
                  }
                }}
              >
                <path
                  d={w.path}
                  fill={i % 2 ? "var(--wheel-unselected-b)" : "var(--wheel-unselected-a)"}
                  stroke="var(--line)"
                  strokeWidth={2.5}
                />
                {w.showLabel && (
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={700}
                    fill="var(--wheel-label)"
                    style={{ pointerEvents: "none" }}
                  >
                    {shortSchool(w.name)}
                  </text>
                )}
              </g>
            );
          })}
          {slices.map(({ program, path, labelR, mid, showLabel }, i) => {
            const st = stateOf(program.id);
            const [lx, ly] = polar(labelR, mid);
            const label = abbrProgram(program.name);
            return (
              <g
                key={program.id}
                className="wheel-slice"
                onClick={() => onSelect(program.id === selectedId ? null : program.id)}
                role="button"
                tabIndex={0}
                aria-label={`${program.name}${st === "selected" ? ", selected" : ""}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(program.id === selectedId ? null : program.id);
                  }
                }}
              >
                <path d={path} fill={sliceFill(st, i % 2 === 1)} stroke="var(--line)" strokeWidth={2.5}>
                  <title>{program.name}</title>
                </path>
                {showLabel && (
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={mode === "all" ? 8 : 12}
                    fontWeight={700}
                    fill={sliceLabelFill(st)}
                    style={{ pointerEvents: "none" }}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        {/* Center hub — tap to reset */}
        <g
          className="wheel-slice"
          onClick={() => onSelect(null)}
          role="button"
          tabIndex={0}
          aria-label="Reset wheel selection"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(null);
            }
          }}
        >
          <circle cx={CX} cy={CY} r={HUB_R} fill="var(--wheel-hub)" stroke="var(--line)" strokeWidth={1.5} />
          <text
            x={CX}
            y={hubSub ? CY - 10 : CY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={15}
            fontWeight={800}
            fill="var(--wheel-hub-label)"
            style={{ pointerEvents: "none" }}
          >
            {hubLabel}
          </text>
          {hubSub && (
            <text
              x={CX}
              y={CY + 14}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fill="var(--wheel-hub-label)"
              opacity={0.85}
              style={{ pointerEvents: "none" }}
            >
              {hubSub}
            </text>
          )}
          <text
            x={CX}
            y={CY + (hubSub ? 32 : 20)}
            textAnchor="middle"
            fontSize={10}
            fill="var(--wheel-hub-label)"
            opacity={0.75}
            style={{ pointerEvents: "none" }}
          >
            {hasSelection ? "tap to reset" : (hubCountLabel ?? `${programs.length} programs`)}
          </text>
        </g>
      </svg>
    </div>
  );
}
