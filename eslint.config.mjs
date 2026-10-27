// SPDX-FileCopyrightText: 2026 Kai Ole Hartwig <mail@ole-hartwig.eu>
// SPDX-License-Identifier: MIT
// ESLint for the chain's own scripts: plain ES modules, run by Node, no
// browser and no build. lint:eslint in CI reads this through the
// lint:eslint.report.junit script in package.json.

import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", ".tools/**", "out/**", "results/**", "reports/**"] },
  js.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
  },
];
