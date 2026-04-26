"""
Step 2 of the RAG pipeline: ASK questions through a tiny Flask UI.

The page always shows:
  - The pipeline diagram (Question -> Embed -> ChromaDB -> Top-K -> Groq -> Answer)
  - Every chunk currently stored in ChromaDB

When you submit a question:
  - We embed the question with Nomic (Ollama)
  - Search ChromaDB for the top-K nearest chunks (cosine distance)
  - Highlight which chunks were picked
  - Send those chunks + the question to Groq (openai/gpt-oss-120b)
  - Display the answer

Run:
  source .venv/bin/activate
  python app.py
Then open http://127.0.0.1:5000
"""

from __future__ import annotations

import os
from pathlib import Path

import chromadb
import requests
from dotenv import load_dotenv
from flask import Flask, render_template_string, request

load_dotenv()

# ---------------------------------------------------------------
# Config (matches ingest.py)
# ---------------------------------------------------------------
HERE = Path(__file__).parent
CHROMA_DIR = HERE / "chroma_db"
COLLECTION_NAME = "vwo_product_requirements"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

TOP_K = 4   # how many chunks to retrieve per question


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
def get_collection():
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_collection(COLLECTION_NAME)


def embed(text: str) -> list[float]:
    payload = {"model": EMBED_MODEL, "prompt": text}
    r = requests.post(f"{OLLAMA_URL}/api/embeddings",
                      json=payload, timeout=60)
    r.raise_for_status()
    return r.json()["embedding"]


def ask_groq(question: str, context_chunks: list[str]) -> str:
    """Send question + retrieved context to Groq and return the answer."""
    if not GROQ_API_KEY:
        return "[ERROR] GROQ_API_KEY is missing in .env"

    context_block = "\n\n---\n\n".join(
        f"[Chunk {i+1}]\n{c}" for i, c in enumerate(context_chunks)
    )
    system = (
        "You are a helpful assistant answering questions about the "
        "VWO (Visual Website Optimizer) product. "
        "Answer ONLY using the provided context chunks. "
        "If the answer is not in the context, say you don't know. "
        "Be concise and quote the chunk numbers you used."
    )
    user = f"CONTEXT:\n{context_block}\n\nQUESTION: {question}"

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    r = requests.post(GROQ_URL, headers=headers, json=payload, timeout=60)
    if r.status_code != 200:
        return f"[Groq error {r.status_code}]\n{r.text}"
    data = r.json()
    return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------
app = Flask(__name__)


@app.route("/", methods=["GET", "POST"])
def index():
    # Pull every chunk currently in the DB (so the user can see the database)
    try:
        col = get_collection()
        all_data = col.get(include=["documents", "metadatas", "embeddings"])
        all_chunks = []
        for cid, doc, meta, emb in zip(
            all_data["ids"],
            all_data["documents"],
            all_data["metadatas"],
            all_data["embeddings"],
        ):
            all_chunks.append({
                "id": cid,
                "text": doc,
                "page": meta.get("page", "?"),
                "embed_preview": ", ".join(f"{x:+.3f}" for x in emb[:6]),
                "embed_dims": len(emb),
            })
        db_status = (
            f"Collection '{COLLECTION_NAME}' &middot; "
            f"{col.count()} chunks &middot; "
            f"source: {col.metadata.get('source_pdf', '?')}"
        )
    except Exception as e:
        all_chunks = []
        db_status = f"<span style='color:#f87171'>DB not ready: {e}. "\
                    f"Run <code>python ingest.py</code> first.</span>"

    question = ""
    answer = ""
    retrieved: list[dict] = []
    retrieved_ids: set[str] = set()
    query_vec_preview = ""

    if request.method == "POST":
        question = (request.form.get("question") or "").strip()
        if question and all_chunks:
            # 1. Embed the user's question with the SAME model as ingestion
            qvec = embed(question)
            query_vec_preview = ", ".join(f"{x:+.3f}" for x in qvec[:6])

            # 2. Ask ChromaDB for top-K nearest chunks
            res = col.query(query_embeddings=[qvec], n_results=TOP_K)
            ids = res["ids"][0]
            docs = res["documents"][0]
            metas = res["metadatas"][0]
            dists = res["distances"][0]
            for cid, doc, meta, dist in zip(ids, docs, metas, dists):
                retrieved.append({
                    "id": cid,
                    "text": doc,
                    "page": meta.get("page", "?"),
                    "distance": dist,
                    "similarity": max(0.0, 1.0 - dist),
                })
            retrieved_ids = {r["id"] for r in retrieved}

            # 3. Send retrieved chunks + question to Groq
            answer = ask_groq(question, [r["text"] for r in retrieved])

    return render_template_string(
        PAGE,
        db_status=db_status,
        all_chunks=all_chunks,
        question=question,
        answer=answer,
        retrieved=retrieved,
        retrieved_ids=retrieved_ids,
        query_vec_preview=query_vec_preview,
        embed_model=EMBED_MODEL,
        groq_model=GROQ_MODEL,
        top_k=TOP_K,
    )


