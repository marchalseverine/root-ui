"""LLM streaming abstraction.

Uses the Anthropic Messages streaming API when ANTHROPIC_API_KEY is set.
Falls back to a deterministic mock stream otherwise, so the SSE pipeline can be
exercised end-to-end without a real key.
"""

from __future__ import annotations

import asyncio
import os
from typing import AsyncIterator

DEFAULT_MODEL = os.environ.get("LLM_MODEL", "claude-sonnet-4-6")


def get_model() -> str:
    """Model name reported in the `done` event."""
    return DEFAULT_MODEL if os.environ.get("ANTHROPIC_API_KEY") else "mock"


async def stream_completion(
    system: str, user: str, *, model: str | None = None
) -> AsyncIterator[str]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        async for chunk in _mock_stream(system, user):
            yield chunk
        return

    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=api_key)
    async with client.messages.stream(
        model=model or DEFAULT_MODEL,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user}],
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def _mock_stream(system: str, user: str) -> AsyncIterator[str]:
    # Includes a checklist so the tasks-approval path (markdown parsing) works
    # without a real key.
    sample = (
        "# Generated draft (mock)\n\n"
        "ANTHROPIC_API_KEY is not set, so this is a canned stream that exercises "
        "the SSE pipeline. Set the key in fastapi-service/.env for real output.\n\n"
        "## Section A\n"
        "- [ ] First task\n"
        "- [ ] Second task\n"
        "- [ ] Third task\n"
    )
    for token in sample.split(" "):
        yield token + " "
        await asyncio.sleep(0.005)
