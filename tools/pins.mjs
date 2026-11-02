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
  commit: "5f6851f88b4d08a236eccb38898b1cc291ced091",
};

export const CHECKS = {
  repository: "https://github.com/ohartwig/grundschutz-checks",
  // renovate: datasource=git-refs depName=ohartwig/grundschutz-checks packageName=https://github.com/ohartwig/grundschutz-checks branch=main
  commit: "7c21eb0fac75b09ec078021f756725e8345d74ce",
};

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(`worksheets ${WORKSHEETS.commit}\nchecks ${CHECKS.commit}`);
