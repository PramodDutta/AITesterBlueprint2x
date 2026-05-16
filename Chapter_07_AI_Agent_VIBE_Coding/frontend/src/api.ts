import axios from 'axios';
import type { JiraCredentials, JiraIssue, TestCase, GenerationResult, LLMProvider, LLMProviderInfo } from './types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export async function testJiraConnection(credentials: JiraCredentials): Promise<{ status: string; message: string }> {
  const { data } = await api.post('/jira/test-connection', credentials);
  return data;
}

export async function fetchJiraIssue(credentials: JiraCredentials, issueId: string): Promise<JiraIssue> {
  const { data } = await api.post('/jira/fetch-issue', {
    credentials,
    issue_id: issueId,
  });
  return data;
}

export async function generateTestCases(
  issueData: JiraIssue,
  templateContent: string,
  provider: LLMProvider = 'claude'
): Promise<GenerationResult> {
  const { data } = await api.post('/testcases/generate', {
    issue_data: issueData,
    template_content: templateContent,
    provider,
  });
  return data;
}

export async function fetchProviders(): Promise<LLMProviderInfo[]> {
  const { data } = await api.get('/providers');
  return data.providers;
}

export async function exportTestCases(
  testCases: TestCase[],
  format: 'md' | 'csv'
): Promise<Blob> {
  const { data } = await api.post(
    '/testcases/export',
    { test_cases: testCases, format },
    { responseType: 'blob' }
  );
  return data;
}

// Template definitions that map to YAML template content
export const TEMPLATES: Record<string, string> = {
  Functional: `name: Functional Testing Template
description: Comprehensive functional test coverage
categories:
  - Functional
  - Positive
  - Negative
  - Edge
depth: comprehensive
tone: professional and structured
rules:
  - Generate a minimum of 5 test cases.
  - Cover the main happy path with positive tests.
  - Include at least 2 negative path tests.
  - Include an edge case if applicable.
  - Format output as a JSON conforming to the schema.`,

  Regression: `name: Regression Testing Template
description: Regression-focused test coverage
categories:
  - Regression
  - Functional
  - Integration
depth: thorough
tone: professional
rules:
  - Generate a minimum of 5 test cases.
  - Focus on areas that might break due to code changes.
  - Include boundary conditions.
  - Test error handling paths.
  - Validate integrations and data flows.`,

  Smoke: `name: Smoke Testing Template
description: Quick validation of critical paths
categories:
  - Smoke
  - Positive
depth: shallow
tone: concise
rules:
  - Generate 5 to 7 test cases.
  - Focus on critical user paths only.
  - Keep steps minimal.
  - Each test should validate a core feature.
  - Prioritize P0 and P1 scenarios.`,

  Edge: `name: Edge Case Testing Template
description: Edge and boundary condition testing
categories:
  - Edge
  - Boundary
  - Negative
depth: deep
tone: analytical
rules:
  - Generate a minimum of 5 test cases.
  - Focus on edge cases and boundary conditions.
  - Include null/empty/max length inputs.
  - Test concurrency and race conditions if applicable.
  - Include unusual user behaviors.`,

  Security: `name: Security Testing Template
description: Security-focused test coverage
categories:
  - Security
  - Negative
  - Edge
depth: deep
tone: security-focused
rules:
  - Generate a minimum of 5 test cases.
  - Test for SQL injection, XSS, and CSRF.
  - Validate authentication and authorization.
  - Check input sanitization.
  - Test for data exposure risks.
  - Include privilege escalation scenarios.`,
};
