#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Kai Ole Hartwig <mail@ole-hartwig.eu>
// SPDX-License-Identifier: MIT
// The two tools this starter runs, each at one commit of its public
// repository: grundschutz-worksheets writes the OSCAL, grundschutz-checks
// measures. pinup (or Renovate) announces a newer commit as a merge request,
// and its pipeline runs the whole chain on it before anything changes here.
//
//   node tools/pins.mjs     # prints both, for CI

import { fileURLToPath } from "node:url";

export const WORKSHEETS = {
  repository: "https://github.com/ohartwig/grundschutz-worksheets",
  // renovate: datasource=git-refs depName=ohartwig/grundschutz-worksheets packageName=https://github.com/ohartwig/grundschutz-worksheets branch=main
  commit: "458d0c378c6d4840bb138b4c397579f0db62e716",
};

// grundschutz-checks is not on github.com yet, so it comes from the GitLab
// project; chain.mjs authenticates with the job token in CI (the project
// allowlists this one). Back to github.com once it is published there.
export const CHECKS = {
  repository: "https://github.com/ohartwig/grundschutz-checks.git",
  // renovate: datasource=git-refs depName=development/grundschutz-checks packageName=https://github.com/ohartwig/grundschutz-checks.git branch=main
  commit: "ead5f2fc55ec2e656773ae52a9d9783db1f0f47b",
};

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(`worksheets ${WORKSHEETS.commit}\nchecks ${CHECKS.commit}`);
