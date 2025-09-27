"use client";
import { useEffect, useState } from 'react';

const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW_ADMIN === 'true';
const API = process.env.NEXT_PUBLIC_API_URL || '';
const TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';

async function api(path: string, init?: RequestInit) {
  const headers: Record<string,string> = { ...(init?.headers as any) };
  if (TOKEN) headers['x-admin-token'] = TOKEN;
  headers['content-type'] = headers['content-type'] || 'application/json';
  const r = await fetch(`${API}${path}`, { ...init, headers });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, headers: r.headers, json } as const;
}

export default function AdminCertifiedPage() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!PREVIEW) return;
    (async () => {
      const r = await api('/api/admin/certified/items');
      if (r.status === 401) setError('401 Unauthorized (preview admin)');
      if (r.status === 403) setError('403 Forbidden');
      if (r.status === 200) setItems(r.json.items || []);
    })();
  }, []);

  if (!PREVIEW) return <div className="p-6 text-brand-ink">Preview admin disabled</div>;

  async function ingest(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const r = await api('/api/admin/certified/items/ingest', { method: 'POST', body: JSON.stringify({ title, url }) });
    if (r.status === 413) setError('413 Payload too large');
    if (r.status === 429) setError('429 Rate limited');
    if (r.status === 200) {
      const r2 = await api('/api/admin/certified/items');
      if (r2.status === 200) setItems(r2.json.items || []);
      setTitle(''); setUrl('');
    }
  }

  async function act(id: string, action: 'approve'|'reject') {
    const r = await api(`/api/admin/certified/items/${id}/${action}`, { method: 'POST' });
    if (r.status === 200) {
      const r2 = await api('/api/admin/certified/items');
      if (r2.status === 200) setItems(r2.json.items || []);
    }
  }

  return (
    <div className="p-6 space-y-6 text-brand-ink">
      <h1 className="text-xl font-semibold">Certified Admin (Preview)</h1>
      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-12">{error}</div>}
      <form onSubmit={ingest} className="space-y-2">
        <div className="flex gap-2">
          <input className="flex-1 border border-brand-border rounded-12 p-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <input className="flex-1 border border-brand-border rounded-12 p-2" placeholder="URL" value={url} onChange={e=>setUrl(e.target.value)} />
          <button className="btn" type="submit">Ingest</button>
        </div>
      </form>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="py-2">Title</th>
            <th>URL</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className="border-t border-brand-border">
              <td className="py-2 pr-2">{it.title}</td>
              <td className="pr-2 truncate max-w-[320px]">{it.url}</td>
              <td className="pr-2">{it.status}</td>
              <td className="space-x-2">
                <button className="btn" onClick={()=>act(it.id,'approve')}>Approve</button>
                <button className="btn" onClick={()=>act(it.id,'reject')}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


