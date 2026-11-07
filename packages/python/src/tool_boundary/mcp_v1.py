"""Probe MCP Python SDK v1 through a local client and a stub handler."""

from __future__ import annotations

import asyncio
import inspect
import json
from collections.abc import Callable, Mapping
from functools import wraps
from importlib.metadata import version
from typing import Any

from pydantic import BaseModel, ValidationError

from .core import (
    Allowance,
    Observation,
    ProbeReport,
    UnsupportedValueError,
    compare_values,
    make_observation,
)

_UNSET = object()


def _plain(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, Mapping):
        return dict(value)
    raise ValueError("The reference must return a mapping or a Pydantic model")


async def probe_mcp_tool(
    *,
    case_id: str,
    tool_name: str,
    arguments: dict[str, Any],
    reference: Callable[[dict[str, Any]], Mapping[str, Any] | BaseModel],
    register: Callable[[Any, Callable[..., Any]], None],
    stub_handler: Callable[..., Any],
    expected_structured: Any = _UNSET,
    expected_error_text: str | None = None,
    timeout_seconds: float = 5.0,
    allowances: list[Allowance] | None = None,
) -> ProbeReport:
    """Run one case through MCP v1. Register only the supplied stub handler.

    ``register`` receives a fresh FastMCP instance and a wrapped stub handler.
    Register that wrapper through the same public function as the real tool.
    """
    try:
        from mcp.server.fastmcp import FastMCP
        from mcp.shared.memory import create_connected_server_and_client_session
    except ImportError as exc:
        return ProbeReport(
            case_id, "python", "mcp-python-v1", {}, "unsupported", [], str(exc)
        )

    dependencies = {"mcp": version("mcp"), "pydantic": version("pydantic")}
    observations: list[Observation] = []
    called = False
    captured: Any = None
    try:
        compare_values(arguments, arguments)
        raw = json.loads(json.dumps(arguments, allow_nan=False))
        try:
            parsed = _plain(reference(json.loads(json.dumps(raw))))
            expected_input = {"called": True, "arguments": parsed}
        except ValidationError:
            expected_input = {"called": False}

        @wraps(stub_handler)
        async def spy(*args: Any, **kwargs: Any) -> Any:
            nonlocal called, captured
            called = True
            captured = kwargs if not args else {"$args": list(args), "$kwargs": kwargs}
            result = stub_handler(*args, **kwargs)
            return await result if inspect.isawaitable(result) else result

        server = FastMCP("tool-boundary-probe")
        register(server, spy)
        client_error: str | None = None
        response: Any = None
        registration_missing = False
        async with create_connected_server_and_client_session(server) as client:
            tools = await asyncio.wait_for(client.list_tools(), timeout=timeout_seconds)
            if not any(tool.name == tool_name for tool in tools.tools):
                registration_missing = True
            else:
                try:
                    response = await asyncio.wait_for(
                        client.call_tool(tool_name, raw), timeout=timeout_seconds
                    )
                except Exception as exc:  # The client rejection is an observation.
                    if isinstance(exc, TimeoutError):
                        raise
                    client_error = f"{type(exc).__name__}: {exc}"

        if registration_missing:
            return ProbeReport(
                case_id, "python", "mcp-python-v1", dependencies, "harness_error", [],
                f"The test tool {tool_name!r} was not registered", input=raw,
            )

        observed_input = {"called": called}
        if called:
            observed_input["arguments"] = captured
        observations.append(make_observation(
            "input", expected_input, observed_input, allowances
        ))

        if expected_structured is not _UNSET:
            observed_result = (
                {"clientError": client_error} if client_error else
                {"structuredContent": response.structuredContent}
            )
            expected_result = {"structuredContent": expected_structured}
            observations.append(make_observation(
                "result", expected_result, observed_result, allowances
            ))
        if expected_error_text is not None:
            observed_error = (
                {"clientError": client_error} if client_error else
                {
                    "isError": bool(response.isError),
                    "text": "\n".join(
                        item.text for item in response.content if item.type == "text"
                    ),
                }
            )
            expected_error = {"isError": True, "text": expected_error_text}
            observations.append(make_observation(
                "error", expected_error, observed_error, allowances
            ))
        outcome = "fail" if any(item.differences for item in observations) else "pass"
        return ProbeReport(
            case_id, "python", "mcp-python-v1", dependencies, outcome, observations,
            input=raw,
        )
    except UnsupportedValueError as exc:
        return ProbeReport(
            case_id, "python", "mcp-python-v1", dependencies, "unsupported", observations,
            str(exc),
        )
    except Exception as exc:  # noqa: BLE001 - A failed harness must produce a report.
        return ProbeReport(
            case_id, "python", "mcp-python-v1", dependencies, "harness_error", observations,
            f"{type(exc).__name__}: {exc}",
        )
