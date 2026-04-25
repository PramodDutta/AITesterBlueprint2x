"""
Simple RAG Chunking Demo with Nomic Embed
------------------------------------------
This script:
  1. Loads a small document (promo_story.txt)
  2. Splits it into overlapping text chunks
  3. Generates embeddings for each chunk using Nomic Embed (via Ollama)
  4. Prints each chunk + a preview of its embedding vector
  5. Writes a nice HTML report (chunks_report.html) so you can SEE the chunks

Prerequisites
-------------
  1) Install Ollama          ->  https://ollama.com
  2) Pull the embed model    ->  ollama pull nomic-embed-text
  3) Make sure Ollama is running (it usually starts automatically)
  4) pip install requests
"""

import json
import os
import textwrap
from pathlib import Path

import requests

# ---------------------------------------------------------------
# Config
# ---------------------------------------------------------------
HERE = Path(__file__).parent
DOCUMENT_PATH = HERE / "promo_story.txt"
HTML_OUTPUT = HERE / "chunks_report.html"

OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "nomic-embed-text"

CHUNK_SIZE = 300       # characters per chunk (kept small so chunks are easy to read)
CHUNK_OVERLAP = 50     # characters that overlap between chunks (preserves context)


# ---------------------------------------------------------------
# Step 1: Load the document
# ---------------------------------------------------------------
def load_document(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    return text.strip()


# ---------------------------------------------------------------
# Step 2: Chunk the document (simple character based, with overlap)
# ---------------------------------------------------------------
def chunk_text(text: str, size: int, overlap: int) -> list[str]:
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + size, n)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == n:
            break
        start = end - overlap   # slide window with overlap
    return chunks


# ---------------------------------------------------------------
# Step 3: Get an embedding from Nomic via Ollama
# ---------------------------------------------------------------
def embed(text: str) -> list[float]:
    payload = {"model": EMBED_MODEL, "prompt": text}
    response = requests.post(OLLAMA_URL, json=payload, timeout=60)
    response.raise_for_status()
    return response.json()["embedding"]


# ---------------------------------------------------------------
# Step 4: Pretty-print everything to the terminal
# ---------------------------------------------------------------
def print_chunks(chunks: list[str], embeddings: list[list[float]]) -> None:
    print("=" * 70)
    print(f"Document chunked into {len(chunks)} pieces")
    print(f"Embedding model : {EMBED_MODEL}")
    print(f"Vector size     : {len(embeddings[0])}")
    print("=" * 70)

    for i, (chunk, vec) in enumerate(zip(chunks, embeddings), start=1):
        print(f"\n--- Chunk {i} ({len(chunk)} chars) ---")
        wrapped = textwrap.fill(chunk, width=70)
        print(wrapped)
        preview = ", ".join(f"{x:+.4f}" for x in vec[:8])
        print(f"Embedding[0:8] = [{preview}, ...]  (total dims: {len(vec)})")


# ---------------------------------------------------------------
# Step 5: Write a friendly HTML report
# ---------------------------------------------------------------
def write_html(chunks: list[str], embeddings: list[list[float]], path: Path) -> None:
    rows = []
    for i, (chunk, vec) in enumerate(zip(chunks, embeddings), start=1):
        preview = ", ".join(f"{x:+.4f}" for x in vec[:8])
        rows.append(f"""
        <div class="chunk">
          <div class="chunk-header">
            <span class="badge">Chunk {i}</span>
            <span class="meta">{len(chunk)} chars &middot; {len(vec)} dims</span>
          </div>
          <pre class="chunk-text">{_html_escape(chunk)}</pre>
          <div class="embedding">
            <strong>Embedding preview (first 8 of {len(vec)}):</strong>
            <code>[{preview}, ...]</code>
          </div>
        </div>
        """)

    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>RAG Chunking Report - The Testing Academy</title>
<style>
  body {{
    font-family: -apple-system, Segoe UI, Roboto, sans-serif;
    max-width: 900px;
    margin: 40px auto;
    padding: 0 20px;
    background: #0f172a;
    color: #e2e8f0;
    line-height: 1.5;
  }}
  h1 {{ color: #38bdf8; margin-bottom: 4px; }}
  .summary {{
    background: #1e293b;
    padding: 16px 20px;
    border-radius: 8px;
    margin-bottom: 24px;
    border-left: 4px solid #38bdf8;
  }}
  .chunk {{
    background: #1e293b;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 18px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  }}
  .chunk-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }}
  .badge {{
    background: #38bdf8;
    color: #0f172a;
    padding: 4px 10px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 13px;
  }}
  .meta {{ color: #94a3b8; font-size: 13px; }}
  pre.chunk-text {{
    background: #0f172a;
    color: #e2e8f0;
    padding: 12px 14px;
    border-radius: 6px;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px;
    border: 1px solid #334155;
  }}
  .embedding {{
    margin-top: 10px;
    font-size: 13px;
    color: #cbd5e1;
  }}
  .embedding code {{
    background: #0f172a;
    padding: 2px 6px;
    border-radius: 4px;
    color: #fbbf24;
  }}
</style>
</head>
<body>
  <h1>RAG Chunking Report</h1>
  <p>Document: <em>The Story of Promo and The Testing Academy</em></p>

  <div class="summary">
    <strong>Total chunks:</strong> {len(chunks)}<br/>
    <strong>Chunk size:</strong> {CHUNK_SIZE} chars (with {CHUNK_OVERLAP} char overlap)<br/>
    <strong>Embedding model:</strong> {EMBED_MODEL}<br/>
    <strong>Vector dimensions:</strong> {len(embeddings[0])}
  </div>

  {"".join(rows)}
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")


def _html_escape(s: str) -> str:
    return (s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;"))


# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------
def main() -> None:
    print(f"Loading document: {DOCUMENT_PATH}")
    text = load_document(DOCUMENT_PATH)
    print(f"Document length: {len(text)} characters\n")

    print(f"Chunking with size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP} ...")
    chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)
    print(f"Created {len(chunks)} chunks.\n")

    print(f"Generating embeddings using '{EMBED_MODEL}' via Ollama ...")
    embeddings = [embed(c) for c in chunks]
    print("Embeddings generated.\n")

    print_chunks(chunks, embeddings)

    write_html(chunks, embeddings, HTML_OUTPUT)
    print(f"\nHTML report written to: {HTML_OUTPUT}")
    print("Open it in your browser to view the chunks visually.")


if __name__ == "__main__":
    main()
