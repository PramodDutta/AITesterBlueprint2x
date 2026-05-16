import { useState } from 'react';
import { Search, Loader2, FileText, ChevronDown, Sparkles, Zap } from 'lucide-react';
import type { JiraCredentials, JiraIssue, TemplateType, LLMProvider } from '../types';
import { fetchJiraIssue } from '../api';

interface Props {
  credentials: JiraCredentials;
  connected: boolean;
  issueData: JiraIssue | null;
  setIssueData: (d: JiraIssue | null) => void;
  selectedTemplate: TemplateType;
  setSelectedTemplate: (t: TemplateType) => void;
  selectedProvider: LLMProvider;
  setSelectedProvider: (p: LLMProvider) => void;
  onGenerate: () => void;
  generating: boolean;
}

const TEMPLATE_OPTIONS: TemplateType[] = ['Functional', 'Regression', 'Smoke', 'Edge', 'Security'];

const PROVIDER_OPTIONS: { id: LLMProvider; label: string; sublabel: string; icon: typeof Sparkles }[] = [
  { id: 'claude', label: 'Claude Sonnet', sublabel: 'Anthropic', icon: Sparkles },
  { id: 'groq', label: 'Llama 3.3 70B', sublabel: 'Groq (Fast)', icon: Zap },
];

export default function InputPanel({
  credentials,
  connected,
  issueData,
  setIssueData,
  selectedTemplate,
  setSelectedTemplate,
  selectedProvider,
  setSelectedProvider,
  onGenerate,
  generating,
}: Props) {
  const [issueId, setIssueId] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    if (!issueId.trim()) return;
    setFetching(true);
    setError('');
    setIssueData(null);
    try {
      const data = await fetchJiraIssue(credentials, issueId.trim().toUpperCase());
      setIssueData(data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message || 'Failed to fetch issue';
      setError(detail);
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-accent-500/15 flex items-center justify-center">
          <Search size={18} className="text-accent-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-surface-100">Issue Lookup</h2>
          <p className="text-xs text-surface-500">Fetch a Jira issue and configure generation</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* Issue ID input */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5" htmlFor="issue-id">Jira Issue ID</label>
          <div className="flex gap-2">
            <input
              id="issue-id"
              type="text"
              className="input-field flex-1"
              placeholder="e.g. PROJ-123"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              disabled={!connected}
            />
            <button
              id="fetch-issue-btn"
              className="btn-primary shrink-0 flex items-center gap-1.5"
              onClick={handleFetch}
              disabled={fetching || !connected || !issueId.trim()}
            >
              {fetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Fetch
            </button>
          </div>
          {!connected && (
            <p className="text-xs text-surface-500 mt-1.5">Connect to Jira first</p>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-xs text-danger-400 fade-in">
            {error}
          </div>
        )}

        {/* LLM Provider selector */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} />
              LLM Provider
            </div>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDER_OPTIONS.map((p) => {
              const Icon = p.icon;
              const active = selectedProvider === p.id;
              return (
                <button
                  key={p.id}
                  id={`provider-${p.id}`}
                  type="button"
                  onClick={() => setSelectedProvider(p.id)}
                  className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-primary-500/10 border-primary-500/40 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                      : 'bg-surface-900/40 border-surface-700/30 hover:border-surface-600/50 hover:bg-surface-800/30'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-primary-400' : 'text-surface-500'} />
                  <span className={`text-xs font-semibold leading-tight ${active ? 'text-surface-100' : 'text-surface-400'}`}>
                    {p.label}
                  </span>
                  <span className={`text-[10px] leading-tight ${active ? 'text-primary-400' : 'text-surface-600'}`}>
                    {p.sublabel}
                  </span>
                  {active && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-400 pulse-glow" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Template selector */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5" htmlFor="template-select">
            <div className="flex items-center gap-1.5">
              <FileText size={13} />
              Test Template
            </div>
          </label>
          <div className="relative">
            <select
              id="template-select"
              className="select-field pr-8"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as TemplateType)}
            >
              {TEMPLATE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none" />
          </div>
        </div>

        {/* Generate button */}
        <button
          id="generate-btn"
          className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
          onClick={onGenerate}
          disabled={generating || !issueData}
        >
          {generating ? (
            <>
              <div className="spinner" />
              Generating Test Cases...
            </>
          ) : (
            <>
              <FileText size={15} />
              Generate Test Cases
            </>
          )}
        </button>
      </div>
    </div>
  );
}