# ---------------------------------------------------------------
# HTML template
# ---------------------------------------------------------------
PAGE = r"""
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>RAG Explorer - VWO PRD</title>
<style>
  :root { --bg:#0f172a; --panel:#1e293b; --line:#334155;
          --text:#e2e8f0; --muted:#94a3b8; --accent:#38bdf8;
          --hot:#fbbf24; --good:#34d399; --bad:#f87171; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif;
         max-width: 1200px; margin: 24px auto; padding: 0 20px;
         background: var(--bg); color: var(--text); line-height: 1.5; }
  h1 { color: var(--accent); margin-bottom: 4px; }
  h2 { color: var(--accent); border-bottom: 1px solid var(--line);
       padding-bottom: 6px; margin-top: 36px; }
  .pill { background: var(--accent); color: var(--bg); padding: 3px 10px;
          border-radius: 999px; font-size: 12px; font-weight: 600; }
  .muted { color: var(--muted); font-size: 13px; }
  .panel { background: var(--panel); border-radius: 10px;
           padding: 16px 18px; margin-top: 14px;
           box-shadow: 0 2px 6px rgba(0,0,0,.25); }

  /* Pipeline diagram */
  .pipeline { display: flex; align-items: stretch; flex-wrap: wrap;
              gap: 8px; margin-top: 12px; }
  .node { flex: 1 1 140px; background: #0b1220; border: 1px solid var(--line);
          border-radius: 8px; padding: 10px 12px; text-align: center; }
  .node.hot { border-color: var(--hot); box-shadow: 0 0 0 2px rgba(251,191,36,.2); }
  .node .label { font-size: 12px; color: var(--muted); text-transform: uppercase;
                 letter-spacing: .5px; }
  .node .value { font-weight: 600; margin-top: 4px; }
  .arrow { display: flex; align-items: center; color: var(--accent);
           font-size: 22px; padding: 0 2px; }

  /* Query form */
  form.ask { display: flex; gap: 8px; margin-top: 8px; }
  form.ask input[type=text] {
    flex: 1; padding: 10px 12px; border-radius: 6px;
    border: 1px solid var(--line); background: #0b1220; color: var(--text);
    font-size: 15px;
  }
  form.ask button {
    background: var(--accent); color: var(--bg); border: 0;
    border-radius: 6px; padding: 10px 18px; font-weight: 600;
    cursor: pointer; font-size: 15px;
  }

  /* Chunks */
  .chunk { background: #0b1220; border: 1px solid var(--line);
           border-radius: 8px; padding: 10px 14px; margin-top: 10px; }
  .chunk.retrieved { border-color: var(--hot);
                     box-shadow: 0 0 0 2px rgba(251,191,36,.2); }
  .chunk-head { display: flex; justify-content: space-between;
                align-items: center; margin-bottom: 6px; }
  .badge { background: var(--accent); color: var(--bg);
           padding: 2px 8px; border-radius: 999px;
           font-size: 12px; font-weight: 600; }
  .badge.hot { background: var(--hot); }
  .meta { color: var(--muted); font-size: 12px; }
  pre.text { background: var(--bg); border: 1px solid var(--line);
             border-radius: 6px; padding: 8px 10px;
             white-space: pre-wrap; word-wrap: break-word;
             font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
             font-size: 12.5px; max-height: 220px; overflow: auto; margin: 0; }
  .embed { color: #cbd5e1; font-size: 12px; margin-top: 6px; }
  .embed code { background: var(--bg); padding: 2px 6px;
                border-radius: 4px; color: var(--hot); }

  /* Answer */
  .answer { background: #0b1220; border-left: 4px solid var(--good);
            border-radius: 6px; padding: 14px 16px;
            white-space: pre-wrap; }

  details > summary { cursor: pointer; color: var(--accent);
                      font-weight: 600; padding: 6px 0; }
</style>
</head>
<body>

<h1>RAG Explorer</h1>
<p class="muted">
  PDF -> Nomic Embed -> <strong>ChromaDB (local)</strong>
  -> Top-{{ top_k }} -> Groq <code>{{ groq_model }}</code>
</p>
<p class="muted">DB: {{ db_status|safe }}</p>

<!-- =========================================================== -->
<h2>1. Pipeline (always-on view)</h2>
<div class="panel">
  <div class="pipeline">
    <div class="node {% if question %}hot{% endif %}">
      <div class="label">Question</div>
      <div class="value">{{ question or '(type below)' }}</div>
    </div>
    <div class="arrow">&#10140;</div>
    <div class="node {% if query_vec_preview %}hot{% endif %}">
      <div class="label">Embed (Nomic)</div>
      <div class="value">
        {% if query_vec_preview %}
          [{{ query_vec_preview }}, ...]
        {% else %}
          {{ embed_model }}
        {% endif %}
      </div>
    </div>
    <div class="arrow">&#10140;</div>
    <div class="node {% if retrieved %}hot{% endif %}">
      <div class="label">ChromaDB</div>
      <div class="value">
        cosine search<br/>
        <span class="muted">{{ all_chunks|length }} chunks</span>
      </div>
    </div>
    <div class="arrow">&#10140;</div>
    <div class="node {% if retrieved %}hot{% endif %}">
      <div class="label">Top-{{ top_k }} chunks</div>
      <div class="value">
        {% if retrieved %}
          {% for r in retrieved %}
            <span class="badge hot">{{ r.id }}</span>
          {% endfor %}
        {% else %}
          (none yet)
        {% endif %}
      </div>
    </div>
    <div class="arrow">&#10140;</div>
    <div class="node {% if answer %}hot{% endif %}">
      <div class="label">Groq LLM</div>
      <div class="value">{{ groq_model }}</div>
    </div>
    <div class="arrow">&#10140;</div>
    <div class="node {% if answer %}hot{% endif %}">
      <div class="label">Answer</div>
      <div class="value">
        {% if answer %}generated{% else %}-{% endif %}
      </div>
    </div>
  </div>
</div>

<!-- =========================================================== -->
<h2>2. Ask a question</h2>
<div class="panel">
  <form class="ask" method="post">
    <input type="text" name="question" autofocus
           placeholder="e.g. What experiment types does VWO support?"
           value="{{ question }}" />
    <button type="submit">Ask</button>
  </form>

  {% if question and not all_chunks %}
    <p class="muted" style="margin-top:10px;color:var(--bad)">
      The DB is empty. Run <code>python ingest.py</code> first.
    </p>
  {% endif %}

  {% if retrieved %}
    <h3 style="margin-top:18px;">Retrieved chunks (top {{ top_k }})</h3>
    <p class="muted">Lower distance = more similar.
       These are the chunks sent to Groq as context.</p>
    {% for r in retrieved %}
      <div class="chunk retrieved">
        <div class="chunk-head">
          <span><span class="badge hot">#{{ loop.index }}</span>
                <span class="badge">{{ r.id }}</span>
                <span class="meta">page {{ r.page }}</span></span>
          <span class="meta">
            distance: {{ '%.4f'|format(r.distance) }}
            &middot;
            similarity: {{ '%.4f'|format(r.similarity) }}
          </span>
        </div>
        <pre class="text">{{ r.text }}</pre>
      </div>
    {% endfor %}
  {% endif %}

  {% if answer %}
    <h3 style="margin-top:18px;">Answer from Groq ({{ groq_model }})</h3>
    <div class="answer">{{ answer }}</div>
  {% endif %}
</div>

<!-- =========================================================== -->
<h2>3. Database contents
  <span class="pill">{{ all_chunks|length }} chunks</span></h2>
<div class="panel">
  <p class="muted">
    Everything currently stored in ChromaDB. Chunks used to answer
    your last question are <span style="color:var(--hot)">highlighted</span>.
  </p>
  <details {% if not retrieved %}open{% endif %}>
    <summary>Show / hide all stored chunks</summary>
    {% for c in all_chunks %}
      <div class="chunk {% if c.id in retrieved_ids %}retrieved{% endif %}">
        <div class="chunk-head">
          <span><span class="badge {% if c.id in retrieved_ids %}hot{% endif %}">
                  {{ c.id }}</span>
                <span class="meta">page {{ c.page }}
                  &middot; {{ c.text|length }} chars
                  &middot; {{ c.embed_dims }} dims</span></span>
        </div>
        <pre class="text">{{ c.text }}</pre>
        <div class="embed"><strong>embedding[0:6]:</strong>
          <code>[{{ c.embed_preview }}, ...]</code></div>
      </div>
    {% endfor %}
  </details>
</div>

<p class="muted" style="margin-top:24px;">
  Built for The Testing Academy &middot;
  ChromaDB at <code>./chroma_db/</code> &middot;
  Embeddings via local Ollama ({{ embed_model }})
</p>
</body>
</html>
"""


if __name__ == "__main__":
    print(f"Groq model : {GROQ_MODEL}")
    print(f"Embed model: {EMBED_MODEL}")
    print(f"Chroma dir : {CHROMA_DIR}")
    print("Open http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)
