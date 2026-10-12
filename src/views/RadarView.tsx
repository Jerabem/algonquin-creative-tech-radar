import { useMemo, useState } from "react";
import { categories, technologies } from "../lib/data";

interface RadarViewProps {
  onOpenTech: (id: string) => void;
}

const CX = 320;
const CY = 320;
const R_BASE = 64;
const R_STEP = 29; // radius grows as TRL falls: center = TRL 9

const radiusFor = (trl: number) => R_BASE + (9 - trl) * R_STEP;

function polar(r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

export function RadarView({ onOpenTech }: RadarViewProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const catList = useMemo(() => categories(), []);

  const dots = useMemo(() => {
    const byCat = new Map<string, typeof technologies>();
    for (const t of technologies) {
      const arr = byCat.get(t.category) ?? [];
      arr.push(t);
      byCat.set(t.category, arr);
    }
    const out: { x: number; y: number; tech: (typeof technologies)[number] }[] = [];
    catList.forEach((c, ci) => {
      const arr = (byCat.get(c.name) ?? []).sort((a, b) => a.name.localeCompare(b.name));
      const sectorStart = (ci / catList.length) * 360;
      const sectorW = 360 / catList.length;
      arr.forEach((t, i) => {
        const angle = sectorStart + ((i + 1) / (arr.length + 1)) * sectorW;
        const r = radiusFor(t.trl) + (i % 2 === 0 ? 5 : -5);
        const [x, y] = polar(r, angle);
        out.push({ x, y, tech: t });
      });
    });
    return out;
  }, [catList]);

  return (
    <div className="page">
      <div className="page-intro">
        <h2>Tech radar</h2>
        <p>
          Every technology plotted by readiness: the center is TRL 9 (industry standard —
          teach it as a core skill), the outer edge is TRL 1 (lab curiosity). Each wedge
          is a category. Tap a dot for the full tech page.
        </p>
      </div>

      <div className="radar-wrap">
        <svg viewBox="0 0 640 640" role="img" aria-label="Technology radar: concentric rings by Technology Readiness Level, center is TRL 9">
          {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((trl) => (
            <g key={trl}>
              <circle
                cx={CX}
                cy={CY}
                r={radiusFor(trl)}
                fill="none"
                stroke="var(--line-strong)"
                strokeWidth={1}
                strokeDasharray={trl % 2 ? "none" : "4 4"}
                opacity={0.7}
              />
              <text
                x={CX - radiusFor(trl) + 6}
                y={CY - 6}
                fontSize={11}
                fontWeight={700}
                fill="var(--ink-soft)"
              >
                TRL {trl}
              </text>
            </g>
          ))}
          {dots.map(({ x, y, tech }) => {
            const dim = activeCategory && tech.category !== activeCategory;
            return (
              <g
                key={tech.id}
                className="radar-dot"
                opacity={dim ? 0.15 : 1}
                onClick={() => onOpenTech(tech.id)}
                role="button"
                tabIndex={0}
                aria-label={`${tech.name}, TRL ${tech.trl}, ${tech.category}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenTech(tech.id);
                  }
                }}
              >
                <circle cx={x} cy={y} r={9} fill="transparent" />
                <circle cx={x} cy={y} r={4.5} fill="var(--trl-filled)" stroke="var(--bg)" strokeWidth={1.5}>
                  <title>{`${tech.name} — TRL ${tech.trl}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>

      <h3>Categories</h3>
      <div className="school-chips" role="group" aria-label="Highlight a category">
        <button
          className="school-chip"
          aria-pressed={activeCategory === null}
          onClick={() => setActiveCategory(null)}
        >
          All
        </button>
        {catList.map((c) => (
          <button
            key={c.name}
            className="school-chip"
            aria-pressed={activeCategory === c.name}
            onClick={() => setActiveCategory(activeCategory === c.name ? null : c.name)}
          >
            {c.name} · {c.count}
          </button>
        ))}
      </div>
      <p className="reason">
        TRL bands in this dataset: 9 (proven) · 7 (operational prototype) · 5 (validated in
        a studio-like setting) · 3 (proof of concept). Ratings are a v1 approximation —
        see the README.
      </p>
    </div>
  );
}
