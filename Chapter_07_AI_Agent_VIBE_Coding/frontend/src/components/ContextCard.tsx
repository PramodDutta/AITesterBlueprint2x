import { AlertCircle, Tag, Layers, ArrowUpCircle } from 'lucide-react';
import type { JiraIssue } from '../types';

interface Props {
  issue: JiraIssue | null;
}

export default function ContextCard({ issue }: Props) {
  if (!issue) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-surface-700/50 flex items-center justify-center">
            <AlertCircle size={18} className="text-surface-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-surface-100">Issue Context</h2>
            <p className="text-xs text-surface-500">Fetch an issue to see its details</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    );
  }

  // Parse description text, handling Jira ADF or plain text
  const descText = typeof issue.description === 'string'
    ? issue.description
    : JSON.stringify(issue.description, null, 2);

  return (
    <div className="glass-card p-6 fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center">
          <AlertCircle size={18} className="text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-surface-100">Issue Context</h2>
          <p className="text-xs text-surface-500">Verify the fetched user story before generating</p>
        </div>
        <span className="text-xs font-mono font-semibold text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-lg border border-primary-500/20">
          {issue.issue_id}
        </span>
      </div>

      {/* Summary */}
      <h3 className="text-sm font-semibold text-surface-100 mb-3 leading-relaxed">{issue.summary}</h3>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1.5 text-xs bg-surface-800/60 rounded-lg px-2.5 py-1 border border-surface-700/50">
          <Tag size={12} className="text-accent-400" />
          <span className="text-surface-400">Type:</span>
          <span className="text-surface-200 font-medium">{issue.issue_type || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-surface-800/60 rounded-lg px-2.5 py-1 border border-surface-700/50">
          <ArrowUpCircle size={12} className="text-warning-400" />
          <span className="text-surface-400">Priority:</span>
          <span className="text-surface-200 font-medium">{issue.priority || 'N/A'}</span>
        </div>
        {issue.components.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-surface-800/60 rounded-lg px-2.5 py-1 border border-surface-700/50">
            <Layers size={12} className="text-success-400" />
            <span className="text-surface-400">Components:</span>
            <span className="text-surface-200 font-medium">{issue.components.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <h4 className="text-xs font-medium text-surface-400 mb-2">Description & Acceptance Criteria</h4>
        <div className="bg-surface-900/50 border border-surface-700/30 rounded-lg p-4 max-h-48 overflow-y-auto">
          <pre className="text-xs text-surface-300 whitespace-pre-wrap font-sans leading-relaxed">
            {descText || 'No description provided.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
