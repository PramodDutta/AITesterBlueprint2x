"""
Step 1 of the RAG pipeline: INGEST a PDF into a local ChromaDB.

What this script does, in order:
  1. Finds the first PDF inside ./data/
  2. Extracts text page-by-page (using pypdf)
  3. Splits the text into overlapping chunks
  4. Generates a vector embedding for each chunk using
     Nomic Embed (free, local, served by Ollama)
  5. Stores chunks + embeddings + metadata into a local
     persistent ChromaDB at ./chroma_db/
  6. Writes a friendly HTML report (chunks_report.html)
     so you can SEE every chunk that went into the database.

Run:
  source .venv/bin/activate
  python ingest.py
"""

from __future__ import annotations

import os
import sys
import textwrap
from pathlib import Path

import requests
from dotenv import load_dotenv
from pypdf import PdfReader

import chromadb

load_dotenv()

# ---------------------------------------------------------------
# Config
# ---------------------------------------------------------------
HERE = Path(__file__).parent
DATA_DIR = HERE / "data"
CHROMA_DIR = HERE / "chroma_db"
HTML_OUTPUT = HERE / "chunks_report.html"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

COLLECTION_NAME = "vwo_product_requirements"
CHUNK_SIZE = 800       # characters per chunk
CHUNK_OVERLAP = 120    # overlap between chunks (preserves context across boundaries)


# ---------------------------------------------------------------
# Step 1 - Find the PDF
# ---------------------------------------------------------------
def find_pdf() -> Path:
    DATA_DIR.mkdir(exist_ok=True)
    pdfs = sorted(DATA_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"ERROR: No PDF found in {DATA_DIR}")
        print("       Drop your app.vwo.com PRD PDF in there and run again.")
        sys.exit(1)
    return pdfs[0]


# ---------------------------------------------------------------
# Step 2 - Read the PDF, page by page
# ---------------------------------------------------------------
def read_pdf(path: Path) -> list[tuple[int, str]]:
    """Returns a list of (page_number, page_text)."""
    reader = PdfReader(str(path))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((i, text))
    return pages


# ---------------------------------------------------------------
# Step 3 - Chunk each page (with overlap, keep page metadata)
# ---------------------------------------------------------------
def chunk_pages(pages: list[tuple[int, str]],
                size: int,
                overlap: int) -> list[dict]:
    chunks: list[dict] = []
    for page_no, page_text in pages:
        start = 0
        n = len(page_text)
        while start < n:
            end = min(start + size, n)
            text = page_text[start:end].strip()
            if text:
                chunks.append({
                    "id": f"p{page_no}-c{len(chunks)}",
                    "text": text,
                    "page": page_no,
                })
            if end == n:
                break
            start = end - overlap
    return chunks


# ---------------------------------------------------------------
# Step 4 - Embed via local Nomic / Ollama
# ---------------------------------------------------------------
def embed(text: str) -> list[float]:
    payload = {"model": EMBED_MODEL, "prompt": text}
    response = requests.post(f"{OLLAMA_URL}/api/embeddings",
                             json=payload, timeout=60)
    response.raise_for_status()
    return response.json()["embedding"]


# ---------------------------------------------------------------
# Step 5 - Store in ChromaDB (local persistent client)
# ---------------------------------------------------------------
def store_in_chroma(chunks: list[dict],
                    embeddings: list[list[float]],
                    pdf_name: str) -> chromadb.api.models.Collection.Collection:
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    # Wipe & recreate so re-running ingest is clean
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"source_pdf": pdf_name, "embed_model": EMBED_MODEL},
    )
    collection.add(
        ids=[c["id"] for c in chunks],
        documents=[c["text"] for c in chunks],
        embeddings=embeddings,
        metadatas=[{"page": c["page"], "source_pdf": pdf_name}
                   for c in chunks],
    )
    return collection


