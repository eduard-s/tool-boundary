# Report format v1

Each report is a JSON object. It contains `schemaVersion: 1`, `caseId`, `runtime`, `adapter`, `dependencyVersions`, `outcome`, and `observations`. It can also contain the raw tool `input`.

`outcome` is one of `pass`, `fail`, `unsupported`, or `harness_error`.

`observations` is an array. Each observation names a `boundary`. It also contains `expected`, `observed`, and `differences`. The boundaries are `input`, `result`, and `error`. Each difference contains a JSON Pointer path and expected and observed values.

`allowedDifferences` records differences that match an exact rule. Each entry needs a reason that is not empty. A rule cannot use a wildcard or the root path.

The special object `{ "kind": "missing" }` identifies a property that does not exist. A later schema version will encode a user value with this shape as ordinary data in an envelope. The MVP does not compare values with this reserved shape.

The adapter records actual dependency versions. It does not infer a version from a declared range.

[`report-v1.schema.json`](report-v1.schema.json) defines the report shape. The Python and Node.js packages use that schema in tests.
