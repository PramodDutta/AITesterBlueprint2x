const express = require('express');
const cors = require('cors');
const { marked } = require('marked');

const app = express();
app.use(cors());
app.use(express.json());

// Helper: fetch Jira
async function fetchJiraAuth(url, email, token, endpoint) {
  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const fetchUrl = url.replace(/\/$/, '') + endpoint;
  return fetch(fetchUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    }
  });
}

// Helper: fetch ADO
async function testAdoAuth(orgUrl, pat) {
  const auth = Buffer.from(`:${pat}`).toString('base64');
  const fetchUrl = `${orgUrl.replace(/\/$/, '')}/_apis/projects?api-version=7.0`;
  return fetch(fetchUrl, {
    method: 'GET',
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
  });
}

async function fetchAdoAuth(orgUrl, pat, workItemId) {
  const auth = Buffer.from(`:${pat}`).toString('base64');
  const fetchUrl = `${orgUrl.replace(/\/$/, '')}/_apis/wit/workitems/${workItemId}?api-version=7.0`;
  return fetch(fetchUrl, {
    method: 'GET',
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
  });
}

// 1. Test Jira
app.post('/api/test-jira', async (req, res) => {
  try {
    const { url, email, token } = req.body;
    const response = await fetchJiraAuth(url, email, token, '/rest/api/2/myself');
    if (response.ok) {
      return res.json({ success: true, message: "Connected to Jira!" });
    } else {
      const text = await response.text();
      return res.status(400).json({ detail: `Jira Auth failed: ${response.status} ${text}` });
    }
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// 2. Fetch Jira
app.post('/api/fetch-jira', async (req, res) => {
  try {
    const { jira, ticket_id } = req.body;
    const response = await fetchJiraAuth(jira.url, jira.email, jira.token, `/rest/api/2/issue/${ticket_id}`);
    if (response.ok) {
      const data = await response.json();
      return res.json({
        ticket_id: data.key,
        title: data.fields.summary || '',
        description: typeof data.fields.description === 'string' ? data.fields.description : JSON.stringify(data.fields.description || '')
      });
    } else {
      const text = await response.text();
      return res.status(400).json({ detail: `Failed to fetch ticket ${ticket_id}: ${response.status}` });
    }
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// ADO Endpoints
app.post('/api/test-ado', async (req, res) => {
  try {
    const { orgUrl, pat } = req.body;
    const response = await testAdoAuth(orgUrl, pat);
    if (response.ok) {
      return res.json({ success: true, message: "Connected to Azure DevOps!" });
    } else {
      const text = await response.text();
      return res.status(400).json({ detail: `ADO Auth failed: ${response.status} ${text}` });
    }
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

app.post('/api/fetch-ado', async (req, res) => {
  try {
    const { ado, ticket_id } = req.body;
    const response = await fetchAdoAuth(ado.orgUrl, ado.pat, ticket_id);
    if (response.ok) {
      const data = await response.json();
      const fields = data.fields || {};
      return res.json({
        ticket_id: data.id,
        title: fields['System.Title'] || '',
        description: fields['System.Description'] || fields['System.History'] || ''
      });
    } else {
      const text = await response.text();
      return res.status(400).json({ detail: `Failed to fetch ADO Item ${ticket_id}: ${response.status}` });
    }
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// 3. Generate
app.post('/api/generate', async (req, res) => {
  try {
    const { activeSource, jira, ado, llm, ticket_id, context } = req.body;
    
    let title = '';
    let desc = '';
    
    // 1. Fetch Ticket Information
    if (activeSource === 'ado') {
      const ticketRes = await fetchAdoAuth(ado.orgUrl, ado.pat, ticket_id);
      if (!ticketRes.ok) return res.status(400).json({ detail: 'Failed to fetch ADO ticket.' });
      const ticketData = await ticketRes.json();
      title = (ticketData.fields || {})['System.Title'] || '';
      desc = (ticketData.fields || {})['System.Description'] || '';
    } else {
      const ticketRes = await fetchJiraAuth(jira.url, jira.email, jira.token, `/rest/api/2/issue/${ticket_id}`);
      if (!ticketRes.ok) return res.status(400).json({ detail: 'Failed to fetch Jira ticket.' });
      const ticketData = await ticketRes.json();
      title = ticketData.fields.summary || '';
      desc = typeof ticketData.fields.description === 'string' ? ticketData.fields.description : JSON.stringify(ticketData.fields.description || '');
    }
    
    // 2. Format Prompt
    // Hardcode fallback SOP string specifically to avoid Vercel FS pathing issues during execution
    const systemPrompt = `You are a Principal QA Architect. Your goal is to generate a comprehensive B.L.A.S.T protocol Software Test Plan in Markdown format.
Use the following Jira Feature explicitly:
Title: ${title}
Description: ${desc}

Additional Context Provided from User: ${context}

Format the document completely in standard Markdown with headers, bullet points, and tables for test cases. Include:
# 1. Feature Name & Scope
# 2. Goals & Objectives
# 3. Test Scenarios & Cases (Table format)
# 4. Out of Scope`;

    let markdown = "";
    if (llm.provider === 'Ollama') {
      const ollamaUrl = llm.url.replace(/\/$/, '') + '/api/generate';
      const oRes = await fetch(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: llm.model, prompt: systemPrompt, stream: false })
      });
      if(!oRes.ok) throw new Error(await oRes.text());
      const oData = await oRes.json();
      markdown = oData.response;
    } else if (llm.provider === 'Groq') {
      const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
      const gRes = await fetch(groqUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llm.key}` },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{role: 'system', content: systemPrompt}]
        })
      });
      if(!gRes.ok) throw new Error(await gRes.text());
      const gData = await gRes.json();
      markdown = gData.choices[0].message.content;
    } else if (llm.provider === 'Grok') {
      const grokUrl = 'https://api.x.ai/v1/chat/completions';
      const gRes = await fetch(grokUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llm.key}` },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [{role: 'system', content: systemPrompt}]
        })
      });
      if(!gRes.ok) throw new Error(await gRes.text());
      const gData = await gRes.json();
      markdown = gData.choices[0].message.content;
    }

    return res.json({ message: "Test plan generated", markdown: markdown, file_path: "NodeJS Vercel Environment Context" });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// 4. Publish Confluence
app.post('/api/publish-confluence', async (req, res) => {
  try {
    const { jira, confluence_url, space_key, title, markdown_content } = req.body;
    const auth = Buffer.from(`${jira.email}:${jira.token}`).toString('base64');
    
    const baseUrl = confluence_url.replace(/\/$/, '');
    const endpoint = `${baseUrl}/rest/api/content`;
    
    const htmlContent = marked.parse(markdown_content);
    
    const payload = {
      type: "page",
      title: title,
      space: { key: space_key.toUpperCase() },
      body: { storage: { value: htmlContent, representation: "storage" } }
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok || response.status === 201) {
      const data = await response.json();
      return res.json({ url: `${baseUrl}/spaces/${space_key}/pages/${data.id}` });
    } else {
      const text = await response.text();
      let msg = text;
      if (text.includes("A page with this title already exists")) {
         msg = "A page with this title already exists in that space.";
      } else if (text.toLowerCase().includes("<html")) {
         msg = "Received HTML error page (Check URL or permissions).";
      }
      return res.status(400).json({ detail: `Confluence Error ${response.status}: ${msg}` });
    }
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Node.js Backend listening on port ${PORT}`);
  });
}
