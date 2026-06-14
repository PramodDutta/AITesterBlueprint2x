# Exercise 1 (Basic): Answer Relevancy & Hallucination Detection
# Level Basic : chatbot anwsers

# Goal:
#     Learn the two most fundamental LLM evaluation metrics:
#     1. Answer Relevancy  — Does the chatbot answer the question asked?
#     2. Hallucination      — Does the chatbot make up facts not in the context?


# Setup:
    # export GROQ_API_KEY=your_key_here
    # export OPENAI_API_KEY=your_key_here   # DeepEval uses this for judging


import sys
import requests # this module will help us to fetch the chat from the chat Ui
# We can make the API request via the requests module.
from deepeval.test_case import LLMTestCase
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric, HallucinationMetric

def test_hello_world():

    test = LLMTestCase(
        input="What is the 2+2",
        actual_output="4",
        expected_output="4",
        # HallucinationMetric needs grounding context against which the
        # actual_output is judged. Add a tiny factual context.
        context=["Basic arithmetic: 2 + 2 = 4."],
    )

    metric = [
        AnswerRelevancyMetric(threshold=0.8),
        HallucinationMetric(threshold=0.1),
    ]

    assert_test(test, metric)
