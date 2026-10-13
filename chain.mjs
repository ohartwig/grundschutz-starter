#!/usr/bin/env node
// The whole chain, once a night: from your tailoring and your system
// description to an OSCAL package with tonight's measurements in it, and a
// report over the period behind it.
//
//   tailoring.json      ->  profile.json           (worksheets profile.mjs)
//   checks.config.json  ->  assessment-plan.json   (checks --plan, assessment-plan.mjs)
//   the checks          ->  results-<check>.json   (checks run.mjs, results.mjs)
//   system.json         ->  security-plan.json     (ssp.mjs, with tonight's results)
//   actions.json        ->  poam.json              (poam.mjs; the file is optional)
//   report.presets      ->  coverage-<preset>.md   (coverage.mjs, per standard)
//   report.period-days  ->  period.md              (period.mjs, over the stored nights)
//
// Everything lands in out/, is validated against the NIST schema and
// summarised in out/SUMMARY.md. Tonight's results are also put into the store
// (lib/store.mjs), and the period report reads the earlier nights back from it.
//
//   node chain.mjs [--store dir:results | gitlab] [--day YYYY-MM-DD]
//
// The tools come from tools/pins.mjs, fetched into .tools/; WORKSHEETS_DIR and
// CHECKS_DIR point at local checkouts instead. GITLAB_TOKEN (read_api) is for
// the GitLab checks; without it they are skipped, and the summary says so.
//
// Exit 1 when a step failed or a check could not look: then nothing shows the
// controls it measures tonight, and somebody should know. A check that looked
// and found something not as required is not a failure of the chain; it is
// what the chain is for, and it is in the results and the POA&M.
//
// No dependencies. Node 24 (LTS) or later.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CHECKS, WORKSHEETS } from "./tools/pins.mjs";
import { day, daysBack, openStore } from "./lib/store.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const today = opt("--day", day(new Date()));
const store = openStore(opt("--store", "dir:results"));
const out = "out";

const sh = (cmd, a, o = {}) => execFileSync(cmd, a, { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8", ...o });
const fetchTool = (pin, dir) => {
  if (existsSync(`${dir}/.git`) && sh("git", ["-C", dir, "rev-parse", "HEAD"]).trim() === pin.commit) return dir;
  rmSync(dir, { recursive: true, force: true });
  sh("git", ["init", "-q", dir]);
  // A tool on this GitLab is private: in CI fetch it with the job token.
  let url = pin.repository;
  const host = process.env.CI_SERVER_HOST;
  if (host && process.env.CI_JOB_TOKEN && url.startsWith(`https://${host}/`)) {
    url = url.replace(`https://${host}/`, `https://gitlab-ci-token:${process.env.CI_JOB_TOKEN}@${host}/`);
  }
  sh("git", ["-C", dir, "fetch", "-q", "--depth", "1", url, pin.commit]);
  sh("git", ["-C", dir, "checkout", "-q", "FETCH_HEAD"]);
  if (existsSync(`${dir}/package-lock.json`)) sh("npm", ["ci", "--silent", "--no-audit", "--no-fund"], { cwd: dir });
  return dir;
};
const ws = resolve(process.env.WORKSHEETS_DIR || fetchTool(WORKSHEETS, ".tools/worksheets"));
const ck = resolve(process.env.CHECKS_DIR || fetchTool(CHECKS, ".tools/checks"));
const { LIBRARY } = await import(pathToFileURL(`${ws}/tools/bsi-library.mjs`));
const { CHECKS: AVAILABLE } = await import(pathToFileURL(`${ck}/checks/index.mjs`));

rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/history`, { recursive: true });
const json = (f) => JSON.parse(readFileSync(f, "utf8"));
const put = (f, v) => writeFileSync(`${out}/${f}`, typeof v === "string" ? v : JSON.stringify(v, null, 2) + "\n");
const node = (a, o = {}) => spawnSync(process.execPath, a, { encoding: "utf8", maxBuffer: 1 << 28, ...o });
const lines = [];
let failed = 0;
const step = (ok, what, detail = "") => {
  failed += !ok;
  lines.push(`- ${ok ? "ok" : "**FAILED**"}: ${what}`);
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${ok || !detail ? "" : `\n${detail}`}`);
  return ok;
};
// A step whose output is a file in out/.
const gen = (file, script, a, cwd) => {
  const r = node([script, ...a], { cwd });
  if (r.status === 0) put(file, r.stdout);
  return step(r.status === 0, file, r.stderr) ? r : null;
};

const catalog = { path: "control_layer/Grundschutz++/Grundschutz++-resolved_catalog.json", commit: LIBRARY.commit };
const system = json("system.json");
const report = { presets: [], "period-days": 90, every: "24h", ...system.report };
const meta = { version: today, "last-modified": `${today}T00:00:00Z` };

// 1. The tailoring as a profile, at the library commit the tools are tested at.
put("tailoring.json", { ...json("tailoring.json"), catalog, ...meta });
gen("profile.json", `${ws}/profile.mjs`, [`${out}/tailoring.json`]);

