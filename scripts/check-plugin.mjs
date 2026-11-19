#!/usr/bin/env node

// Validates the Google Antigravity pstack plugin:
// 1. plugin.json schema (strict Antigravity manifest fields, logo exists, <= 3 suggestedPrompts)
// 2. Every skill's SKILL.md frontmatter (name matches folder, non-empty description, no built-in collisions)
// 3. Every agent's frontmatter (name, description, subagent: true, mainAgent: false, tools array)
// 4. Zero stray Cursor-specific references outside docs/antigravity-mapping.md and UPSTREAM.json
// 5. README.md and docs/guide/*.md relative links, heading anchors, counts, and full skill/playbook/agent listings

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED_MANIFEST_KEYS = new Set([
  "name",
  "displayName",
  "version",
  "description",
  "logo",
  "suggestedPrompts",
  "author",
  "homepage",
  "repository",
  "disabled",
]);
const BUILTIN_ANTIGRAVITY_SKILLS = new Set([
  "agy-customizations",
  "antigravity-guide",
  "automation",
  "generative_ui",
  "mcp-app-development",
  "migrate-agent-settings",
  "migrate-workflows",
  "permissioned-github",
  "plugin",
  "run-workflow",
  "swarm",
  "swarm_monitor",
  "swarm_narrator",
  "swarm_pane",
  "ui-plugin-navigation",
]);
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STRAY_CURSOR_RE =
  /\.cursor\/|pstack-models\.mdc|AskQuestion|generalPurpose|run_in_background|cloud_base_branch|file_attachments|claude-fable|gemini-4-carbon|cursor-team-kit|\/add-plugin|Custom Mode|agent-transcripts|api2\.cursor\.sh|SendToUser|xhigh-fast|high-fast|medium-fast|disable-model-invocation|cloud (sub)?agent/gi;
const LEAK_RE = /\/Users\/[a-z0-9_-]+|\/tmp\/cursor-plugins/g;
const LINK_RE = /\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g;

const problems = [];
const fail = (msg) => problems.push(msg);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (name === ".DS_Store" || name === "node_modules" || name === ".git") return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = {};
  const lines = m[1].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if (val === ">-" || val === ">" || val === "|") {
      const parts = [];
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
        parts.push(lines[++i].trim());
      }
      val = parts.join(" ");
    } else {
      val = val.replace(/^(["'])(.*)\1$/, "$2");
    }
    out[kv[1]] = val;
  }
  return out;
}

function anchors(absPath) {
  const seen = new Map();
  const found = new Set();
  let fenced = false;
  for (const line of readFileSync(absPath, "utf8").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const heading = !fenced && line.match(/^#{1,6}\s+(.*?)\s*$/);
    if (!heading) continue;
    const plain = heading[1].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "");
    const slug = plain.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
    const repeat = seen.get(slug) ?? 0;
    seen.set(slug, repeat + 1);
    found.add(repeat ? `${slug}-${repeat}` : slug);
  }
  return found;
}

// 1. Validate plugin.json
const manifestPath = join(ROOT, "plugin.json");
if (!existsSync(manifestPath)) {
  fail("Missing plugin.json");
} else {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const key of Object.keys(manifest)) {
      if (!ALLOWED_MANIFEST_KEYS.has(key)) fail(`plugin.json has unsupported top-level key: "${key}"`);
    }
    if (!manifest.name || !SKILL_NAME_RE.test(manifest.name)) {
      fail(`plugin.json name "${manifest.name}" must be lowercase kebab-case`);
    }
    if (!manifest.description) fail("plugin.json missing description");
    if (manifest.logo && !existsSync(join(ROOT, manifest.logo))) {
      fail(`plugin.json logo does not exist: ${manifest.logo}`);
    }
    if (Array.isArray(manifest.suggestedPrompts) && manifest.suggestedPrompts.length > 3) {
      fail(`plugin.json suggestedPrompts has ${manifest.suggestedPrompts.length} items (max 3)`);
    }
  } catch (err) {
    fail(`plugin.json failed to parse: ${err.message}`);
  }
}

// 2. Validate skills
const skillsRoot = join(ROOT, "skills");
const skillDirs = readdirSync(skillsRoot)
  .filter((n) => statSync(join(skillsRoot, n)).isDirectory() && existsSync(join(skillsRoot, n, "SKILL.md")))
  .sort();

for (const skill of skillDirs) {
  if (!SKILL_NAME_RE.test(skill) || skill.length > 64) {
    fail(`skills/${skill} is not valid lowercase kebab-case <= 64 chars`);
  }
  if (BUILTIN_ANTIGRAVITY_SKILLS.has(skill)) {
    fail(`skills/${skill} collides with built-in Antigravity skill "${skill}"`);
  }
  const text = readFileSync(join(skillsRoot, skill, "SKILL.md"), "utf8");
  const fm = parseFrontmatter(text);
  if (!fm) {
    fail(`skills/${skill}/SKILL.md is missing YAML frontmatter`);
    continue;
  }
  if (fm.name !== skill) {
    fail(`skills/${skill}/SKILL.md frontmatter name "${fm.name ?? ""}" does not match folder "${skill}"`);
  }
  if (!fm.description) {
    fail(`skills/${skill}/SKILL.md frontmatter missing description`);
  }
}

