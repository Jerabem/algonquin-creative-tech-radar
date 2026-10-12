# Project Discovery — Algonquin College

A visual, playful discovery tool for finding **interdisciplinary project ideas**
across Algonquin College programs. It maps **programs ↔ disciplines ↔
technologies**, scores every technology on NASA's 1–9 Tech Readiness scale, and
holds a growing bank of project ideas that faculty and students can browse,
filter, and contribute to.

Built from a seed spreadsheet of **234 programs** and **139 creative
technologies**, plus the 12 seed project ideas from the original brief.

**Live site (after deploy):** `https://<your-github-username>.github.io/algonquin-creative-tech-radar/`

---

## Quick start

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build -> dist/
npm run preview  # serve the production build locally
npm run data     # re-run the spreadsheet -> JSON data pipeline
```

Node 20+ recommended (built with Node 24).

---

## What it does — the six views

1. **The Wheel** — the app opens here. Each slice is a program (default: the 18
   School of Creative and Interdisciplinary Studies programs; switch schools with
   the chips, or pick **All schools** for concentric school/program rings). Tap a
   slice for a one-step highlight: programs sharing a discipline glow strong,
   programs linked only through a shared technology glow softer, everything else
   dims. The detail panel explains *why* each program is highlighted. Tap the
   center hub (or the slice again) to reset. A list fallback is included for
   screen readers.
2. **Creative Collisions** — the slot machine. Hit **Collide**: the wheel spins
   for Program A, spins again for a different Program B, then a technology card
   is drawn. You get the pair, their shared disciplines, the combined TRL, and
   three auto-suggested project prompts. Lock A, B, or the tech and re-spin the
   rest. Promising collisions can be saved as draft ideas.
3. **Browse & filter** — searchable cards for programs, technologies, and project
   ideas, with filters for school, credential, discipline, TRL range, category,
   effort, and status.
4. **Tech radar** — technologies on concentric TRL rings (center = TRL 9,
   proven; outer = TRL 1, lab curiosity), grouped into category wedges. The
   single best "what's coming" view.
5. **Detail pages** — every program, technology, and project idea has a full
   relationship page (e.g. from a tech: which programs could use it, which
   projects already do).
6. **Submit an idea** — a form that writes to the project bank (localStorage for
   now; a real backend later). New ideas appear immediately with status `seed`.

A project's overall readiness is the **lowest TRL among its tech** — a chain is
only as strong as its weakest link.

---

## Data pipeline

The app ships with its data **bundled** (imported JSON, no runtime fetch), so it
works from any path on GitHub Pages.

```
Algonquin_College_Programs_and_Creative_Tech.xlsx   (seed spreadsheet — not in this repo)
        │  scripts/build-data.py  (python3, needs openpyxl)
        ▼
src/data/programs.json       234 programs  (+ disciplines[] / tangential[])
src/data/technologies.json   139 technologies (+ trl, disciplines[])
src/data/disciplines.json    20-term controlled vocabulary
src/data/projects.json       12 seed project ideas
```

**Re-running after editing the spreadsheet:**

```bash
# point --xlsx at your edited copy (default is the original location)
python3 scripts/build-data.py --xlsx /path/to/edited.xlsx
git add src/data && git commit -m "data: refresh from spreadsheet"
npm run build
```

The script prints a coverage report: TRL distribution, how many tech tags came
from "Relevant disciplines" vs fallback fields, how many programs needed the
school-level fallback, and any seed-project name that failed to match (it exits
non-zero if counts or references are wrong).

### v1 approximations to refine

These are deliberate, documented shortcuts — the places where a human pass adds
the most value:

- **TRL mapping** is deterministic from the spreadsheet's Maturity column:
  `Experimental*` → 3, `Emerging*` → 5, `Just-commercialized*` → 7,
  `Established*` → 9 (including the "Established (niche)" variants). The
  blueprint suggests per-entry judgment within those bands (e.g. Experimental →
  1–4). Note some project TRLs therefore differ from the blueprint's hand-rated
  values — e.g. "The One-Person Studio" computes to TRL 5 here vs 7 in the
  brief, because "Generative video" is tagged Emerging → 5.
- **Discipline tagging** is keyword matching: tech tags come from the "Relevant
  disciplines" text (falling back to Description, then Category) mapped onto the
  20-term vocabulary; program tags come from program-name + school keywords,
  with a school-level default as a last resort (58 of 234 programs, mostly
  health/wellness/environmental programs where `education`/`events` is the
  honest fit). Unmatched text is dropped, never invented. The script logs every
  fallback so you can audit and hand-tune `scripts/build-data.py`.
- **Seed project tech references** were fuzzy-matched to exact technology names
  (all 12 resolved; explicit alias table in the script).

---

## Deploying to GitHub Pages

1. Create the repo **named exactly `algonquin-creative-tech-radar`** on GitHub
   (the `base: '/algonquin-creative-tech-radar/'` in `vite.config.ts` must match
   the repo name — rename the repo and you must update it).
2. Push this repo's `main` branch. (No remote is configured here — pushing
   happens from a machine with your GitHub connection.)
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys
   `dist/` to Pages on every push to `main`.
4. In the GitHub repo: **Settings → Pages → Source: GitHub Actions** (first
   run only).
5. Live at `https://<username>.github.io/algonquin-creative-tech-radar/`.

