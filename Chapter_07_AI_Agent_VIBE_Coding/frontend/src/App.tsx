import { useState } from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';
import ConnectionPanel from './components/ConnectionPanel';
import InputPanel from './components/InputPanel';
import ContextCard from './components/ContextCard';
import OutputPanel from './components/OutputPanel';
import type { JiraCredentials, JiraIssue, TestCase, TemplateType, LLMProvider } from './types';
import { generateTestCases, TEMPLATES } from './api';

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  claude: 'Claude Sonnet',
  groq: 'Groq · Llama 3.3',
};

function App() {
  const [credentials, setCredentials] = useState<JiraCredentials>({ url: '', email: '', token: '' });
  const [connected, setConnected] = useState(false);
  const [issueData, setIssueData] = useState<JiraIssue | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('Functional');
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('claude');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [generating, setGenerating] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [genError, setGenError] = useState('');
  const [lastProvider, setLastProvider] = useState<string>('');

  const handleGenerate = async () => {
    if (!issueData) return;
    setGenerating(true);
    setGenError('');
    setTestCases([]);
    setLatency(null);
    try {
      const templateContent = TEMPLATES[selectedTemplate] || TEMPLATES['Functional'];
      const result = await generateTestCases(issueData, templateContent, selectedProvider);
      setTestCases(result.test_cases);
      setLatency(result.latency_seconds);
      setLastProvider(result.provider || selectedProvider);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message || 'Generation failed';
      setGenError(detail);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-surface-950/70 border-b border-surface-700/30">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">AI Test Generator</h1>
              <p className="text-[10px] text-surface-500 -mt-0.5 tracking-wide">VIBE Coding • Chapter 07</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-surface-500 bg-surface-800/60 px-2.5 py-1 rounded-lg border border-surface-700/50">
              Powered by {PROVIDER_LABELS[selectedProvider]}
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-surface-500 hover:text-surface-300 transition-colors"
              aria-label="GitHub"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left sidebar — Connection + Input */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6">
            <ConnectionPanel
              credentials={credentials}
              setCredentials={setCredentials}
              connected={connected}
              setConnected={setConnected}
            />
            <InputPanel
              credentials={credentials}
              connected={connected}
              issueData={issueData}
              setIssueData={setIssueData}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              selectedProvider={selectedProvider}
              setSelectedProvider={setSelectedProvider}
              onGenerate={handleGenerate}
              generating={generating}
            />
          </div>

          {/* Right content — Context + Output */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
            <ContextCard issue={issueData} />

            {/* Generation error */}
            {genError && (
              <div className="glass-card p-4 border-danger-500/30 fade-in">
                <p className="text-sm text-danger-400 font-medium mb-1">Generation Failed</p>
                <p className="text-xs text-danger-400/80">{genError}</p>
              </div>
            )}

            {/* Loading state */}
            {generating && (
              <div className="glass-card p-8 flex flex-col items-center justify-center fade-in">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full border-4 border-surface-700/30 border-t-primary-400 animate-spin" />
                  <Sparkles size={20} className="text-primary-400 absolute inset-0 m-auto" />
                </div>
                <p className="text-sm font-medium text-surface-200 mb-1">Generating Test Cases...</p>
                <p className="text-xs text-surface-500">
                  {selectedProvider === 'groq'
                    ? 'Groq is blazing through the user story with Llama 3.3'
                    : 'Claude is analyzing the user story and crafting test cases'}
                </p>
              </div>
            )}

            <OutputPanel
              testCases={testCases}
              setTestCases={setTestCases}
              latency={latency}
              provider={lastProvider}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-700/20 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-surface-600">AI Tester Blueprint 2x • Chapter 07 — VIBE Coding</p>
          <p className="text-xs text-surface-600">Tokens held in session only — never persisted</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