// 2. The assessment plan, from the checks the config enables.
// CHECKS_CONFIG: a path to use instead of checks.config.json -- in CI a file
// variable, so an installation can measure its real instance while the file in
// the repository stays the example.
const configFile = process.env.CHECKS_CONFIG || "checks.config.json";
const config = { ...json(configFile), catalog, ...meta, ssp: { href: "security-plan.json" }, plan: { href: "assessment-plan.json", file: "assessment-plan.json" } };
put("checks.config.json", config);
gen("checks.json", `${ck}/run.mjs`, ["--plan", "--config", `${out}/checks.config.json`]) &&
  gen("assessment-plan.json", `${ws}/assessment-plan.mjs`, [`${out}/checks.json`]);

// 3. Tonight's runs, each as assessment results, each into the store.
const enabled = AVAILABLE.filter((c) => (config.checks ?? AVAILABLE.map((x) => x.name)).includes(c.name));
const results = [];
for (const c of failed ? [] : enabled) {
  if (c.needs.includes("gitlab") && !process.env.GITLAB_TOKEN) {
    step(true, `${c.name}: skipped, no GITLAB_TOKEN -- nothing measures its requirements tonight`);
    continue;
  }
  const run = gen(`run-${c.name}.json`, `${ck}/run.mjs`, [c.name, "--config", `${out}/checks.config.json`]);
  if (!run) continue;
  const res = gen(`results-${c.name}.json`, `${ws}/results.mjs`, [`${out}/run-${c.name}.json`]);
  if (!res) continue;
  results.push(`results-${c.name}.json`);
  const off = JSON.parse(run.stdout).subjects.filter((s) => !s.satisfied);
  lines.push(`  - ${c.name}: ${off.length} not as required${off.length ? `: ${off.map((s) => s.title).join(", ")}` : ""}`);
  try {
    await store.put(today, c.name, res.stdout);
  } catch (e) {
    step(false, `store ${today}/${c.name}`, e.message);
  }
}

// 4. The security plan with tonight's results, and what will be fixed.
const rel = (p) => (p ? `../${p}` : undefined);
put("system.json", {
  ...system,
  ...meta,
  report: undefined,
  profile: { file: "profile.json", href: "profile.json" },
  components: (system.components ?? []).map(rel),
  results,
  reviews: rel(system.reviews),
  inventory: rel(system.inventory),
});
if (existsSync(`${out}/profile.json`)) gen("security-plan.json", `${ws}/ssp.mjs`, [`${out}/system.json`]);
put("poam-in.json", {
  id: `${system.system?.id ?? "system"}-poam`,
  title: `What will be fixed: ${system.title}`,
  ...meta,
  ssp: { file: "security-plan.json", href: "security-plan.json" },
  results,
  ...(existsSync("actions.json") && { actions: "../actions.json" }),
});
if (existsSync(`${out}/security-plan.json`)) gen("poam.json", `${ws}/poam.mjs`, [`${out}/poam-in.json`]);

// 5. Per standard, how far tonight's measurements reach.
for (const p of results.length ? report.presets : []) gen(`coverage-${p}.md`, `${ws}/coverage.mjs`, ["--preset", p, ...results.map((r) => `${out}/${r}`)]);

// 6. Over the period: every stored night, read back.
const days = daysBack(today, report["period-days"]);
const history = [];
for (const d of days) {
  for (const c of enabled) {
    try {
      const bytes = await store.get(d, c.name);
      if (bytes) {
        writeFileSync(`${out}/history/${d}-${c.name}.json`, bytes);
        history.push(`${out}/history/${d}-${c.name}.json`);
      }
    } catch (e) {
      step(false, `read ${d}/${c.name} from the store`, e.message);
    }
  }
}
// The period starts with the first stored night: before it there was no
// chain, and a gap nobody could have filled says nothing.
const since = history.map((f) => f.slice(`${out}/history/`.length, `${out}/history/`.length + 10)).sort()[0] ?? today;
if (history.length) gen("period.md", `${ws}/period.mjs`, [...history, "--from", since, "--to", today, "--every", report.every]);

// 7. Every OSCAL document against the NIST schema.
const oscal = readdirSync(out).filter((f) => /^(profile|assessment-plan|results-.*|security-plan|poam)\.json$/.test(f));
const v = node([`${ws}/validate.mjs`, ...oscal.map((f) => `${out}/${f}`)]);
step(v.status === 0, `${oscal.length} OSCAL documents validate`, v.stdout + v.stderr);

const head = (f) => (existsSync(`${out}/${f}`) ? readFileSync(`${out}/${f}`, "utf8").split("\n").filter((l) => l.startsWith("- ")).slice(0, 6) : []);
put(
  "SUMMARY.md",
  [
    `# ${system.title}: ${today}`,
    "",
    `Tools: grundschutz-worksheets ${WORKSHEETS.commit.slice(0, 7)}, grundschutz-checks ${CHECKS.commit.slice(0, 7)}, library ${catalog.commit.slice(0, 7)}. Store: ${store.name}.`,
    "",
    "## Steps",
    "",
    ...lines,
    "",
    ...report.presets.flatMap((p) => [`## Coverage: ${p}`, "", ...head(`coverage-${p}.md`), ""]),
    `## Period: ${since} to ${today}, ${history.length} stored result(s)`,
    "",
    ...head("period.md"),
    "",
  ].join("\n"),
);
console.log(`\n${out}/SUMMARY.md`);
process.exitCode = failed ? 1 : 0;
