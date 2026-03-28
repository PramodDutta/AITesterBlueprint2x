import { useState } from 'react'
import './App.css'

function App() {
  const [jira, setJira] = useState({ url: 'https://yourcompany.atlassian.net', email: '', token: '' })
  const [llm, setLlm] = useState({ provider: 'Ollama', url: 'http://localhost:11434', key: '', model: 'llama3' })
  const [ticketId, setTicketId] = useState('')
  const [context, setContext] = useState('')
  
  const [status, setStatus] = useState({ type: '', text: '' })
  const [generatedMarkdown, setGeneratedMarkdown] = useState('')

  const testJira = async () => {
    setStatus({ type: 'loading', text: 'Testing Jira...' })
    try {
      const res = await fetch('http://localhost:8000/api/test-jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jira)
      });
      const data = await res.json();
      if(res.ok) setStatus({ type: 'success', text: data.message })
      else setStatus({ type: 'error', text: data.detail })
    } catch(e) {
      setStatus({ type: 'error', text: 'Backend unavailable.' })
    }
  }

  const testLlm = async () => {
    setStatus({ type: 'loading', text: 'Testing LLM...' })
    try {
      const res = await fetch('http://localhost:8000/api/test-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(llm)
      });
      const data = await res.json();
      if(res.ok) setStatus({ type: 'success', text: data.message })
      else setStatus({ type: 'error', text: data.detail })
    } catch(e) {
      setStatus({ type: 'error', text: 'Backend unavailable.' })
    }
  }

  const generatePlan = async () => {
    if (!ticketId || !jira.email || !jira.token) {
      setStatus({ type: 'error', text: 'Please fill Jira details and Ticket ID' })
      return;
    }
    setStatus({ type: 'loading', text: 'Agent is generating your test plan... (This may take a minute)' })
    setGeneratedMarkdown('')
    try {
      const res = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jira, llm, ticket_id: ticketId, context })
      });
      const data = await res.json();
      if(res.ok) {
        setStatus({ type: 'success', text: 'Plan generated successfully! ' + data.file_path })
        setGeneratedMarkdown(data.markdown)
      }
      else {
        setStatus({ type: 'error', text: data.detail })
      }
    } catch(e) {
      setStatus({ type: 'error', text: 'Backend unavailable or timed out.' })
    }
  }

  return (
    <div className="container">
      <header className="hero">
        <div className="container-inner">
          <h1 className="title">🚀 B.L.A.S.T Test Planner Agent</h1>
          <p className="subtitle">AI-Driven Jira-to-Test-Plan automation using LLMs.</p>
        </div>
      </header>

      <div className="main-content">
        {status.text && (
          <div className={`status-banner ${status.type}`}>
            {status.text}
          </div>
        )}

        <div className="grid">
          <div className="card">
            <h2>🌍 Jira Connection</h2>
            <div className="form-group">
              <label>Jira URL</label>
              <input type="text" value={jira.url} onChange={e => setJira({...jira, url: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={jira.email} onChange={e => setJira({...jira, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label>API Token</label>
              <input type="password" value={jira.token} onChange={e => setJira({...jira, token: e.target.value})} />
            </div>
            <button className="btn outline" onClick={testJira}>Test Connection</button>
          </div>

          <div className="card">
            <h2>🧠 LLM Connection</h2>
            <div className="form-group">
              <label>Provider</label>
              <select value={llm.provider} onChange={e => setLlm({...llm, provider: e.target.value})}>
                <option>Ollama</option>
                <option>Groq</option>
                <option>Grok</option>
              </select>
            </div>
            <div className="form-group">
              <label>Base URL / Key</label>
              {llm.provider === 'Ollama' ? 
                <input type="text" value={llm.url} onChange={e => setLlm({...llm, url: e.target.value})} placeholder="http://localhost:11434" /> :
                <input type="password" value={llm.key} onChange={e => setLlm({...llm, key: e.target.value})} placeholder="API Key" />
              }
            </div>
            <div className="form-group">
              <label>Model Name</label>
              <input type="text" value={llm.model} onChange={e => setLlm({...llm, model: e.target.value})} />
            </div>
            <button className="btn outline" onClick={testLlm}>Test Connection</button>
          </div>
        </div>

        <div className="card focus-card">
          <h2>📄 Generate Test Plan</h2>
          <div className="form-group">
            <label>Ticket ID</label>
            <input type="text" value={ticketId} onChange={e => setTicketId(e.target.value)} placeholder="e.g. TEST-123" />
          </div>
          <div className="form-group">
            <label>Additional Context (Optional)</label>
            <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Any special rules?"></textarea>
          </div>
          <button className="btn primary full-width" onClick={generatePlan}>Generate Test Plan ⚡</button>
        </div>

        {generatedMarkdown && (
          <div className="card output-card">
            <h2>📝 Document Preview</h2>
            <pre className="markdown-output">{generatedMarkdown}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
