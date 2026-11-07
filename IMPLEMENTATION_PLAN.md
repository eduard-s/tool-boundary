# ToolBoundary implementation plan

## MVP contract

The first release provides a Python library and a Node.js library. Both libraries compare parser results with the arguments that a handler receives. Both libraries compare MCP results and errors that a client receives with explicit expectations. A report names the failed boundary.

Each case uses a stub handler. The caller registers the stub through its usual registration function. ToolBoundary captures the arguments at the stub. The case never registers a production tool body.

The first release supports JSON objects, arrays, strings, booleans, null values, and finite numbers. A missing key differs from a null value. Array order matters. Object key order does not matter. Other values need an explicit codec. The first release reports these values as `unsupported`.

`pass`, `fail`, `unsupported`, and `harness_error` are separate states. A framework rejection is a valid observation. A timeout has outcome `harness_error` unless a case expects a timeout.

## Tasks

| Stage | Python | Node.js | Shared result |
| --- | --- | --- | --- |
| 1. Contract | Add report types and comparison | Add matching types and comparison | Report schema and fixed fixtures |
| 2. MCP input | Run a stub through MCP Python v1 | Run a stub through MCP TypeScript v1 | Reports show parser and handler arguments |
| 3. MCP result and error | Compare explicit error and structured output | Compare explicit structured output and error | Known SDK defects produce `fail` reports |
| 4. WorkflowAgent | — | Run a fake model through WorkflowAgent v2 | Defaults and transforms produce `fail` reports on the affected version |
| 5. Distribution | Make a wheel and source archive | Make an npm archive and type declarations | Archives install outside the repository |

## Release gates

1. The comparison code finds missing keys, null differences, type differences, and nested differences.
2. The adapters use official SDK dispatch paths and stub handlers.
3. Fixtures for known defects produce `fail` at the expected boundary on pinned affected versions.
4. Control fixtures produce `pass`. WorkflowAgent `2.0.73` passes the cases that fail on `2.0.68`.
5. Both packages make reports that obey the same schema.
6. CI runs for each pull request. The package archives install in clean environments.
7. README examples run from the release archives.

## Later work

Add current MCP SDK v2 adapters after the v1 defect fixtures are stable. Add fuzzing and input shrinking after deterministic reports prove useful. Add Go when a user needs a Go tool adapter.
