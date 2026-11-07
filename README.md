# ToolBoundary

ToolBoundary examines the values that an AI tool handler receives and the values that a client receives. It finds differences between a source parser and a framework tool path.

For example, a parser adds `limit: 10` to an input. A framework sends no `limit` to the handler. ToolBoundary reports the missing value.

The project has Python and Node.js packages. Both packages use the same report format. Each package has a separate version and release.

## Scope

The first release examines three boundaries:

1. ToolBoundary compares input parser results with registered handler arguments.
2. ToolBoundary compares handler results with MCP responses that the client receives.
3. ToolBoundary compares handler errors with MCP errors that the client receives.

The Python adapter supports MCP Python SDK v1. The Node.js package supports MCP TypeScript SDK v1 and AI SDK WorkflowAgent v2. Each package runs a test handler through a public SDK path. It does not run production tool bodies.

ToolBoundary compares values with explicit expectations. JSON Schema defines valid data. It does not add defaults or give a parsed result.

## Packages

| Runtime | Package directory | Registry |
| --- | --- | --- |
| Python | [`packages/python`](packages/python) | PyPI |
| Node.js | [`packages/typescript`](packages/typescript) | npm |

On November 7, 2026, public npm and PyPI searches returned no package with these names. Before publication, examine name availability and ownership in each registry.

Start with the [Python example](packages/python/examples/error_case.py), the [MCP Node.js example](packages/typescript/examples/mcp-output.mjs), or the [WorkflowAgent example](packages/typescript/examples/workflow-input.mjs).

## Reports

Each case has one result: `pass`, `fail`, `unsupported`, or `harness_error`. A report names the case, framework version, boundary, expected value, observed value, and difference path. An `unsupported` result does not mean `pass`.

Each allowed difference needs an exact field path and a reason. The report records it in `allowedDifferences`. The rules do not support wildcards.

The shared report contract is [`spec/report-v1.md`](spec/report-v1.md). The first fixtures are in [`fixtures`](fixtures). The release tasks are in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).

## Defects in the first fixtures

- [WorkflowAgent input parser bypass](https://github.com/vercel/ai/issues/22373): The handler did not receive parser defaults, transforms, or refinements. The [fix](https://github.com/vercel/ai/pull/22397) merged in October 2026.
- [MCP TypeScript output mismatch](https://github.com/modelcontextprotocol/typescript-sdk/issues/2464): the SDK examined parsed output but sent the original object.
- [MCP Python error mismatch](https://github.com/modelcontextprotocol/python-sdk/issues/2429): output validation replaced an explicit tool error.

These defect reports apply to specified SDK versions. The fixtures make no claim about all later releases.

## Development

Python and Node.js use separate package tools. Read each package README for install instructions and tests. Shared fixtures run in both CI jobs. Publication steps are in [`PUBLISHING.md`](PUBLISHING.md).

## License

MIT. See [`LICENSE`](LICENSE).
