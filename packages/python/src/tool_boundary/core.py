"""Shared report semantics for the Python package."""

from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

Outcome = Literal["pass", "fail", "unsupported", "harness_error"]
Boundary = Literal["input", "result", "error"]
MISSING = {"kind": "missing"}


class UnsupportedValueError(ValueError):
    """A value is outside the portable JSON comparison profile."""


@dataclass(frozen=True)
class Difference:
    path: str
    expected: Any
    observed: Any


@dataclass(frozen=True)
class Allowance:
    boundary: Boundary
    path: str
    reason: str


@dataclass(frozen=True)
class AllowedDifference:
    path: str
    expected: Any
    observed: Any
    reason: str


@dataclass(frozen=True)
class Observation:
    boundary: Boundary
    expected: Any
    observed: Any
    differences: list[Difference] = field(default_factory=list)
    allowed_differences: list[AllowedDifference] = field(default_factory=list)


@dataclass(frozen=True)
class ProbeReport:
    case_id: str
    runtime: Literal["python"]
    adapter: str
    dependency_versions: dict[str, str]
    outcome: Outcome
    observations: list[Observation]
    message: str | None = None
    schema_version: int = 1
    input: dict[str, Any] | None = None

    def __post_init__(self) -> None:
        if self.outcome in {"pass", "fail"} and not self.observations:
            raise ValueError("A pass or fail report needs an observation")
        has_differences = any(item.differences for item in self.observations)
        if self.outcome == "pass" and has_differences:
            raise ValueError("A passing report cannot contain differences")
        if self.outcome == "fail" and not has_differences:
            raise ValueError("A failing report needs a difference")

    def to_dict(self) -> dict[str, Any]:
        return {
            "schemaVersion": self.schema_version,
            "caseId": self.case_id,
            "runtime": self.runtime,
            "adapter": self.adapter,
            "dependencyVersions": self.dependency_versions,
            "outcome": self.outcome,
            "observations": [
                {
                    "boundary": item.boundary,
                    "expected": item.expected,
                    "observed": item.observed,
                    "differences": [asdict(diff) for diff in item.differences],
                    "allowedDifferences": [asdict(diff) for diff in item.allowed_differences],
                }
                for item in self.observations
            ],
            **({"input": self.input} if self.input is not None else {}),
            **({"message": self.message} if self.message else {}),
        }


def report_to_json(report: ProbeReport) -> str:
    return json.dumps(report.to_dict(), allow_nan=False, sort_keys=True, indent=2)


def _json_value(value: Any) -> bool:
    if value is None or isinstance(value, (str, bool)):
        return True
    if isinstance(value, int):
        return abs(value) <= 2**53 - 1
    if isinstance(value, float):
        return math.isfinite(value)
    if isinstance(value, list):
        return all(_json_value(item) for item in value)
    if isinstance(value, dict):
        return all(isinstance(key, str) and _json_value(item) for key, item in value.items())
    return False


def compare_values(expected: Any, observed: Any) -> list[Difference]:
    """Compare JSON values. Absent keys differ from explicit nulls."""
    if not _json_value(expected) or not _json_value(observed):
        raise UnsupportedValueError("The JSON comparison profile does not support this value")
    if _contains_reserved(expected) or _contains_reserved(observed):
        raise UnsupportedValueError("The value contains the reserved missing marker")
    differences: list[Difference] = []

    def walk(left: Any, right: Any, path: str) -> None:
        both_numbers = (
            isinstance(left, (int, float)) and not isinstance(left, bool)
            and isinstance(right, (int, float)) and not isinstance(right, bool)
        )
        if type(left) is not type(right) and not both_numbers:
            differences.append(Difference(path, left, right))
            return
        if isinstance(left, dict):
            for key in sorted(left.keys() | right.keys()):
                child = f"{path}/{key.replace('~', '~0').replace('/', '~1')}"
                if key not in left:
                    differences.append(Difference(child, MISSING, right[key]))
                elif key not in right:
                    differences.append(Difference(child, left[key], MISSING))
                else:
                    walk(left[key], right[key], child)
        elif isinstance(left, list):
            for index in range(max(len(left), len(right))):
                child = f"{path}/{index}"
                if index >= len(left):
                    differences.append(Difference(child, MISSING, right[index]))
                elif index >= len(right):
                    differences.append(Difference(child, left[index], MISSING))
                else:
                    walk(left[index], right[index], child)
        elif left != right:
            differences.append(Difference(path, left, right))

    walk(expected, observed, "")
    return differences


def make_observation(
    boundary: Boundary,
    expected: Any,
    observed: Any,
    allowances: list[Allowance] | None = None,
) -> Observation:
    """Compare values and record exact, justified exceptions."""
    rules = allowances or []
    selected: dict[str, str] = {}
    for rule in rules:
        if not rule.path.startswith("/") or "*" in rule.path or not rule.reason.strip():
            raise ValueError("An allowance needs an exact non-root path and a reason")
        if rule.boundary == boundary:
            if rule.path in selected:
                raise ValueError("An allowance path can occur only once per boundary")
            selected[rule.path] = rule.reason
    differences: list[Difference] = []
    allowed: list[AllowedDifference] = []
    for diff in compare_values(expected, observed):
        if diff.path in selected:
            allowed.append(
                AllowedDifference(diff.path, diff.expected, diff.observed, selected[diff.path])
            )
        else:
            differences.append(diff)
    return Observation(boundary, expected, observed, differences, allowed)


def _contains_reserved(value: Any) -> bool:
    if value == MISSING:
        return True
    if isinstance(value, dict):
        return any(_contains_reserved(item) for item in value.values())
    if isinstance(value, list):
        return any(_contains_reserved(item) for item in value)
    return False
