"""Show the MCP Python v1 error-preservation defect."""

import asyncio

from mcp.types import CallToolResult, TextContent

from tool_boundary import probe_mcp_tool, report_to_json


def divide() -> float:
    return CallToolResult(
        isError=True,
        content=[TextContent(type="text", text="Division by zero")],
    )


def register(server, handler):
    server.tool()(handler)


async def main():
    report = await probe_mcp_tool(
        case_id="python.error-preservation",
        tool_name="divide",
        arguments={},
        reference=lambda _: {},
        register=register,
        stub_handler=divide,
        expected_error_text="Division by zero",
    )
    print(report_to_json(report))


if __name__ == "__main__":
    asyncio.run(main())
