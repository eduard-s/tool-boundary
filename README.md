# ToolBoundary

ToolBoundary examines what an AI tool handler receives and what a client receives. It finds differences between a source parser and a framework's tool path.

For example, a parser adds `limit: 10`. A framework passes no `limit` to the handler. ToolBoundary reports the missing value at the handler boundary.

The project has native Python and Node.js packages. Both packages use the same report format. Each package has its own version and release.

## Scope

The first release examines three boundaries:

1. Input parser to registered handler arguments.
2. Handler result to client-visible MCP response.
3. Handler error to client-visible MCP error.

The Python adapter supports the MCP Python SDK v1. The Node.js package supports MCP TypeScript SDK v1 and AI SDK WorkflowAgent v2. The package runs test handlers through public SDK dispatch paths. It does not run production tool bodies.

ToolBoundary compares explicit expectations. JSON Schema defines validity. It does not define a parsed result or insert defaults.

## Packages

| Runtime | Package directory | Registry |
| --- | --- | --- |
| Python | [`packages/python`](packages/python) | PyPI |
| Node.js | [`packages/typescript`](packages/typescript) | npm |

On November 7, 2026, the public npm and PyPI endpoints did not return these package names. Registry ownership and name availability need a final examination before publication.

Start with the [Python example](packages/python/examples/error_case.py), the [MCP Node.js example](packages/typescript/examples/mcp-output.mjs), or the [WorkflowAgent example](packages/typescript/examples/workflow-input.mjs).

## Reports

Each case has one result: `pass`, `fail`, `unsupported`, or `harness_error`. Reports name the case, framework version, boundary, expected value, observed value, and differing path. An unsupported comparison never counts as a pass.

An intentional difference needs an exact field path and a reason. The report keeps that difference in `allowedDifferences`. Wildcard rules are not supported.

The shared report contract is [`spec/report-v1.md`](spec/report-v1.md). The first fixtures are in [`fixtures`](fixtures). The release tasks are in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).

## Published defects that guide the first fixtures

- [WorkflowAgent input parser bypass](https://github.com/vercel/ai/issues/22373): defaults, transforms, and refinements did not reach the handler. The [fix](https://github.com/vercel/ai/pull/22397) merged in October 2026.
- [MCP TypeScript output mismatch](https://github.com/modelcontextprotocol/typescript-sdk/issues/2464): the SDK examined parsed output but sent the original object.
- [MCP Python error mismatch](https://github.com/modelcontextprotocol/python-sdk/issues/2429): output validation replaced an explicit tool error.

These reports describe specified SDK versions. The fixtures do not make claims about every later release.

## Development

Python and Node.js use separate package tools. See each package README for install and test instructions. Shared fixtures run in both CI jobs. Publication steps are in [`PUBLISHING.md`](PUBLISHING.md).

## License

MIT. See [`LICENSE`](LICENSE).
