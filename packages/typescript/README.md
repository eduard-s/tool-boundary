# ToolBoundary for Node.js

ToolBoundary examines input, result, and error behavior across AI tool boundaries. The first adapters support MCP TypeScript SDK v1 and AI SDK WorkflowAgent v2.

## Install

After publication, install `@eduard-s/tool-boundary` from npm. Install the SDK for the adapter that you use. The npm registry did not return this package on November 7, 2026. The npm account must control the `@eduard-s` scope.

## Examples

Run these examples after `npm run build`:

```sh
node examples/mcp-output.mjs
node examples/workflow-input.mjs
```

The [MCP example](examples/mcp-output.mjs) compares parsed structured output with the client response. The [WorkflowAgent example](examples/workflow-input.mjs) compares a Zod parser result with the tool executor arguments. Both examples use stub handlers.

Import `probeMcpTool` from `@eduard-s/tool-boundary/mcp-v1`. Import `probeWorkflowTool` from `@eduard-s/tool-boundary/workflow`.

For WorkflowAgent, pass `makeTool` when your application has its own tool factory. The probe passes a stub executor into that factory.

The MCP adapter uses a local transport that serializes each protocol message to JSON. The WorkflowAgent adapter uses a fake model. It needs no API key.

## Development

Run `npm install`, `npm test`, and `npm run build` in this directory.

The development lockfile uses current SDK versions. A separate CI job installs historical versions for regression cases. SDK development dependencies produce npm audit findings. The package has no bundled runtime dependencies, and `npm audit --omit=dev` reports no findings on this lockfile.

The probe registers a supplied test handler. It captures that handler's input and observes the client response. It never registers a production tool body.

The [project README](https://github.com/eduard-s/tool-boundary#readme) describes the report format and defect cases.
