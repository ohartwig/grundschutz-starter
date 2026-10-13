// SPDX-FileCopyrightText: 2026 Kai Ole Hartwig <mail@ole-hartwig.eu>
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { daysBack, openStore } from "../lib/store.mjs";

test("daysBack gives n days ending with the day, oldest first", () => {
  assert.deepEqual(daysBack("2026-03-01", 3), ["2026-02-27", "2026-02-28", "2026-03-01"]);
});

test("a directory store gives back what was put, and null for a night without", async () => {
  const s = openStore(`dir:${mkdtempSync(join(tmpdir(), "starter-"))}`);
  await s.put("2026-10-13", "tls-endpoints", Buffer.from("{}"));
  assert.equal(String(await s.get("2026-10-13", "tls-endpoints")), "{}");
  assert.equal(await s.get("2026-10-14", "tls-endpoints"), null);
});

test("the gitlab store uses the job token and the generic package of the day", async () => {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push([init.method ?? "GET", url, init.headers?.["JOB-TOKEN"]]);
    if (url.endsWith("missing.json")) return new Response(null, { status: 404 });
    return new Response(init.method === "PUT" ? "{}" : "stored", { status: init.method === "PUT" ? 201 : 200 });
  };
  const env = { CI_API_V4_URL: "https://gl.example/api/v4", CI_PROJECT_ID: "7", CI_JOB_TOKEN: "jt" };
  const s = openStore("gitlab", { env, fetch });
  await s.put("2026-10-13", "mfa-enforced", Buffer.from("{}"));
  assert.equal(String(await s.get("2026-10-13", "mfa-enforced")), "stored");
  assert.equal(await s.get("2026-10-13", "missing"), null);
  assert.deepEqual(calls[0], ["PUT", "https://gl.example/api/v4/projects/7/packages/generic/evidence/2026-10-13/mfa-enforced.json", "jt"]);
});

test("the gitlab store refuses to start without what GitLab gives a job", () => {
  assert.throws(() => openStore("gitlab", { env: {} }), /needs CI_API_V4_URL/);
  assert.throws(() => openStore("s3"), /unknown store/);
});

test("a failed write is an error, not a silence", async () => {
  const env = { CI_API_V4_URL: "https://gl.example/api/v4", CI_PROJECT_ID: "7", CI_JOB_TOKEN: "jt" };
  const s = openStore("gitlab", { env, fetch: async () => new Response(null, { status: 403 }) });
  await assert.rejects(s.put("2026-10-13", "x", Buffer.from("{}")), /403 storing 2026-10-13\/x\.json/);
});
