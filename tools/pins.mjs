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
  commit: "cd06829f3d85a18036ba3450b4c4e1e1ccf41473",
};

export const CHECKS = {
  repository: "https://github.com/ohartwig/grundschutz-checks",
  // renovate: datasource=git-refs depName=ohartwig/grundschutz-checks packageName=https://github.com/ohartwig/grundschutz-checks branch=main
  commit: "05c11e13651a827ee9a9fa05e545b157be35b8a1",
};

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(`worksheets ${WORKSHEETS.commit}\nchecks ${CHECKS.commit}`);
