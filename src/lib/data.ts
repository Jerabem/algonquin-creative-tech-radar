/* Data layer: bundled JSON (no runtime fetch — works from any Pages path),
   relationship helpers (blueprint §2), and the localStorage project bank. */

import disciplinesJson from "../data/disciplines.json";
import programsJson from "../data/programs.json";
import technologiesJson from "../data/technologies.json";
import projectsJson from "../data/projects.json";
import type { Effort, Program, Project, ProjectStatus, Technology } from "./types";

export const disciplines: string[] = disciplinesJson;
export const programs: Program[] = programsJson as Program[];
export const technologies: Technology[] = technologiesJson as Technology[];
const seedProjects: Project[] = projectsJson as Project[];

const USER_PROJECTS_KEY = "ac-pd-user-projects";

function readUserProjects(): Project[] {
  try {
    const raw = localStorage.getItem(USER_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Project[]) : [];
  } catch {
    return [];
  }
}

export function saveUserProject(p: Project): void {
  const existing = readUserProjects();
  existing.unshift(p);
  try {
    localStorage.setItem(USER_PROJECTS_KEY, JSON.stringify(existing));
  } catch {
    /* storage full/blocked — the idea still shows for this session */
  }
}

/** Seed bank + user submissions (newest first). */
export function allProjects(): Project[] {
  return [...readUserProjects(), ...seedProjects];
}

export function getProject(id: string): Project | undefined {
  return allProjects().find((p) => p.id === id);
}

export function programById(id: string): Program | undefined {
  return programs.find((p) => p.id === id);
}

export function programByName(name: string): Program | undefined {
  return programs.find((p) => p.name === name);
}

export function techById(id: string): Technology | undefined {
  return technologies.find((t) => t.id === id);
}

export function techByName(name: string): Technology | undefined {
  return technologies.find((t) => t.name === name);
}

export function programDisciplines(p: Program): string[] {
  return [...p.disciplines, ...p.tangential];
}

/** Technologies a program could plausibly adopt (shared discipline link). */
export function adoptableTech(p: Program): Technology[] {
  const pd = new Set(programDisciplines(p));
  return technologies.filter((t) => t.disciplines.some((d) => pd.has(d)));
}

export function sharedDisciplines(a: Program, b: Program): string[] {
  const sa = new Set(programDisciplines(a));
  return programDisciplines(b).filter((d) => sa.has(d));
}

export function sharedTech(a: Program, b: Program): Technology[] {
  const ta = new Set(adoptableTech(a).map((t) => t.id));
  return adoptableTech(b).filter((t) => ta.has(t.id));
}

export type RelationKind = "strong" | "soft" | "none";

/** One-step highlight per blueprint §5: strong = shared discipline, soft = shared tech only. */
export function relationKind(a: Program, b: Program): RelationKind {
  if (a.id === b.id) return "none";
  if (sharedDisciplines(a, b).length > 0) return "strong";
  if (sharedTech(a, b).length > 0) return "soft";
  return "none";
}

export function relatedPrograms(p: Program): { program: Program; kind: RelationKind; reasons: string[] }[] {
  const out: { program: Program; kind: RelationKind; reasons: string[] }[] = [];
  for (const q of programs) {
    const kind = relationKind(p, q);
    if (kind === "none") continue;
    const reasons =
      kind === "strong"
        ? sharedDisciplines(p, q).map((d) => `shares ${d}`)
        : sharedTech(p, q)
            .slice(0, 3)
            .map((t) => `shares tech: ${t.name}`);
    out.push({ program: q, kind, reasons });
  }
  out.sort((x, y) => (x.kind === y.kind ? x.program.name.localeCompare(y.program.name) : x.kind === "strong" ? -1 : 1));
  return out;
}

export function programsForTech(t: Technology): Program[] {
  const td = new Set(t.disciplines);
  return programs.filter((p) => programDisciplines(p).some((d) => td.has(d)));
}

export function projectsForTech(name: string): Project[] {
  return allProjects().filter((p) => p.tech.includes(name));
}

export function projectsForProgram(name: string): Project[] {
  return allProjects().filter((p) => p.programs.includes(name));
}

/** A project's readiness = the lowest TRL among its tech ("weakest link", §3). */
export function projectTrl(p: Project): number {
  const trls = p.tech
    .map((n) => techByName(n)?.trl)
    .filter((t): t is number => typeof t === "number");
  return trls.length ? Math.min(...trls) : 9;
}

