# ToolBoundary for Python

ToolBoundary examines tool calls in the MCP Python SDK v1. It compares a direct parser result with the arguments that a registered stub handler receives. It also compares client-visible results and errors with explicit expectations.

## Install

After publication, install the MCP adapter with `pip install 'tool-boundary[mcp-v1]'`.

The package name was absent from the public PyPI index on November 7, 2026. The name remains available only until another publisher takes it.

## Example

[`examples/error_case.py`](examples/error_case.py) sends an explicit tool error through MCP Python SDK v1. It prints the report and the difference at `/text` on affected versions.

```sh
python examples/error_case.py
```

Use `probe_mcp_tool` in a pytest case. Pass a Pydantic model or another explicit parser as `reference`. Pass a stub handler to `register`. Add `expected_structured` or `expected_error_text` when the case examines the response.

The adapter uses an in-memory MCP client session. It examines the client result from SDK dispatch. It does not examine HTTP or stdio transport behavior.

## Development

From this directory, make a virtual environment and install the package with `pip install -e '.[dev]'`. Run `pytest` and `ruff check .`.

The adapter uses the official MCP server dispatch path. The caller supplies a test handler and registers it through the same function as the application tool. Do not pass a production handler into the probe.

The [project README](https://github.com/eduard-s/tool-boundary#readme) describes the report format and defect cases.
