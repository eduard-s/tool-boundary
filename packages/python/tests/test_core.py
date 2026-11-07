import json
from pathlib import Path

import pytest
from jsonschema import validate

from tool_boundary import Allowance, Observation, ProbeReport, compare_values, make_observation


@pytest.mark.parametrize(
    "case",
    json.loads(
        (Path(__file__).resolve().parents[3] / "fixtures" / "comparisons.json").read_text()
    ),
    ids=lambda case: case["id"],
)
def test_shared_comparison_cases(case):
    differences = compare_values(case["expected"], case["observed"])
    assert [item.path for item in differences] == case["paths"]


def test_unsupported_value():
    with pytest.raises(ValueError, match="JSON comparison profile"):
        compare_values({"x": {1, 2}}, {"x": [1, 2]})
    with pytest.raises(ValueError, match="JSON comparison profile"):
        compare_values({"x": float("nan")}, {"x": 1})


def test_report_obeys_shared_schema():
    schema = json.loads(
        (Path(__file__).resolve().parents[3] / "spec" / "report-v1.schema.json").read_text()
    )
    report = ProbeReport(
        "case", "python", "mcp-python-v1", {"mcp": "1.26.0"}, "pass",
        [Observation("input", {"called": True}, {"called": True})],
    )
    validate(report.to_dict(), schema)


def test_empty_pass_report_is_invalid():
    with pytest.raises(ValueError, match="needs an observation"):
        ProbeReport("case", "python", "mcp-python-v1", {}, "pass", [])


def test_exact_allowance_keeps_the_difference_visible():
    observation = make_observation(
        "input", {"tag": "SALE"}, {"tag": "sale"},
        [Allowance("input", "/tag", "The wrapper keeps the original tag")],
    )
    assert observation.differences == []
    assert observation.allowed_differences[0].reason == "The wrapper keeps the original tag"


def test_wildcard_allowance_is_invalid():
    with pytest.raises(ValueError, match="exact non-root path"):
        make_observation(
            "input", {"tag": "SALE"}, {"tag": "sale"},
            [Allowance("input", "/*", "Ignore all tags")],
        )
