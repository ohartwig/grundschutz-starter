# grundschutz-starter

The [grundschutz-worksheets](https://github.com/ohartwig/grundschutz-worksheets)
chain with real measurements, every night, in your own CI: fork this
repository, fill in three files, set one variable, create a schedule. The next
morning there is an OSCAL package -- profile, assessment plan, assessment
results, security plan, POA&M -- validated against the NIST schema, a
coverage report for each standard you name, and a report over every night
since the first.

Nothing leaves your project: the results stay in its artefacts and its package
registry.

## What you fill in

| File | What it says |
| --- | --- |
| `tailoring.json` | Which Grundschutz++ requirements apply to you, which do not and why, and your values for the catalog's blanks (`profile.mjs` of worksheets). The example lists the nine the checks measure. |
| `system.json` | Your system: name, boundary, sensitivity, components; and `report`: the standards to report coverage for (presets of worksheets: `iso27001`, `nis2`, `dora`, `c5`, `soc2`, ...), the period in days, the cadence you promise. |
| `checks.config.json` | What the [checks](https://github.com/ohartwig/grundschutz-checks) look at: your GitLab and its groups, your TLS endpoints, the limits, deliberate exceptions with their reasons. |
| `actions.json` (optional) | Your improvement register; the POA&M gives each finding its action and date (`poam.mjs` of worksheets). |
| `reviews.json` (optional) | Your own dated verdict per requirement, which the security plan states as the owner's claim. |

Then, in GitLab:

1. Optionally, Settings > CI/CD > Variables: `CHECKS_CONFIG` as a **file**
   variable holding your real `checks.config.json`, if the file in the
   repository should stay as it is (this starter keeps its example that way).
2. Settings > CI/CD > Variables: `CHECKS_GITLAB_TOKEN`, masked and protected, a
   token with `read_api` on the groups you named. Nothing more: no check writes.
   (The pipeline hands it to the chain as `GITLAB_TOKEN`; a group-wide
   `GITLAB_TOKEN` is deliberately not used.)
3. Build > Pipeline schedules: daily, on the default branch.

## What runs

`chain.mjs`, which the pipeline runs:

1. `tailoring.json` becomes `profile.json`, at the BSI library commit the
   tools are tested at.
2. The enabled checks become `assessment-plan.json`.
3. Each check runs and becomes `results-<check>.json`. A check that could not
   look writes nothing and fails the pipeline: nothing shows its requirements
   tonight, and somebody should know. One that looked and found something not
   as required does not fail it; that is in the results and the POA&M.
4. `system.json` and tonight's results become `security-plan.json`; with
   `actions.json`, `poam.json`.
5. Per standard in `report.presets`, `coverage-<preset>.md`: what tonight's
   measurements say about its requirements, leading with what nothing
   measures.
6. Every stored night of the period becomes `period.md`: per check and
   requirement the runs, the failures and the longest gap. That is what a SOC 2
   Type II auditor asks, and an ISO or NIS2 audit too.
7. Everything is validated; `out/SUMMARY.md` has the headlines.

On the schedule, tonight's results go into the project's generic package
registry, `evidence/<day>/<check>.json`, with the job's own token; the period
report reads them back from there. Artefacts expire, evidence for an audit
period must not. Run it locally with a directory instead:

```bash
GITLAB_TOKEN=... node chain.mjs --store dir:results
```

## What this is not

Not an audit and not a certificate. The checks measure a few requirements in
part; the coverage reports say how few, and the mappings to other standards
are drafts nobody has reviewed yet. What the chain gives you is evidence, dated
and in the format the tools of auditors read. Whether your system meets a
standard is an assessment by a person.

## The tools

`tools/pins.mjs` pins one commit each of grundschutz-worksheets and
grundschutz-checks, which `chain.mjs` fetches; pinup or Renovate announce newer
ones as merge requests, and the pipeline of that request runs the whole chain
on them. Both are MIT and have no dependencies but Node 24.

## Licence

MIT, see [LICENSE](LICENSE).
