import { useState } from 'react';
import {
  ClipboardCopy,
  Download,
  FileText,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  Pencil,
  X,
  Save,
} from 'lucide-react';
import type { TestCase } from '../types';
import { exportTestCases } from '../api';

interface Props {
  testCases: TestCase[];
  setTestCases: (tc: TestCase[]) => void;
  latency: number | null;
  provider?: string;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = priority === 'P0' ? 'badge-p0' : priority === 'P1' ? 'badge-p1' : 'badge-p2';
  return <span className={`badge ${cls}`}>{priority}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const cls =
    type === 'Positive'
      ? 'badge-positive'
      : type === 'Negative'
      ? 'badge-negative'
      : type === 'Edge'
      ? 'badge-edge'
      : type === 'Boundary'
      ? 'badge-boundary'
      : 'badge-security';
  return <span className={`badge ${cls}`}>{type}</span>;
}

function TestCaseRow({
  tc,
  index,
  onUpdate,
}: {
  tc: TestCase;
  index: number;
  onUpdate: (idx: number, tc: TestCase) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TestCase>(tc);

  const handleSave = () => {
    onUpdate(index, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(tc);
    setEditing(false);
  };

  return (
    <div className="border-b border-surface-700/30 last:border-b-0 transition-colors hover:bg-surface-800/20">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => !editing && setExpanded(!expanded)}>
        <span className="text-surface-500 shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="text-xs font-mono text-primary-400 shrink-0 w-16">{tc.id}</span>
        <span className="text-sm text-surface-200 flex-1 min-w-0 truncate">{tc.title}</span>
        <TypeBadge type={tc.type} />
        <PriorityBadge priority={tc.priority} />
        <button
          className="btn-ghost p-1.5 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(!editing);
            setExpanded(true);
          }}
          aria-label="Edit test case"
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 ml-8 fade-in">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-surface-500">Title</label>
                <input className="input-field mt-1" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-surface-500">Type</label>
                  <select className="select-field mt-1" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as TestCase['type'] })}>
                    {['Positive', 'Negative', 'Edge', 'Boundary', 'Security'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-surface-500">Priority</label>
                  <select className="select-field mt-1" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as TestCase['priority'] })}>
                    {['P0', 'P1', 'P2'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-surface-500">Preconditions</label>
                <textarea className="input-field mt-1 min-h-16 resize-y" value={draft.preconditions} onChange={(e) => setDraft({ ...draft, preconditions: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-surface-500">Steps (one per line)</label>
                <textarea
                  className="input-field mt-1 min-h-24 resize-y font-mono text-xs"
                  value={draft.steps.join('\n')}
                  onChange={(e) => setDraft({ ...draft, steps: e.target.value.split('\n') })}
                />
              </div>
              <div>
                <label className="text-xs text-surface-500">Test Data</label>
                <input className="input-field mt-1" value={draft.test_data} onChange={(e) => setDraft({ ...draft, test_data: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-surface-500">Expected Result</label>
                <textarea className="input-field mt-1 min-h-16 resize-y" value={draft.expected_result} onChange={(e) => setDraft({ ...draft, expected_result: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-1">
                <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={handleSave}>
                  <Save size={13} /> Save
                </button>
                <button className="btn-secondary flex items-center gap-1.5 text-xs" onClick={handleCancel}>
                  <X size={13} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-surface-500 font-medium">Preconditions:</span>
                <p className="text-surface-300 mt-0.5">{tc.preconditions}</p>
              </div>
              <div>
                <span className="text-surface-500 font-medium">Steps:</span>
                <ol className="list-decimal list-inside mt-1 space-y-0.5">
                  {tc.steps.map((step, i) => (
                    <li key={i} className="text-surface-300">{step}</li>
                  ))}
                </ol>
              </div>
              <div>
                <span className="text-surface-500 font-medium">Test Data:</span>
                <p className="text-surface-300 mt-0.5 font-mono">{tc.test_data}</p>
              </div>
              <div>
                <span className="text-surface-500 font-medium">Expected Result:</span>
                <p className="text-surface-300 mt-0.5">{tc.expected_result}</p>
              </div>
              <div>
                <span className="text-surface-500 font-medium">Linked Issue:</span>
                <span className="text-primary-400 ml-1 font-mono">{tc.linked_jira_id}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OutputPanel({ testCases, setTestCases, latency, provider }: Props) {
  const [copied, setCopied] = useState(false);
  const [exportingMd, setExportingMd] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const handleUpdate = (idx: number, tc: TestCase) => {
    const next = [...testCases];
    next[idx] = tc;
    setTestCases(next);
  };

  const handleCopyTSV = () => {
    const header = 'ID\tTitle\tType\tPriority\tPreconditions\tSteps\tTest Data\tExpected Result\tLinked Jira ID';
    const rows = testCases.map((tc) =>
      [tc.id, tc.title, tc.type, tc.priority, tc.preconditions, tc.steps.join(' → '), tc.test_data, tc.expected_result, tc.linked_jira_id].join('\t')
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMd = async () => {
    setExportingMd(true);
    try {
      const blob = await exportTestCases(testCases, 'md');
      downloadBlob(blob, `test_cases_${Date.now()}.md`);
    } catch { /* handled */ }
    setExportingMd(false);
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const blob = await exportTestCases(testCases, 'csv');
      downloadBlob(blob, `test_cases_${Date.now()}.csv`);
    } catch { /* handled */ }
    setExportingCsv(false);
  };

  if (testCases.length === 0) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-16 h-16 rounded-2xl bg-surface-800/60 flex items-center justify-center mb-4">
          <Zap size={28} className="text-surface-600" />
        </div>
        <h3 className="text-sm font-semibold text-surface-400 mb-1">No Test Cases Yet</h3>
        <p className="text-xs text-surface-500 text-center max-w-xs">
          Connect to Jira, fetch an issue, and generate test cases. They&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden fade-in">
      {/* Header / Actions */}
      <div className="p-5 border-b border-surface-700/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-success-500/15 flex items-center justify-center">
              <Zap size={18} className="text-success-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-surface-100">
                Generated Test Cases
                <span className="text-xs font-normal text-surface-500 ml-2">({testCases.length})</span>
              </h2>
              {latency !== null && (
                <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                  <Clock size={11} /> Generated in {latency}s
                  {provider && (
                    <span className="ml-1.5 text-primary-400/70">via {provider}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button id="copy-tsv-btn" className="btn-secondary flex items-center gap-1.5 text-xs" onClick={handleCopyTSV}>
            {copied ? <Check size={13} className="text-success-400" /> : <ClipboardCopy size={13} />}
            {copied ? 'Copied!' : 'Copy TSV'}
          </button>
          <button id="export-md-btn" className="btn-secondary flex items-center gap-1.5 text-xs" onClick={handleExportMd} disabled={exportingMd}>
            <FileText size={13} />
            {exportingMd ? 'Exporting...' : 'Export .md'}
          </button>
          <button id="export-csv-btn" className="btn-secondary flex items-center gap-1.5 text-xs" onClick={handleExportCsv} disabled={exportingCsv}>
            <FileSpreadsheet size={13} />
            {exportingCsv ? 'Exporting...' : 'Export .csv'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[600px] overflow-y-auto">
        {testCases.map((tc, i) => (
          <TestCaseRow key={tc.id + i} tc={tc} index={i} onUpdate={handleUpdate} />
        ))}
      </div>
    </div>
  );
}
