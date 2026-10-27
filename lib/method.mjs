// SPDX-FileCopyrightText: 2026 Kai Ole Hartwig <mail@ole-hartwig.eu>
// SPDX-License-Identifier: MIT
// BSI-Standard 300-1, the method of Grundschutz++, as far as the chain is
// concerned: which method system.json asks for, and what the tools of
// worksheets say about it on stderr, cut down for the summary.
//
//   benchmark    the default: the tailoring is measured against the catalog,
//                and a package that leaves out what the standard puts into
//                every package (3.4.1) gets warnings
//   bsi-300-1    for those aiming at certification: the same is an error
//                (profile.mjs --strict), and the chain fails
//
// The tools print one line per finding: profile.mjs a warning per kind of
// requirement left out, with every ID; ssp.mjs the unfulfilled requirements,
// temporary, permanent and not classified (4.1.2); poam.mjs the approved
// deviations. The job log keeps the lines whole, the summary without the ID
// lists.

export const METHODS = { benchmark: false, "bsi-300-1": true };

// Whether profile.mjs gets --strict; an unknown method is an error, not a
// quiet benchmark.
export const strictFor = (method = "benchmark") => {
  if (!Object.hasOwn(METHODS, method)) throw new Error(`"method" must be ${Object.keys(METHODS).join(" or ")}, not ${JSON.stringify(method)}`);
  return METHODS[method];
};

// The lines of a tool's stderr that speak about the standard.
export const methodLines = (stderr = "") =>
  stderr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /BSI-Standard 300-1|approved deviations/.test(l));

// A line for the summary: without the trailing list of IDs, and of the POA&M
// line only the deviations.
export const short = (line) => {
  const dev = line.match(/^poam: .*?(\d+) approved deviations/);
  if (dev) return `poam: ${dev[1]} approved deviation(s) (4.1.2): permanently unfulfilled, residual risk approved`;
  return line.replace(/: [A-Z][A-Z0-9]*(\.\d+)+(, [A-Z][A-Z0-9]*(\.\d+)+)*$/, "");
};

export const methodSummary = (method, lines) => [
  "## BSI-Standard 300-1",
  "",
  method === "bsi-300-1"
    ? "Method `bsi-300-1`: a package that leaves out what the standard puts into every package (3.4.1) fails the chain."
    : "Method `benchmark` (the default): the package rule (3.4.1) only warns; `\"method\": \"bsi-300-1\"` in system.json makes it an error.",
  "",
  ...(lines.length ? lines.map((l) => `- ${short(l)}`) : ["- nothing reported: the tools at this pin say nothing on the standard yet"]),
  "",
];
