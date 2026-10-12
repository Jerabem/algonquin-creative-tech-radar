#!/usr/bin/env python3
"""Build the app's JSON data files from the seed spreadsheet.

Reads:
    ../goals/algonquin-college-program-tech-mapping-dashboard/files/Algonquin_College_Programs_and_Creative_Tech.xlsx
    (override with --xlsx)

Writes (checked into the repo):
    src/data/programs.json
    src/data/technologies.json
    src/data/disciplines.json
    src/data/projects.json

v1 approximations (documented in README; J can refine):
  * TRL is a deterministic mapping of the spreadsheet's Maturity column:
        Experimental*      -> 3
        Emerging*           -> 5
        Just-commercialized*-> 7
        Established*        -> 9
    ("Established (niche)" and friends count as Established.)
  * Technology disciplines come from keyword matching the
    "Relevant disciplines" text (falling back to Description, then
    Category) onto the 20-term controlled vocabulary in §2 of the
    blueprint. Unmatched text is dropped (never invented).
  * Program disciplines come from keyword matching the program name +
    school onto the vocabulary, with a school-level default as a last
    resort so nothing is untagged.
  * Seed projects (§4 of the blueprint) reference programs/tech by name;
    tech names are fuzzy-matched against technologies.json and every
    miss is reported below.

Run:  python3 scripts/build-data.py   (or `npm run data`)
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from collections import Counter
from pathlib import Path

import openpyxl

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DEFAULT_XLSX = (
    Path.home()
    / "workspace/goals/algonquin-college-program-tech-mapping-dashboard/files"
    / "Algonquin_College_Programs_and_Creative_Tech.xlsx"
)
OUT = ROOT / "src" / "data"

# ----------------------------------------------------------------------------
# Controlled vocabulary — blueprint §2 (keep short and stable)
# ----------------------------------------------------------------------------
DISCIPLINES = [
    "film & video",
    "animation",
    "game design",
    "graphic design",
    "illustration",
    "photography",
    "interaction design",
    "interior design",
    "architecture",
    "fashion & textiles",
    "music & audio",
    "theatre & performance",
    "writing & publishing",
    "marketing & PR",
    "exhibition & curation",
    "craft & fabrication",
    "journalism",
    "education",
    "heritage & museums",
    "events",
]

# Tangential adjacency: which disciplines sit next to which (blueprint §2
# "tangential discipline" idea). Used to propose tangential[] tags.
ADJACENT = {
    "film & video": ["animation", "music & audio", "photography"],
    "animation": ["illustration", "game design", "film & video"],
    "game design": ["animation", "interaction design", "illustration"],
    "graphic design": ["illustration", "marketing & PR", "interaction design"],
    "illustration": ["animation", "graphic design", "writing & publishing"],
    "photography": ["film & video", "journalism", "exhibition & curation"],
    "interaction design": ["graphic design", "game design", "exhibition & curation"],
    "interior design": ["architecture", "craft & fabrication", "exhibition & curation"],
    "architecture": ["interior design", "craft & fabrication", "heritage & museums"],
    "fashion & textiles": ["craft & fabrication", "marketing & PR", "photography"],
    "music & audio": ["film & video", "theatre & performance", "interaction design"],
    "theatre & performance": ["music & audio", "events", "film & video"],
    "writing & publishing": ["journalism", "graphic design", "marketing & PR"],
    "marketing & PR": ["events", "graphic design", "writing & publishing"],
    "exhibition & curation": ["heritage & museums", "interior design", "graphic design"],
    "craft & fabrication": ["architecture", "interior design", "fashion & textiles"],
    "journalism": ["writing & publishing", "film & video", "photography"],
    "education": ["events", "writing & publishing", "theatre & performance"],
    "heritage & museums": ["exhibition & curation", "architecture", "craft & fabrication"],
    "events": ["marketing & PR", "theatre & performance", "music & audio"],
}

# ----------------------------------------------------------------------------
# Maturity -> TRL (deterministic v1 mapping; see module docstring)
# ----------------------------------------------------------------------------
def maturity_to_trl(maturity: str | None) -> tuple[int, str]:
    m = (maturity or "").strip().lower()
    if m.startswith("experimental"):
        return 3, "Experimental* -> 3"
    if m.startswith("emerging"):
        return 5, "Emerging* -> 5"
    if m.startswith("just-commercialized"):
        return 7, "Just-commercialized* -> 7"
    if m.startswith("established"):
        return 9, "Established* -> 9"
    return 5, "unknown maturity -> 5 (flagged)"


# ----------------------------------------------------------------------------
# Tech discipline tagging: keyword map over "Relevant disciplines" text
# ----------------------------------------------------------------------------
# Ordered: earlier entries win on overlapping substrings (e.g. "branding"
# belongs to graphic design, not the marketing "brand" rule below it).
TECH_KEYWORDS: list[tuple[str, list[str]]] = [
    ("film & video", ["film", "cinema", "cinematography", "vfx", "broadcast", "documentary", "screen", "video"]),
    ("animation", ["animation", "anime"]),
    ("game design", ["game", "gaming", "esports", "npc"]),
    ("graphic design", ["graphic design", "branding", "logo", "typography", "poster", "motion graphics"]),
    ("illustration", ["illustrat", "drawing", "character design", "comic", "concept art"]),
    ("photography", ["photo", "photogrammetry", "lidar"]),
    ("interaction design", ["interaction", "interactive", "ux", "user experience", "\bui\b", "web design",
                             "mobile app", "ar", "vr", "xr", "immersive", "projection", "kinect"]),
    ("interior design", ["interior", "archviz"]),
    ("architecture", ["architect", "building", "construction", "bim", "urban"]),
    ("fashion & textiles", ["fashion", "textile", "garment", "knit", "weav", "dye", "apparel", "embroidery",
                             "wearable", "e-textile", "smart textile", "fibre", "fiber", "sneaker"]),
    ("music & audio", ["music", "audio", "sound", "binaural", "ambisonic", "podcast", "recording"]),
    ("theatre & performance", ["theatre", "theater", "performance", "stage", "dance", "puppet", "circus"]),
    ("writing & publishing", ["writing", "publish", "book", "zine", "editorial", "author"]),
    ("marketing & PR", ["marketing", "public relations", "brand", "campaign", "social content", "influencer"]),
    ("exhibition & curation", ["exhibition", "curat", "gallery", "museum", "retail design", "display"]),
    ("craft & fabrication", ["craft", "fabricat", "cnc", "3d print", "woodwork", "carpentr", "ceramic",
                              "sculpt", "jewel", "furniture", "maker", "metalwork", "glassblow",
                              "product design", "packaging"]),
    ("journalism", ["journalism", "news", "reporter"]),
    ("education", ["education", "teaching", "training", "classroom", "school", "pedagogy"]),
    ("heritage & museums", ["heritage", "conserv", "preserv", "archaeolog", "restoration"]),
    ("events", ["event", "festival", "concert", "ceremony", "wedding", "hospitality"]),
]


def tag_tech_disciplines(relevant: str | None, description: str | None, category: str | None) -> tuple[list[str], str]:
    """Return (disciplines, source) trying Relevant disciplines, then Description, then Category."""
    for text, source in ((relevant, "relevant"), (description, "description"), (category, "category")):
        t = (text or "").lower()
        if not t:
            continue
        found: list[str] = []
        for disc, keys in TECH_KEYWORDS:
            for k in keys:
                pat = k if k.startswith("\\b") else None
                hit = re.search(pat, t) if pat else (k in t)
                if hit:
                    found.append(disc)
                    break
        if found:
            # photogrammetry/lidar also bridges to architecture & heritage
            if ("photogrammetry" in t or "lidar" in t) and "heritage & museums" not in found:
                found.append("heritage & museums")
            return found, source
    return [], "none"


# ----------------------------------------------------------------------------
# Program discipline tagging: keyword rules over name + school
# ----------------------------------------------------------------------------
def tag_program_disciplines(name: str, school: str) -> tuple[list[str], list[str]]:
    n = f"{name} {school}".lower()
    core: list[str] = []

    def add(d: str):
        if d not in core and len(core) < 3:
            core.append(d)

    if "game" in n:
        add("game design")
    if "film" in n or "cinema" in n:
        add("film & video")
    if "media production" in n and "interactive media" not in n:
        add("film & video")
    if "broadcasting" in n:
        add("journalism"); add("film & video")
    if "animation" in n:
        add("animation")
    if "illustration" in n or "drawing" in n or "visual development" in n:
        add("illustration")
    if "graphic design" in n:
        add("graphic design")
    if "photography" in n:
        add("photography")
    if "interactive media" in n:
        add("interaction design")
    if "user experience" in n:
        add("interaction design")
    if "mobile application" in n or "web development" in n or "computer program" in n \
            or "computer systems" in n or "internet applications" in n or "multimedia" in n \
            or "human-centred design" in n or "human-centered design" in n or "programming" in n \
            or "digital health" in n:
        add("interaction design")
    if "interior design" in n or "interior decorat" in n:
        add("interior design")
    if re.search(r"\barchitect\w*|\bbuilding\b|construction", n):
        add("architecture")
    if "fashion" in n or "textile" in n or "esthet" in n or "hairstyl" in n:
        add("fashion & textiles")
    if "music" in n:
        add("music & audio")
    if re.search(r"\baudio\b", n) or "sound" in n:
        add("music & audio")
    if "theatre" in n or "theater" in n or "performing arts" in n or "dance" in n:
        add("theatre & performance")
    if "journalism" in n:
        add("journalism")
    if "professional writing" in n or "publishing" in n or "general arts" in n \
            or "scriptwriting" in n or "writer" in n or "library" in n or "english" in n:
        add("writing & publishing")
    if "marketing" in n or "advertising" in n or "public relations" in n \
            or "brand management" in n or "business" in n or "human resources" in n \
            or "creative industries" in n:
        add("marketing & PR")
    if "museum" in n or "heritage" in n or "curation" in n or "gallery" in n:
        add("heritage & museums")
    if "event" in n or "hospitality" in n or "tourism" in n or "culinary" in n or "chef" in n \
            or "cook" in n or "outdoor" in n or "forestry" in n or "recreation" in n:
        add("events")
    if "cabinetmaking" in n or "carpentr" in n or "joinery" in n or "woodworking" in n:
        add("craft & fabrication")
    if "welding" in n or "machinist" in n or "masonry" in n or "plumbing" in n or "electrical" in n \
            or "engineering" in n or "aircraft" in n or "motive power" in n:
        add("craft & fabrication")
    if "early childhood" in n or "educational support" in n or "teacher education" in n \
            or "teach" in n or "early learning" in n or "youth" in n \
            or "police" in n or "paramedic" in n or "firefighter" in n:
        add("education")
    if "indigenous" in n:
        add("heritage & museums"); add("writing & publishing")

    tangential: list[str] = []
    for d in core:
        for adj in ADJACENT[d]:
            if adj not in core and adj not in tangential and len(tangential) < 3:
                tangential.append(adj)
    return core, tangential


SCHOOL_DEFAULTS = {
    "ACCE": (["architecture"], ["craft & fabrication", "interior design"]),
    "Algonquin Centre for Construction Excellence (ACCE)": (["architecture"], ["craft & fabrication", "interior design"]),
    "Faculty of Arts, Media and Design": (["graphic design"], ["exhibition & curation", "fashion & textiles"]),
    "Pembroke Campus": (["events"], ["education", "heritage & museums"]),
    "Pembroke Campus (Algonquin College in the Ottawa Valley)": (["events"], ["education", "heritage & museums"]),
    "Police and Public Safety Institute": (["education"], ["events", "journalism"]),
    "School of Advanced Technology": (["interaction design"], ["game design", "craft & fabrication"]),
    "School of Business & Hospitality": (["marketing & PR"], ["events", "writing & publishing"]),
    "School of Creative and Interdisciplinary Studies": (["exhibition & curation"], ["interaction design", "film & video"]),
    "School of Health Sciences": (["education"], ["events", "interaction design"]),
    "School of Wellness, Public Safety & Community Studies": (["education"], ["events", "theatre & performance"]),
    "Various (see notes)": (["education"], ["events", "writing & publishing"]),
}


# ----------------------------------------------------------------------------
# Seed projects — blueprint §4
# ----------------------------------------------------------------------------
SEED_PROJECTS = [
    {
        "title": "Living Walls",
        "summary": "Algae photobioreactor panels plus sensors and TouchDesigner visuals for a breathing building lobby.",
        "programs": ["Bachelor of Interior Design (Honours) (Co-op)",
                     "Interactive Media Design (Co-op and Non Co-op)",
                     "Cabinetmaking and Furniture Technician"],
        "tech_aliases": ["ecoLogicStudio algae facades", "sensors toolkit", "TouchDesigner"],
        "effort": "term project",
    },
    {
        "title": "The One-Person Studio",
        "summary": "A short film directed end-to-end by AI agents, with a human director's commentary track on what the agents got wrong.",
        "programs": ["Film and Media Production", "Interactive Media Management"],
        "tech_aliases": ["Luma Agents", "invideo", "Runway Gen-4.5"],
        "effort": "capstone",
    },
    {
        "title": "Holographic Crit",
        "summary": "End-of-term 3D work reviewed on a glasses-free holographic display instead of printed boards.",
        "programs": ["Graphic Design", "Game - Art"],
        "tech_aliases": ["Looking Glass HLD", "Gaussian splatting"],
        "effort": "term project",
    },
    {
        "title": "Mycelium Commons",
        "summary": "Furniture for a student space grown from mycelium composites.",
        "programs": ["Bachelor of Interior Design (Honours) (Co-op)",
                     "Cabinetmaking and Furniture Technician"],
        "tech_aliases": ["mycelium composites"],
        "effort": "term project",
    },
    {
        "title": "Pocket Volume",
        "summary": "Virtual production without the LED wall: tracked camera plus Unreal plus green screen in a classroom.",
        "programs": ["Film and Media Production", "Game - Development"],
        "tech_aliases": ["desktop virtual production", "Unreal Engine 5", "inertial mocap"],
        "effort": "term project",
    },
    {
        "title": "Campus Soundwalk",
        "summary": "A binaural/ambisonic audio walk of campus, triggered by NFC tags at each stop.",
        "programs": ["Media Production", "Interactive Media Design (Co-op and Non Co-op)"],
        "tech_aliases": ["ambisonic recording", "NFC tap interactions"],
        "effort": "weekend",
    },
    {
        "title": "AR Wayfinding",
        "summary": "Phone-based AR navigation for orientation week.",
        "programs": ["Interactive Media Design (Co-op and Non Co-op)",
                     "Mobile Application Design and Development"],
        "tech_aliases": ["Lens Studio"],
        "effort": "term project",
    },
    {
        "title": "Riso AI Zine",
        "summary": "A zine where every spread pairs AI-generated imagery with risograph's analog texture.",
        "programs": ["Graphic Design", "Interactive Media Management"],
        "tech_aliases": ["Risograph", "generative image"],
        "effort": "weekend",
    },
    {
        "title": "Swarm Convocation",
        "summary": "A drone light show over the convocation ceremony, student-choreographed.",
        "programs": ["Interactive Media Design (Co-op and Non Co-op)", "Film and Media Production"],
        "tech_aliases": ["drone-swarm shows"],
        "effort": "capstone",
    },
    {
        "title": "Heritage Twin",
        "summary": "A photoreal digital twin of a heritage building, captured on phones, rendered in real time.",
        "programs": ["Bachelor of Interior Design (Honours) (Co-op)", "Heritage Carpentry and Joinery"],
        "tech_aliases": ["Gaussian splatting", "Twinmotion/Enscape"],
        "effort": "term project",
    },
    {
        "title": "Conducted by Thought",
        "summary": "A live generative-music performance controlled by an EMG wristband.",
        "programs": ["Interactive Media Design (Co-op and Non Co-op)", "Media Production"],
        "tech_aliases": ["EMG wristband", "TouchDesigner"],
        "effort": "capstone",
    },
    {
        "title": "Prompt-to-Chair",
        "summary": "Furniture designed by describing it in natural language, cut on the CNC the same day.",
        "programs": ["Bachelor of Interior Design (Honours) (Co-op)",
                     "Cabinetmaking and Furniture Technician"],
        "tech_aliases": ["text-to-CAD", "desktop CNC"],
        "effort": "weekend",
    },
]

# Explicit alias -> technology name resolutions (checked against the sheet).
TECH_ALIAS_RESOLUTIONS = {
    "sensors toolkit": "Sensors & actuators toolkit (IMU, LiDAR, capacitive, servos)",
    "Luma Agents": "Luma Agents (unified-intelligence video agents)",
    "invideo": "invideo Agent Two",
    "Runway Gen-4.5": "Generative video (Runway Gen-4.5, Google Veo 3.1, Kling 3.0, Luma Ray3, Pika)",
    "Looking Glass HLD": "Looking Glass Hololuminescent Displays",
    "Gaussian splatting": "Photogrammetry & Gaussian splatting",
    "mycelium composites": "Mycelium composites",
    "desktop virtual production": "Desktop virtual production (Aximmetry, green-screen + Unreal)",
    "Unreal Engine 5": "Unreal Engine 5 real-time rendering",
    "inertial mocap": "VTubing & avatar performance (VRM, mocap-driven)",
    "ambisonic recording": "Binaural & ambisonic recording",
    "NFC tap interactions": "NFC tap interactions",
    "Lens Studio": "Mobile/creator AR (Snap Lens Studio, Adobe Aero)",
    "Risograph": "Risograph",
    "generative image": "Generative image (Midjourney, Adobe Firefly, DALL-E class)",
    "drone-swarm shows": "Verge Aero (drone-show platform)",
    "Twinmotion/Enscape": "Real-time archviz (Twinmotion, Enscape, D5 Render)",
    "EMG wristband": "Meta neural wristband (EMG) + Neuralink Telepathy",
    "TouchDesigner": "TouchDesigner",
    "ecoLogicStudio algae facades": "ecoLogicStudio algae facades",
    "text-to-CAD": "Text-to-CAD startups (Zoo, AdamCAD, CADGPT)",
    "desktop CNC": "Desktop CNC milling (Shapeoko, Bantam)",
}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def resolve_tech(alias: str, tech_names: list[str]) -> tuple[str | None, str]:
    """Resolve a blueprint alias to an exact technology name. Returns (name, how)."""
    if alias in TECH_ALIAS_RESOLUTIONS:
        target = TECH_ALIAS_RESOLUTIONS[alias]
        if target in tech_names:
            return target, "explicit-resolution"
        return None, f"explicit resolution target missing: {target!r}"
    na = norm(alias)
    for name in tech_names:
        if norm(name) == na:
            return name, "exact"
    for name in tech_names:
        if na in norm(name) or norm(name) in na:
            return name, "substring"
    best = difflib.get_close_matches(alias, tech_names, n=1, cutoff=0.6)
    if best:
        return best[0], "fuzzy"
    return None, "NO MATCH"


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", default=str(DEFAULT_XLSX))
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()

    xlsx = Path(args.xlsx)
    if not xlsx.exists():
        print(f"ERROR: spreadsheet not found: {xlsx}", file=sys.stderr)
        return 1
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    wb = openpyxl.load_workbook(xlsx, data_only=True)

    # ---- Programs ----------------------------------------------------------
    ws = wb["Programs"]
    programs = []
    zero_tag: list[str] = []
    for r in range(2, ws.max_row + 1):
        row = [c.value for c in ws[r]]
        name = (row[0] or "").strip()
        if not name:
            continue
        school = (row[2] or "").strip()
        core, tang = tag_program_disciplines(name, school)
        used_fallback = False
        if not core:
            core, tang = SCHOOL_DEFAULTS.get(school, (["education"], ["events"]))
            used_fallback = True
            zero_tag.append(f"{name} [{school}] -> fallback {core}")
        programs.append({
            "id": f"p{len(programs) + 1:03d}",
            "name": name,
            "credential": (row[1] or "").strip(),
            "school": school,
            "campus": (row[3] or "").strip() if row[3] else None,
            "code": (row[4] or "").strip() if row[4] else None,
            "status": (row[5] or "").strip(),
            "notes": (row[6] or "").strip() if row[6] else None,
            "disciplines": core,
            "tangential": [t for t in tang if t not in core][:3],
            "_fallback": used_fallback,
        })
    program_names = {p["name"] for p in programs}

    # ---- Technologies ------------------------------------------------------
    wt = wb["Technologies"]
    technologies = []
    trl_counter: Counter[int] = Counter()
    tech_source_counter: Counter[str] = Counter()
    for r in range(2, wt.max_row + 1):
        row = [c.value for c in wt[r]]
        name = (row[1] or "").strip()
        if not name:
            continue
        maturity = (row[6] or "").strip() if row[6] else None
        trl, rule = maturity_to_trl(maturity)
        if "unknown" in rule:
            print(f"  WARN: tech #{row[0]} {name!r}: {rule}")
        discs, src = tag_tech_disciplines(row[4], row[3], row[2])
        technologies.append({
            "id": f"t{len(technologies) + 1:03d}",
            "name": name,
            "category": (row[2] or "").strip(),
            "description": (row[3] or "").strip() if row[3] else None,
            "relevantDisciplines": (row[4] or "").strip() if row[4] else None,
            "seeItInAction": (row[5] or "").strip() if row[5] else None,
            "maturity": maturity,
            "source": (row[7] or "").strip() if row[7] else None,
            "trl": trl,
            "disciplines": discs,
        })
        trl_counter[trl] += 1
        tech_source_counter[src] += 1
    tech_names = [t["name"] for t in technologies]

    # ---- Projects ----------------------------------------------------------
    projects = []
    misses: list[str] = []
    for i, seed in enumerate(SEED_PROJECTS, 1):
        tech_resolved: list[str] = []
        for alias in seed["tech_aliases"]:
            resolved, how = resolve_tech(alias, tech_names)
            if resolved is None:
                misses.append(f"{seed['title']}: tech alias {alias!r} -> {how}")
            else:
                tech_resolved.append(resolved)
        prog_missing = [p for p in seed["programs"] if p not in program_names]
        for p in prog_missing:
            misses.append(f"{seed['title']}: program {p!r} not in programs.json")
        discs: list[str] = []
        for p in seed["programs"]:
            prog = next((x for x in programs if x["name"] == p), None)
            if prog:
                for d in prog["disciplines"] + prog["tangential"]:
                    if d not in discs:
                        discs.append(d)
        for tname in tech_resolved:
            tech = next(x for x in technologies if x["name"] == tname)
            for d in tech["disciplines"]:
                if d not in discs:
                    discs.append(d)
        projects.append({
            "id": f"idea-{i:02d}",
            "title": seed["title"],
            "summary": seed["summary"],
            "programs": [p for p in seed["programs"] if p in program_names],
            "tech": tech_resolved,
            "disciplines": discs,
            "effort": seed["effort"],
            "status": "seed",
            "submittedBy": "Seed bank",
            "date": "2026-10-12",
        })

    # ---- Write JSON --------------------------------------------------------
    (out / "disciplines.json").write_text(json.dumps(DISCIPLINES, indent=2) + "\n")
    for p in programs:
        p.pop("_fallback", None)
    (out / "programs.json").write_text(json.dumps(programs, indent=2, ensure_ascii=False) + "\n")
    (out / "technologies.json").write_text(json.dumps(technologies, indent=2, ensure_ascii=False) + "\n")
    (out / "projects.json").write_text(json.dumps(projects, indent=2, ensure_ascii=False) + "\n")

    # ---- Coverage report ---------------------------------------------------
    print(f"programs:     {len(programs)} (expected 234)")
    print(f"technologies: {len(technologies)} (expected 139)")
    print(f"disciplines:  {len(DISCIPLINES)} (expected 20)")
    print(f"projects:     {len(projects)} (expected 12)")
    print(f"TRL distribution: {dict(sorted(trl_counter.items()))}")
    print(f"tech discipline-tag source: {dict(tech_source_counter)}")
    untagged_tech = [t["name"] for t in technologies if not t["disciplines"]]
    print(f"tech with zero discipline tags: {len(untagged_tech)}")
    for n in untagged_tech[:10]:
        print(f"   - {n}")
    print(f"programs that needed school fallback: {len(zero_tag)}")
    for z in zero_tag:
        print(f"   - {z}")
    if misses:
        print(f"\nSEED PROJECT MATCH MISSES ({len(misses)}):")
        for m in misses:
            print(f"   ! {m}")
    else:
        print("\nseed projects: all programs and tech resolved OK")

    ok = len(programs) == 234 and len(technologies) == 139 and len(DISCIPLINES) == 20 and len(projects) == 12
    ok = ok and all(p["disciplines"] for p in programs) and all(t["disciplines"] for t in technologies) and not misses
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
