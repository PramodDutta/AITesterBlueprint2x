import { useState } from 'react';
import { Plug, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import type { JiraCredentials } from '../types';
import { testJiraConnection } from '../api';

interface Props {
  credentials: JiraCredentials;
  setCredentials: (c: JiraCredentials) => void;
  connected: boolean;
  setConnected: (v: boolean) => void;
}

export default function ConnectionPanel({ credentials, setCredentials, connected, setConnected }: Props) {
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setMessage('');
    setError('');
    try {
      const result = await testJiraConnection(credentials);
      setMessage(result.message);
      setConnected(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message || 'Connection failed';
      setError(detail);
      setConnected(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center">
          <Plug size={18} className="text-primary-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-surface-100">Jira Connection</h2>
          <p className="text-xs text-surface-500">Configure your Jira instance</p>
        </div>
        {connected && (
          <div className="ml-auto flex items-center gap-1.5 text-success-400 text-xs font-medium">
            <CheckCircle size={14} />
            Connected
          </div>
        )}
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5" htmlFor="jira-url">Base URL</label>
          <input
            id="jira-url"
            type="url"
            className="input-field"
            placeholder="https://your-org.atlassian.net"
            value={credentials.url}
            onChange={(e) => setCredentials({ ...credentials, url: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5" htmlFor="jira-email">Email</label>
          <input
            id="jira-email"
            type="email"
            className="input-field"
            placeholder="your@email.com"
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5" htmlFor="jira-token">API Token</label>
          <div className="relative">
            <input
              id="jira-token"
              type={showToken ? 'text' : 'password'}
              className="input-field pr-10"
              placeholder="••••••••••••••••"
              value={credentials.token}
              onChange={(e) => setCredentials({ ...credentials, token: e.target.value })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
              onClick={() => setShowToken(!showToken)}
              aria-label={showToken ? 'Hide token' : 'Show token'}
            >
              {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          id="test-connection-btn"
          className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
          onClick={handleTest}
          disabled={testing || !credentials.url || !credentials.email || !credentials.token}
        >
          {testing ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Plug size={15} />
              Test Connection
            </>
          )}
        </button>

        {message && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success-500/10 border border-success-500/20 fade-in">
            <CheckCircle size={15} className="text-success-400 shrink-0" />
            <span className="text-xs text-success-400">{message}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 fade-in">
            <XCircle size={15} className="text-danger-400 shrink-0" />
            <span className="text-xs text-danger-400">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
