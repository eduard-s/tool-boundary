# ToolBoundary for Python

ToolBoundary examines tool calls in MCP Python SDK v1. It compares the direct parser result with the arguments that a registered stub handler receives. It compares the results and errors that the client receives with explicit expectations.

## Install

After publication, install the MCP adapter with `pip install 'tool-boundary[mcp-v1]'`.

The public PyPI index returned no package with this name on November 7, 2026. Another publisher can take the name before release.

## Example

[`examples/error_case.py`](examples/error_case.py) sends an explicit tool error through MCP Python SDK v1. It prints the report. On affected versions, it shows the difference at `/text`.

```sh
python examples/error_case.py
```

Use `probe_mcp_tool` in a pytest case. Set `reference` to a Pydantic model or another explicit parser. Pass a stub handler to `register`. Set `expected_structured` or `expected_error_text` to examine the response.

The adapter uses an in-memory MCP client session. It examines the client result from SDK dispatch. It does not examine HTTP or stdio transport behavior.

## Development

In this directory, make a virtual environment. Install the package with `pip install -e '.[dev]'`. Run `pytest` and `ruff check .`.

The adapter uses the official MCP server dispatch path. The caller registers a test handler through the same function as the application tool. Do not give the probe a production handler.

The [project README](https://github.com/eduard-s/tool-boundary#readme) describes the report format and defect cases.
