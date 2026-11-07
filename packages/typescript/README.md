# ToolBoundary for Node.js

ToolBoundary examines tool input, results, and errors. The first adapters support MCP TypeScript SDK v1 and AI SDK WorkflowAgent v2.

## Install

Install `@esmirnov.ai/tool-boundary` from npm. Install the SDK for the adapter that you use.

## Examples

Run these examples after `npm run build`:

```sh
node examples/mcp-output.mjs
node examples/workflow-input.mjs
```

The [MCP example](examples/mcp-output.mjs) compares parsed structured output with the client response. The [WorkflowAgent example](examples/workflow-input.mjs) compares a Zod parser result with the tool executor arguments. Both examples use stub handlers.

Import `probeMcpTool` from `@esmirnov.ai/tool-boundary/mcp-v1`. Import `probeWorkflowTool` from `@esmirnov.ai/tool-boundary/workflow`.

For WorkflowAgent, pass `makeTool` if your application has its own tool factory. The probe gives that factory a stub executor.

The MCP adapter uses a local transport that converts each protocol message to JSON. The WorkflowAgent adapter uses a fake model. It needs no API key.

## Development

Run `npm install`, `npm test`, and `npm run build` in this directory.

The development lockfile uses current SDK versions. A separate CI job installs historical versions for regression cases. SDK development dependencies cause npm audit findings. The package has no bundled runtime dependencies. On this lockfile, `npm audit --omit=dev` finds no issues.

The probe registers a supplied test handler. It captures the handler input and examines the client response. It does not register a production tool body.

The [project README](https://github.com/eduard-s/tool-boundary#readme) describes the report format and defect cases.
