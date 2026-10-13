// SPDX-FileCopyrightText: 2026 Kai Ole Hartwig <mail@ole-hartwig.eu>
// SPDX-License-Identifier: MIT
// Where the results of every night are kept, so that a report over a period
// can read them back. A pipeline's artefacts expire; evidence for a SOC 2
// Type II period or an ISO audit must not.
//
//   dir:<path>      a directory, results/<day>/<check>.json -- for a local
//                   run, or a runner with a persistent volume
//   gitlab          the project's generic package registry, one package
//                   version per day (evidence/<day>/<check>.json), written and
//                   read with the job's own token: no extra secret
//
// A day is YYYY-MM-DD (UTC). Both stores answer the same three questions:
// put a file for a day, get it back, and which checks a day has.

import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const day = (d) => d.toISOString().slice(0, 10);
export const daysBack = (to, n) => Array.from({ length: n }, (_, i) => day(new Date(Date.parse(`${to}T00:00:00Z`) - i * 864e5))).reverse();

const dirStore = (root) => ({
  name: `dir:${root}`,
  async put(d, check, bytes) {
    mkdirSync(join(root, d), { recursive: true });
    writeFileSync(join(root, d, `${check}.json`), bytes);
  },
  async get(d, check) {
    const f = join(root, d, `${check}.json`);
    return existsSync(f) ? readFileSync(f) : null;
  },
});

// CI_API_V4_URL, CI_PROJECT_ID and CI_JOB_TOKEN are what GitLab gives every
// job; the job token may write and read the generic packages of its project.
const gitlabStore = (env, fetch) => {
  for (const k of ["CI_API_V4_URL", "CI_PROJECT_ID", "CI_JOB_TOKEN"]) if (!env[k]) throw new Error(`store gitlab needs ${k}`);
  const url = (d, check) => `${env.CI_API_V4_URL}/projects/${env.CI_PROJECT_ID}/packages/generic/evidence/${d}/${check}.json`;
  const headers = { "JOB-TOKEN": env.CI_JOB_TOKEN };
  return {
    name: "gitlab generic packages (evidence)",
    async put(d, check, bytes) {
      const r = await fetch(url(d, check), { method: "PUT", headers, body: bytes });
      if (!r.ok) throw new Error(`${r.status} storing ${d}/${check}.json`);
    },
    async get(d, check) {
      const r = await fetch(url(d, check), { headers });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`${r.status} reading ${d}/${check}.json`);
      return Buffer.from(await r.arrayBuffer());
    },
  };
};

export const openStore = (spec, { env = process.env, fetch = globalThis.fetch } = {}) => {
  if (spec?.startsWith("dir:")) return dirStore(spec.slice(4));
  if (spec === "gitlab") return gitlabStore(env, fetch);
  throw new Error(`unknown store "${spec}": dir:<path> or gitlab`);
};

// For tests: what a directory store holds.
export const listDir = (root) => (existsSync(root) ? readdirSync(root).sort() : []);
