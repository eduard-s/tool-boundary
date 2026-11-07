# Report format v1

Each report is a JSON object. It contains `schemaVersion: 1`, `caseId`, `runtime`, `adapter`, `dependencyVersions`, `outcome`, and `observations`. It can include the raw tool `input`.

`outcome` is one of `pass`, `fail`, `unsupported`, or `harness_error`.

`observations` is an array. Each observation names a `boundary` and contains `expected`, `observed`, and `differences`. The boundaries are `input`, `result`, and `error`. Each difference contains a JSON Pointer path and expected and observed values.

`allowedDifferences` records differences that match an exact rule. Each entry contains a nonempty reason. A rule cannot use a wildcard or the root path.

The special object `{ "kind": "missing" }` describes an absent property. A user value with that exact shape is encoded as ordinary data with an envelope in a later schema version. The MVP does not compare values with this reserved shape.

The adapter records actual dependency versions. It never infers a version from a declared range.

[`report-v1.schema.json`](report-v1.schema.json) defines the portable report shape. The Python and Node.js packages do tests against that schema.