---

## Continuing in Codex / Claude Code

This repo is built to be handed off:

- **Spec:** the full build blueprint lives outside this repo at
  `~/workspace/goals/algonquin-college-program-tech-mapping-dashboard/files/Algonquin_Project_Discovery_App_Blueprint.md`
  (§1 data model, §2 relationship map, §3 TRL scale, §4 seed ideas, §5 views,
  §7 design system). Paste it as context along with the spreadsheet.
- **Stack:** Vite + React + TypeScript, no router (in-app view state keeps the
  Pages deploy trivial), hand-rolled SVG wheel (no d3). Deps: `react`,
  `react-dom`, `vite`, `typescript` (+ `@types/*`).
- **Where things live:** `src/views/` (one file per view, built in blueprint §5
  order), `src/components/` (WheelSvg, TrlBar, Chips, Cards, Icons),
  `src/lib/data.ts` (all relationship logic), `src/theme.css` (brand tokens).
- **Suggested next work** (blueprint §8): course-level mapping (which courses
  touch which tech), lab/equipment inventory (own vs need — turns the radar
  into a procurement roadmap), industry partners per tech, and a quarterly
  TRL re-rating ritual.

### Typography

The brand primary face is **Metropolis** (licensed) with **Freight Display Pro**
for hero headlines only. Neither is bundled — the app ships the brand-sanctioned
fallback stack (Arial). To add Metropolis: request the files from the AC
Marketing and Recruitment Department, drop the woff2 files in
`src/assets/fonts/`, add an `@font-face` block in `src/theme.css`, and prepend
`Metropolis` to `--font-stack`.

### Logo

Per brand standards the official wordmark artwork must come from Marketing —
it is intentionally **not** recreated here (no redrawn/recolored logo). The
header uses a text wordmark; swap in the official SVG (min 72px on screen,
clear space = height of the "A") and the reverse (white) version for dark mode
when you have the artwork.

### Design rules respected

- Exact hex tokens from Visual Identity Standards v2.2, pp. 34–35.
- Only brand-approved text combinations (e.g. white on Algonquin Green,
  charcoal on white); no New Growth Green on green/charcoal; no grey text on
  dark surfaces (dark-mode soft text uses the green tint `#E5EFEC`).
- Light mode default; dark mode derived; OS `prefers-color-scheme` default;
  header toggle; choice persisted in localStorage; animated transition.
- No emojis in the UI — inline SVG icon set.

---

## Project structure

```
├── scripts/build-data.py      # xlsx -> src/data/*.json pipeline
├── src/
│   ├── data/                  # generated JSON (checked in)
│   ├── lib/                   # types, data + relationship helpers, theme
│   ├── components/            # WheelSvg, TrlBar, Chips, Cards, Icons
│   ├── views/                 # Wheel, Collisions, Browse, Radar,
│   │                          #   Submit, ProjectDetail, ProgramDetail, TechDetail
│   ├── App.tsx                # header/nav/view-state shell
│   ├── theme.css              # brand design tokens (light + dark)
│   └── index.css              # layout + component styles
├── .github/workflows/deploy.yml
└── vite.config.ts             # base must match the GitHub repo name
```

## License note

Seed data was compiled from public sources (October 2026) for exploration. Not
an official Algonquin College catalogue.