# ---------------------------------------------------------------
# Step 6 - Write the human-readable HTML report
# ---------------------------------------------------------------
def write_html(pdf_name: str,
               chunks: list[dict],
               embeddings: list[list[float]],
               path: Path) -> None:
    rows = []
    for c, vec in zip(chunks, embeddings):
        preview = ", ".join(f"{x:+.4f}" for x in vec[:8])
        rows.append(f"""
        <div class="chunk" id="{c['id']}">
          <div class="chunk-header">
            <span class="badge">{c['id']}</span>
            <span class="meta">page {c['page']} &middot;
                {len(c['text'])} chars &middot; {len(vec)} dims</span>
          </div>
          <pre class="chunk-text">{_html_escape(c['text'])}</pre>
          <div class="embedding">
            <strong>Embedding[0:8]:</strong>
            <code>[{preview}, ...]</code>
          </div>
        </div>
        """)

    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Ingestion Report - {pdf_name}</title>
<style>
  body {{
    font-family: -apple-system, Segoe UI, Roboto, sans-serif;
    max-width: 980px; margin: 32px auto; padding: 0 20px;
    background: #0f172a; color: #e2e8f0; line-height: 1.5;
  }}
  h1 {{ color: #38bdf8; margin-bottom: 4px; }}
  .summary {{
    background: #1e293b; padding: 16px 20px; border-radius: 8px;
    margin-bottom: 24px; border-left: 4px solid #38bdf8;
  }}
  .chunk {{
    background: #1e293b; border-radius: 10px; padding: 14px 18px;
    margin-bottom: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  }}
  .chunk-header {{ display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 10px; }}
  .badge {{ background: #38bdf8; color: #0f172a; padding: 4px 10px;
    border-radius: 999px; font-weight: 600; font-size: 13px; }}
  .meta {{ color: #94a3b8; font-size: 13px; }}
  pre.chunk-text {{ background: #0f172a; color: #e2e8f0;
    padding: 12px 14px; border-radius: 6px; white-space: pre-wrap;
    word-wrap: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13.5px; border: 1px solid #334155; max-height: 260px; overflow: auto; }}
  .embedding {{ margin-top: 10px; font-size: 13px; color: #cbd5e1; }}
  .embedding code {{ background: #0f172a; padding: 2px 6px;
    border-radius: 4px; color: #fbbf24; }}
</style>
</head>
<body>
  <h1>RAG Ingestion Report</h1>
  <p>Source PDF: <em>{pdf_name}</em></p>
  <div class="summary">
    <strong>Total chunks stored:</strong> {len(chunks)}<br/>
    <strong>Chunk size:</strong> {CHUNK_SIZE} chars
       (with {CHUNK_OVERLAP} char overlap)<br/>
    <strong>Embedding model:</strong> {EMBED_MODEL}<br/>
    <strong>Vector dimensions:</strong> {len(embeddings[0])}<br/>
    <strong>Stored in:</strong> ChromaDB collection
       <code>{COLLECTION_NAME}</code> (./chroma_db/)
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
    pdf_path = find_pdf()
    print(f"Found PDF: {pdf_path.name}")

    pages = read_pdf(pdf_path)
    print(f"Read {len(pages)} non-empty pages.")

    chunks = chunk_pages(pages, CHUNK_SIZE, CHUNK_OVERLAP)
    print(f"Created {len(chunks)} chunks "
          f"(size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP}).")

    print(f"Embedding {len(chunks)} chunks via '{EMBED_MODEL}' (Ollama) ...")
    embeddings = []
    for i, c in enumerate(chunks, start=1):
        embeddings.append(embed(c["text"]))
        if i % 10 == 0 or i == len(chunks):
            print(f"  embedded {i}/{len(chunks)}")

    print("Storing in ChromaDB ...")
    collection = store_in_chroma(chunks, embeddings, pdf_path.name)
    print(f"Stored {collection.count()} documents in collection "
          f"'{COLLECTION_NAME}' at {CHROMA_DIR}")

    write_html(pdf_path.name, chunks, embeddings, HTML_OUTPUT)
    print(f"Wrote HTML report -> {HTML_OUTPUT}")
    print("\nNext: run `python app.py` to start the query UI.")


if __name__ == "__main__":
    main()