// 3. Validate agents
const agentsRoot = join(ROOT, "agents");
const agentNames = existsSync(agentsRoot)
  ? readdirSync(agentsRoot)
      .filter((n) => n.endsWith(".md"))
      .map((n) => n.slice(0, -3))
      .sort()
  : [];

for (const agent of agentNames) {
  const text = readFileSync(join(agentsRoot, `${agent}.md`), "utf8");
  const fm = parseFrontmatter(text);
  if (!fm) {
    fail(`agents/${agent}.md missing YAML frontmatter`);
    continue;
  }
  if (fm.name !== agent) fail(`agents/${agent}.md name "${fm.name ?? ""}" does not match filename`);
  if (!fm.description) fail(`agents/${agent}.md missing description`);
  if (fm.subagent !== "true") fail(`agents/${agent}.md must set subagent: true`);
  if (fm.mainAgent !== "false") fail(`agents/${agent}.md must set mainAgent: false`);
  if (!fm.tools || !fm.tools.startsWith("[")) fail(`agents/${agent}.md must declare an explicit tools list`);
}

// 4. Stray Cursor references & machine-local leak check
const mdFiles = [
  join(ROOT, "README.md"),
  ...walk(skillsRoot).filter((p) => p.endsWith(".md")),
  ...walk(agentsRoot).filter((p) => p.endsWith(".md")),
  ...walk(join(ROOT, "docs", "guide")).filter((p) => p.endsWith(".md")),
];
for (const abs of mdFiles) {
  const rel = relative(ROOT, abs);
  const text = readFileSync(abs, "utf8");
  const hits = [...new Set([...text.matchAll(STRAY_CURSOR_RE)].map((m) => m[0]))];
  if (hits.length > 0) {
    fail(`${rel} contains stray Cursor-specific term(s): ${hits.join(", ")}`);
  }
  const leaks = [...new Set([...text.matchAll(LEAK_RE)].map((m) => m[0]))];
  if (leaks.length > 0) {
    fail(`${rel} contains machine-local path(s): ${leaks.join(", ")}`);
  }
}

// 4b. Verify UPSTREAM.json nativeOverrides exist
const upstreamPath = join(ROOT, "UPSTREAM.json");
if (existsSync(upstreamPath)) {
  const upstream = JSON.parse(readFileSync(upstreamPath, "utf8"));
  for (const rel of upstream.nativeOverrides ?? []) {
    if (!existsSync(join(ROOT, rel))) {
      fail(`UPSTREAM.json nativeOverrides references missing file: ${rel}`);
    }
  }
}

// 5. Links & README completeness (all markdown files in repo)
const playbooksRoot = join(skillsRoot, "poteto-mode", "playbooks");
const playbooks = readdirSync(playbooksRoot)
  .filter((n) => n.endsWith(".md"))
  .map((n) => n.slice(0, -3))
  .sort();
const principles = skillDirs.filter((n) => n.startsWith("principle-"));
const commands = skillDirs.filter((n) => !n.startsWith("principle-"));

const docFiles = [
  "README.md",
  "docs/antigravity-mapping.md",
  ...walk(join(ROOT, "docs", "guide"))
    .filter((p) => p.endsWith(".md"))
    .map((p) => relative(ROOT, p)),
  ...walk(skillsRoot)
    .filter((p) => p.endsWith(".md"))
    .map((p) => relative(ROOT, p)),
  ...walk(agentsRoot)
    .filter((p) => p.endsWith(".md"))
    .map((p) => relative(ROOT, p)),
];

let linkCount = 0;
for (const rel of docFiles) {
  const abs = join(ROOT, rel);
  const body = readFileSync(abs, "utf8").replace(/^```[\s\S]*?^```/gm, "");
  for (const [, href] of body.matchAll(LINK_RE)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("/")) continue;
    linkCount++;
    const [target, anchor] = href.split("#");
    const resolved = target ? posix.normalize(posix.join(posix.dirname(rel), target)).replace(/\/$/, "") : rel;
    const targetAbs = join(ROOT, resolved);
    if (!existsSync(targetAbs)) {
      fail(`${rel} links to ${href}, which does not exist`);
    } else if (anchor && targetAbs.endsWith(".md") && !anchors(targetAbs).has(anchor)) {
      fail(`${rel} links to ${href}, but ${resolved} has no heading with anchor #${anchor}`);
    }
  }
}

const readme = readFileSync(join(ROOT, "README.md"), "utf8");
for (const skill of skillDirs) {
  if (!readme.includes(`(./skills/${skill}/SKILL.md)`)) fail(`README.md does not link skill ${skill}`);
}
for (const pb of playbooks) {
  if (!readme.includes(`(./skills/poteto-mode/playbooks/${pb}.md)`)) fail(`README.md does not link playbook ${pb}`);
}
for (const agent of agentNames) {
  if (!readme.includes(`(./agents/${agent}.md)`)) fail(`README.md does not link agent ${agent}`);
}

console.log(
  `tree: ${skillDirs.length} skills (${commands.length} commands, ${principles.length} principles), ` +
    `${playbooks.length} playbooks, ${agentNames.length} agents`,
);
console.log(`docs: ${docFiles.length} checked, ${linkCount} relative links verified`);
for (const p of problems) console.log(`FAIL ${p}`);
console.log(`${problems.length} problems`);
if (problems.length > 0) process.exit(1);
