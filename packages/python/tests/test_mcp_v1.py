import asyncio
import json
from pathlib import Path

import pytest
from jsonschema import validate
from mcp.types import CallToolResult, TextContent
from pydantic import BaseModel

from tool_boundary import probe_mcp_tool


class Input(BaseModel):
    limit: int = 10


def register(server, handler):
    server.tool()(handler)


@pytest.mark.asyncio
async def test_mcp_default_reaches_handler():
    def count(limit: int = 10) -> dict[str, int]:
        return {"count": limit}

    report = await probe_mcp_tool(
        case_id="python.default",
        tool_name="count",
        arguments={},
        reference=Input.model_validate,
        register=register,
        stub_handler=count,
        expected_structured={"count": 10},
    )
    assert report.outcome == "pass", report.to_dict()
    assert len(report.observations) == 2
    schema = json.loads(
        (Path(__file__).resolve().parents[3] / "spec" / "report-v1.schema.json").read_text()
    )
    validate(report.to_dict(), schema)


@pytest.mark.asyncio
async def test_mcp_error_survives_success_output_schema():
    def divide() -> float:
        return CallToolResult(
            isError=True,
            content=[TextContent(type="text", text="Division by zero")],
        )

    report = await probe_mcp_tool(
        case_id="python.error-preservation",
        tool_name="divide",
        arguments={},
        reference=lambda _: {},
        register=register,
        stub_handler=divide,
        expected_error_text="Division by zero",
    )
    assert report.outcome == "fail", report.to_dict()
    assert report.observations[-1].boundary == "error"


@pytest.mark.asyncio
async def test_timeout_is_harness_error():
    async def slow() -> int:
        await asyncio.sleep(1)
        return 1

    report = await probe_mcp_tool(
        case_id="python.timeout",
        tool_name="slow",
        arguments={},
        reference=lambda _: {},
        register=register,
        stub_handler=slow,
        timeout_seconds=0.001,
    )
    assert report.outcome == "harness_error"


@pytest.mark.asyncio
async def test_non_json_input_is_unsupported():
    def count(limit: int) -> int:
        return limit

    report = await probe_mcp_tool(
        case_id="python.non-json", tool_name="count",
        arguments={"limit": float("nan")},
        reference=lambda raw: raw, register=register, stub_handler=count,
    )
    assert report.outcome == "unsupported"


@pytest.mark.asyncio
async def test_wrong_tool_name_is_harness_error():
    def count(limit: int) -> int:
        return limit

    report = await probe_mcp_tool(
        case_id="python.wrong-name", tool_name="missing", arguments={"limit": 1},
        reference=lambda raw: raw, register=register, stub_handler=count,
    )
    assert report.outcome == "harness_error"
    assert "not registered" in report.message
