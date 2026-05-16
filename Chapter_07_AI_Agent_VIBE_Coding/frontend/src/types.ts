export interface JiraCredentials {
  url: string;
  email: string;
  token: string;
}

export interface JiraIssue {
  issue_id: string;
  summary: string;
  description: string;
  issue_type: string;
  priority: string;
  components: string[];
}

export interface TestCase {
  id: string;
  title: string;
  type: 'Positive' | 'Negative' | 'Edge' | 'Boundary' | 'Security';
  priority: 'P0' | 'P1' | 'P2';
  preconditions: string;
  steps: string[];
  test_data: string;
  expected_result: string;
  linked_jira_id: string;
}

export type TemplateType = 'Functional' | 'Regression' | 'Smoke' | 'Edge' | 'Security' | 'Custom';

export type LLMProvider = 'claude' | 'groq';

export interface LLMProviderInfo {
  id: LLMProvider;
  name: string;
  model: string;
  icon: string;
}

export interface GenerationResult {
  status: string;
  latency_seconds: number;
  provider: string;
  model: string;
  test_cases: TestCase[];
}
