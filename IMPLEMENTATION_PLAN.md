# ToolBoundary implementation plan

## MVP contract

The first release provides a native library for Python and Node.js. Both libraries compare parser results with handler arguments. Both can compare client-visible MCP results and public errors with explicit expectations. A report names the exact failed boundary.

Each test case uses a stub handler. The caller registers that stub through its normal registration function. ToolBoundary captures the arguments at the stub. The test never registers a production tool body.

The initial value profile contains JSON objects, arrays, strings, booleans, nulls, and finite numbers. Missing keys differ from null. Array order matters. Object key order does not matter. Other values need an explicit codec and are unsupported in this release.

`pass`, `fail`, `unsupported`, and `harness_error` are separate states. A framework rejection is a valid observation. A timeout is a harness error unless a case expects a timeout.

## Tasks

| Stage | Python | Node.js | Shared result |
| --- | --- | --- | --- |
| 1. Contract | Implement report data types and comparison | Implement matching types and comparison | Report schema and fixed fixtures |
| 2. MCP input | Run a stub through MCP Python v1 | Run a stub through MCP TypeScript v1 | Parser and handler arguments appear in reports |
| 3. MCP output and error | Compare explicit error and structured output | Compare explicit structured output and error | Known SDK defects produce failure reports |
| 4. WorkflowAgent | — | Run a fake model through WorkflowAgent v2 | Input defaults and transforms produce failure reports on the affected version |
| 5. Distribution | Make wheel and source archive | Make npm tarball and type declarations | Clean installs work outside the repository |

## Release gates

1. The comparison units find missing keys, null differences, type differences, and nested differences.
2. The adapters run the official SDK dispatch path and use stub handlers.
3. The published defect fixtures fail at the expected boundary on pinned affected versions.
4. Matching control fixtures pass. WorkflowAgent `2.0.73` passes the cases that fail on `2.0.68`.
5. Both packages produce reports that obey the same schema.
6. CI runs on each pull request. Package archives install in clean environments.
7. README examples work from the released archives.

## Later work

Add current MCP SDK v2 adapters after the v1 defect fixtures are stable. Add fuzzing and input shrinking after deterministic reports prove useful. Add Go after a real Go tool adapter has a user.
