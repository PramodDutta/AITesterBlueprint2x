# Basic RAG (explained) — VWO PRD

A tiny end-to-end **Retrieval-Augmented-Generation** demo over the
**app.vwo.com** product requirements PDF. Built for The Testing Academy
to make every step of a RAG pipeline visible.

```
PDF -> chunks -> Nomic Embed (local Ollama) -> ChromaDB (local persistent)
                                                    |
                          question --embed--> | --top-K--> Groq (openai/gpt-oss-120b) -> answer
```

Everything runs on your machine except the final LLM call.

---

## Folder layout

| Path                  | Purpose                                                |
|-----------------------|--------------------------------------------------------|
| `data/`               | Drop the source PDF here (one file)                    |
| `ingest.py`           | PDF -> chunks -> embeddings -> ChromaDB + HTML report  |
| `app.py`              | Flask UI: pipeline diagram + query box + DB viewer     |
| `chroma_db/`          | Local persistent ChromaDB (created on first ingest)    |
| `chunks_report.html`  | Standalone HTML view of every ingested chunk           |
| `requirements.txt`    | Python dependencies                                    |
| `.env`                | `GROQ_API_KEY`, model names (gitignored)               |

`.gitignore` excludes `.env`, `.venv/`, `chroma_db/`, `chunks_report.html`.

---

## One-time setup

```bash
cd Chapter_08_RAG/Basic_RAG_EXPLAIN
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Pull the local embedding model (137M params, free)
ollama pull nomic-embed-text
```

Create `.env` with your own Groq key (free tier works):

```env
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=openai/gpt-oss-120b
OLLAMA_URL=http://localhost:11434
EMBED_MODEL=nomic-embed-text
```

---

## Run

```bash
# 1. Drop the PDF
cp /path/to/your-vwo-prd.pdf data/

# 2. Ingest into ChromaDB (chunks + embeddings + HTML report)
source .venv/bin/activate
python ingest.py

# 3. Start the query UI
python app.py
# open http://127.0.0.1:5000
```

### Sample ingest output

```
Found PDF: Product Requirements Document_VWO.pdf
Read 7 non-empty pages.
Created 19 chunks (size=800, overlap=120).
Embedding 19 chunks via 'nomic-embed-text' (Ollama) ...
  embedded 10/19
  embedded 19/19
Storing in ChromaDB ...
Stored 19 documents in collection 'vwo_product_requirements'
Wrote HTML report -> chunks_report.html
```

---

## What the UI shows (one page)

1. **Pipeline diagram (always visible)**
   `Question → Embed (Nomic) → ChromaDB → Top-K → Groq → Answer`.
   Each node lights amber as data flows through it.
2. **Ask a question** — text box; on submit you get:
   - the top-K retrieved chunks with **distance** + **similarity** scores
   - the Groq answer (grounded only on those chunks)
3. **Database contents** — every chunk currently stored in ChromaDB
   with embedding previews. The chunks used for the last answer are
   highlighted amber so you can see exactly which chunks the LLM read.

### Verified end-to-end

```
Q: What experiment types does VWO support?
Retrieved chunks: p1-c2, p1-c1, p7-c17, p4-c11
Groq answer:      "VWO supports A/B testing as an experiment type [Chunk 3]."
```

---

## How it works (in 5 lines)

1. `ingest.py` slices the PDF into ~800-char chunks (120-char overlap, page metadata kept).
2. Each chunk is embedded by **Nomic Embed** through Ollama (free, local, 768-dim vectors).
3. Chunks + embeddings + metadata are stored in a **local ChromaDB** collection (`vwo_product_requirements`).
4. `app.py` embeds your question with the same model, calls `collection.query(...)` for the top-K nearest chunks (cosine).
5. Those chunks are sent as context to **Groq's `openai/gpt-oss-120b`**, which produces a grounded answer that cites chunk numbers.

---

## Tunables (top of `ingest.py` / `app.py`)

| Knob               | Default            | Where        |
|--------------------|--------------------|--------------|
| `CHUNK_SIZE`       | 800 chars          | `ingest.py`  |
| `CHUNK_OVERLAP`    | 120 chars          | `ingest.py`  |
| `EMBED_MODEL`      | `nomic-embed-text` | `.env`       |
| `GROQ_MODEL`       | `openai/gpt-oss-120b` | `.env`    |
| `TOP_K`            | 4                  | `app.py`     |

---

## Troubleshooting

- **"DB not ready"** in the UI -> run `python ingest.py` first.
- **Connection refused on 11434** -> Ollama isn't running. Start it
  (it usually auto-starts on macOS) and re-run.
- **Groq 401** -> bad/missing `GROQ_API_KEY` in `.env`.
- **Empty / weird answers** -> increase `TOP_K`, reduce `CHUNK_SIZE`, or
  re-ingest after improving the source PDF.
