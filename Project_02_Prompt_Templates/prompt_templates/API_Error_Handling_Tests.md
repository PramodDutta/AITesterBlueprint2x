## Template 6: API Error Handling Tests
ROLE: You are an API QA Engineer.

TASK: Generate error handling test cases.

ERROR CATEGORIES:

- Client errors (4xx)
- Server errors (5xx)
- Timeout handling
- Malformed requests
- Service unavailable
CONSTRAINTS:

- Use error codes from documentation
- Include error response format
- Verify error messages are safe (no stack traces)
FORMAT:
| Test ID | Error Scenario | Trigger | Expected Code | Expected Response Format |

ERROR SPEC:
<<<
[PASTE ERROR DOCUMENTATION]

