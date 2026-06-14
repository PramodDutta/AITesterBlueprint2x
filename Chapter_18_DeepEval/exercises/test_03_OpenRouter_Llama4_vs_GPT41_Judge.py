"""
Exercise 3: Same shape as Exercise 2, but the model under test is served
via **OpenRouter** instead of Groq.

  - **Model under test:**  meta-llama/llama-4-scout (via OpenRouter)
  - **Judge:**             OpenAI GPT-4.1

Why OpenRouter?
  OpenRouter is a model gateway: one OpenAI-compatible API endpoint that
  fronts hundreds of models from many providers (Meta, Anthropic, Google,
  Mistral, DeepSeek, Qwen, ...). Same code shape as Groq — only the
  base URL, the model id, and the API key change.

Setup:
  Add to Chapter_18_DeepEval/.env.local:
      OPENROUTER_API_KEY=sk-or-v1-xxxx          # get from https://openrouter.ai/keys
      OPENAI_API_KEY=sk-xxxx                    # judge

Run:
    cd Chapter_18_DeepEval
    source venv/bin/activate
    deepeval test run exercises/test_03_OpenRouter_Llama4_vs_GPT41_Judge.py -d all -v
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric, HallucinationMetric
from deepeval.test_case import LLMTestCase

# Load .env / .env.local from the chapter root.
CHAPTER_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(CHAPTER_ROOT / ".env")
load_dotenv(CHAPTER_ROOT / ".env.local", override=True)


# OpenRouter model ids follow the pattern <publisher>/<model> (+ optional
# ":free" / ":nitro" / etc. variant). Swap freely without changing anything
# else in this file.
OPENROUTER_MODEL = "meta-llama/llama-4-scout"
JUDGE_MODEL = "gpt-4.1"


def _openrouter_client() -> OpenAI:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError(
            "OPENROUTER_API_KEY not set. Add it to .env.local — get one at "
            "https://openrouter.ai/keys"
        )
    return OpenAI(
        api_key=key,
        base_url="https://openrouter.ai/api/v1",
        # OpenRouter recommends these headers for analytics + rate-limit tiering.
        default_headers={
            "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "https://thetestingacademy.com"),
            "X-Title": os.getenv("OPENROUTER_APP", "TestingAcademy DeepEval"),
        },
    )


def ask_openrouter(question: str) -> str:
    """Send a single user message via OpenRouter and return the raw text."""
    resp = _openrouter_client().chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[{"role": "user", "content": question}],
        temperature=0.0,
    )
    return (resp.choices[0].message.content or "").strip()


def test_openrouter_llama4_basic_math():
    """Ask 2+2. GPT-4.1 judges the answer."""
    question = "What is 2+2? Reply with just the number."
    answer = ask_openrouter(question)
    print(f"\n[OpenRouter {OPENROUTER_MODEL}] → {answer!r}\n")

    case = LLMTestCase(
        input=question,
        actual_output=answer,
        expected_output="4",
        context=["Basic arithmetic fact: 2 + 2 = 4."],
    )

    metrics = [
        AnswerRelevancyMetric(threshold=0.8, model=JUDGE_MODEL),
        HallucinationMetric(threshold=0.3, model=JUDGE_MODEL),
    ]

    assert_test(case, metrics)
