"""Deploy-check logic (tech-spec §3.5).

Pure validation over the project state passed in the request — no external
calls for v1. Returns the 4 checks plus an overall pass/fail and summary.
"""

from __future__ import annotations

from typing import Any


def run_deploy_check(
    *,
    total: int,
    checked: int,
    prd_approved: bool,
    spec_approved: bool,
    tasks_artifact_exists: bool,
) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []

    def add(name: str, passed: bool, message: str | None = None) -> None:
        checks.append({"name": name, "passed": passed, "message": message})

    all_done = total > 0 and checked == total
    add(
        "All tasks completed",
        all_done,
        None if all_done else f"{checked}/{total} tasks completed",
    )
    add("PRD approved", prd_approved, None if prd_approved else "PRD not approved")
    add("Spec approved", spec_approved, None if spec_approved else "Spec not approved")
    add(
        "Tasks artifact exists",
        tasks_artifact_exists,
        None if tasks_artifact_exists else "No tasks artifact found",
    )

    passed = all(c["passed"] for c in checks)
    n_passed = sum(1 for c in checks if c["passed"])
    return {
        "passed": passed,
        "checks": checks,
        "summary": f"{n_passed}/{len(checks)} checks passed",
    }
