// SPDX-FileCopyrightText: 2026 Kai Ole Hartwig <mail@ole-hartwig.eu>
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { methodLines, methodSummary, short, strictFor } from "../lib/method.mjs";

const stderr = [
  "profile: warning: 2 requirement(s) of the method left out; BSI-Standard 300-1 (3.4.1) makes them part of every package: GC.1.1, KONF.14.1.1",
  "ssp: 9 requirements -- 2 implemented, 1 partial, 6 planned",
  "ssp: not fulfilled (BSI-Standard 300-1) -- 7: 1 temporary, 1 permanent, 5 not classified",
  "poam: 8 items -- 2 from findings, 4 with a deadline, 3 without an action, 1 approved deviations",
  "",
].join("\n");

test("benchmark is the default, bsi-300-1 asks for --strict, anything else is an error", () => {
  assert.equal(strictFor(), false);
  assert.equal(strictFor("benchmark"), false);
  assert.equal(strictFor("bsi-300-1"), true);
  assert.throws(() => strictFor("strict"), /"method" must be benchmark or bsi-300-1/);
  assert.throws(() => strictFor("constructor"), /must be/);
});

test("only the lines on the standard are kept, also the errors of --strict", () => {
  assert.equal(methodLines(stderr).length, 3);
  assert.deepEqual(methodLines("profile: 1 error(s):\n  3 requirement(s) of the method left out; BSI-Standard 300-1 (3.4.1) makes them part of every package: GC.1.1\n"), [
    "3 requirement(s) of the method left out; BSI-Standard 300-1 (3.4.1) makes them part of every package: GC.1.1",
  ]);
  assert.deepEqual(methodLines(undefined), []);
});

test("the summary has the counts, not the ID lists", () => {
  const [warning, ssp, poam] = methodLines(stderr).map(short);
  assert.equal(warning, "profile: warning: 2 requirement(s) of the method left out; BSI-Standard 300-1 (3.4.1) makes them part of every package");
  assert.equal(ssp, "ssp: not fulfilled (BSI-Standard 300-1) -- 7: 1 temporary, 1 permanent, 5 not classified");
  assert.match(poam, /^poam: 1 approved deviation\(s\)/);
});

test("the summary says the method, and says so when the tools are silent", () => {
  const s = methodSummary("benchmark", []).join("\n");
  assert.match(s, /## BSI-Standard 300-1/);
  assert.match(s, /Method `benchmark`/);
  assert.match(s, /nothing reported/);
  assert.match(methodSummary("bsi-300-1", methodLines(stderr)).join("\n"), /Method `bsi-300-1`[^]*- poam: 1 approved/);
});
