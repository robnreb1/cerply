"use client";
import React, { useState } from "react";



export default function CuratorPage() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [artefactId, setArtefactId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  async function ingestUrl(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Ingesting URL…");
    setArtefactId(null);
    try {
      const res = await fetch('/api/ingest/url', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));
      setArtefactId(json?.artefact?.id || null);
      setStatus("URL ingested.");
    } catch (err: any) {
      setStatus(`URL ingest failed: ${err?.message || err}`);
    }
  }

  async function ingestUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setStatus("Pick a file first.");
    setStatus("Uploading…");
    setArtefactId(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch('/api/ingest/upload', { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));
      setArtefactId(json?.artefact?.id || null);
      setStatus("Upload ingested.");
    } catch (err: any) {
      setStatus(`Upload failed: ${err?.message || err}`);
    }
  }

  async function autoGenerate() {
    if (!artefactId) return;
    setStatus("Auto‑generating items…");
    try {
      const res = await fetch('/api/curator/auto-generate', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artefactId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(JSON.stringify(json));
      setStatus("Auto‑generation complete. Check the dashboard.");
    } catch (err: any) {
      setStatus(`Auto‑generate failed: ${err?.message || err}`);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontSize: 16 }}>
      <h1>Curator Dashboard (demo)</h1>
      <p>Ingest a URL or upload a small .txt file to create an artefact. The server will reply with an artefact ID.</p>

      <section style={{ marginBottom: 24 }}>
        <h2>Ingest URL</h2>
        <form onSubmit={ingestUrl}>
          <input
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            required
          />
          <button type="submit" style={{ marginTop: 8 }}>Ingest URL</button>
        </form>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Upload file (.txt)</h2>
        <form onSubmit={ingestUpload}>
          <input type="file" accept=".txt,text/plain" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button type="submit" style={{ marginLeft: 8 }}>Upload</button>
        </form>
      </section>

      {artefactId && (
        <section style={{ marginBottom: 24 }}>
          <div><strong>Artefact ID:</strong> {artefactId}</div>
          <button onClick={autoGenerate} style={{ marginTop: 8 }}>Auto‑generate items</button>
        </section>
      )}

      <section>
        <strong>Status:</strong> {status || "(idle)"}
      </section>
    </main>
  );
}