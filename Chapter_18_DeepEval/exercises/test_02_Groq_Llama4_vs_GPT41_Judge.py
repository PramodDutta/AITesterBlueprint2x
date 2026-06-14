"""
Exercise 2: Real LLM under test, real LLM as judge.

  - **Model under test:**  Groq Llama-4 Scout (meta-llama/llama-4-scout-17b-16e-instruct)
  - **Judge:**             OpenAI GPT-4.1

Flow:
  1. Send "What is 2+2?" to Groq Llama-4.
  2. Capture the raw answer.
  3. Hand input + answer + context to DeepEval.
  4. GPT-4.1 scores AnswerRelevancy + Hallucination.

Run:
    cd Chapter_18_DeepEval
    source venv/bin/activate
    deepeval test run exercises/test_02_Groq_Llama4_vs_GPT41_Judge.py -d all -v
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric, HallucinationMetric
from deepeval.test_case import LLMTestCase

# Load .env / .env.local from the chapter root so the test runs even when
# pytest is invoked from a sibling directory.
CHAPTER_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(CHAPTER_ROOT / ".env")
load_dotenv(CHAPTER_ROOT / ".env.local", override=True)


GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
JUDGE_MODEL = "gpt-4.1"


def _groq_client() -> OpenAI:
    key = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_KEY")
    if not key:
        raise RuntimeError("GROQ_API_KEY not set in env / .env.local")
    return OpenAI(api_key=key, base_url="https://api.groq.com/openai/v1")

def ask_groq(question: str) -> str:
    """Send a single user message to Groq Llama-4 and return the raw text."""
    resp = _groq_client().chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": question}],
        temperature=0.0,
    )
    return (resp.choices[0].message.content or "").strip()


def test_groq_llama4_basic_math():
    """Ask the simplest possible math question. GPT-4.1 judges the answer."""
    question = "What is 2+2? Reply with just the number."
    answer = ask_groq(question)
    print(f"\n[Groq {GROQ_MODEL}] → {answer!r}\n")

    case = LLMTestCase(
        input=question,
        actual_output=answer,
        expected_output="4",
        # HallucinationMetric scores actual_output against this grounding text.
        context=["Basic arithmetic fact: 2 + 2 = 4."],
    )

    metrics = [
        AnswerRelevancyMetric(threshold=0.8, model=JUDGE_MODEL),
        HallucinationMetric(threshold=0.3, model=JUDGE_MODEL),
    ]

    assert_test(case, metrics)