export function relatedProjects(p: Project): Project[] {
  return allProjects().filter(
    (q) =>
      q.id !== p.id &&
      (q.programs.some((n) => p.programs.includes(n)) || q.tech.some((n) => p.tech.includes(n))),
  );
}

export function schools(): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of programs) map.set(p.school, (map.get(p.school) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function programsInSchool(school: string): Program[] {
  return programs
    .filter((p) => p.school === school)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const SCIS_SCHOOL = "School of Creative and Interdisciplinary Studies";

export function categories(): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const t of technologies) map.set(t.category, (map.get(t.category) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const CRED_ORDER = ["Diploma", "Advanced Diploma", "Degree", "Certificate", "Graduate Certificate", "Other"];

/** Normalize the 17 spreadsheet credential strings into 5 buckets + Other. */
export function credentialBucket(credential: string): string {
  const c = credential.toLowerCase();
  if (c.includes("graduate certificate")) return "Graduate Certificate";
  if (c.includes("advanced diploma") || c.includes("bridging entry")) return "Advanced Diploma";
  if (c.includes("honours degree") || c === "degree" || c.includes("bit degree")) return "Degree";
  if (c.includes("certificate")) return "Certificate";
  if (c.includes("diploma")) return "Diploma";
  return "Other";
}

export function credentialBuckets(): string[] {
  return CRED_ORDER;
}

/** Short school names for chips and the wheel hub. */
export function shortSchool(name: string): string {
  const map: Record<string, string> = {
    "School of Creative and Interdisciplinary Studies": "Creative Studies",
    "School of Advanced Technology": "Advanced Tech",
    "School of Business & Hospitality": "Business & Hospitality",
    "School of Health Sciences": "Health Sciences",
    "School of Wellness, Public Safety & Community Studies": "Wellness & Community",
    "Police and Public Safety Institute": "Police & Public Safety",
    "Algonquin Centre for Construction Excellence (ACCE)": "Construction (ACCE)",
    ACCE: "ACCE",
    "Faculty of Arts, Media and Design": "Arts, Media & Design",
    Pembroke: "Pembroke",
    "Pembroke Campus": "Pembroke",
    "Pembroke Campus (Algonquin College in the Ottawa Valley)": "Pembroke Valley",
    "Various (see notes)": "Various",
  };
  return map[name] ?? name;
}

/** Abbreviate a program name for wheel slices, e.g. "Interactive Media Design" -> "IMD". */
export function abbrProgram(name: string): string {
  const clean = name.replace(/\([^)]*\)/g, "").trim();
  const words = clean
    .split(/[\s\-–—/]+/)
    .filter((w) => w && !/^(and|of|for|the|in|a|&)$/i.test(w));
  if (words.length <= 1) return clean.slice(0, 12);
  return words
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 6);
}

export function statusLabel(s: ProjectStatus): string {
  return s;
}

export function effortLabel(e: Effort): string {
  return e;
}

/** Auto-suggested collision prompts — blueprint §5 "Creative Collisions". */
export function collisionPrompts(a: Program, b: Program, t: Technology): string[] {
  const discA = a.disciplines[0] ?? "practice";
  const discB = b.disciplines[0] ?? "practice";
  const shortA = a.name.replace(/\s*\(.*?\)\s*/g, "");
  const shortB = b.name.replace(/\s*\(.*?\)\s*/g, "");
  return [
    `What would ${shortA} students build with ${t.name} that ${shortB} students would immediately want to steal?`,
    `Combine ${shortA}'s ${discA} with ${shortB}'s ${discB} using ${t.name} — describe the wildest weekend prototype.`,
    `Pitch night: ${t.name} as the medium for a ${shortA} × ${shortB} collaboration. Write the one-sentence logline.`,
  ];
}

/** A "wilder version" twist for a project idea. */
export function wilderTwist(p: Project): string {
  const twists = [
    "What if it had to work outdoors, in winter, with no power outlets?",
    "What if the audience became co-creators halfway through?",
    "What if it had to be built entirely from salvaged or living materials?",
    "What if it ran continuously for 24 hours with no human operator?",
    "What if two rival teams built competing versions in the same week?",
    "What if the whole thing had to fit inside a single shipping container?",
  ];
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) % twists.length;
  return twists[h];
}
