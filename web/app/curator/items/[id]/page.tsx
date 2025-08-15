
'use client';
import { useEffect, useState } from 'react';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function ItemEditor({ params }: any) {
  const id = params.id;
  const [it, setIt] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch(`${apiUrl}/curator/items/${id}`);
      if (r.ok) setIt(await r.json());
    })();
  }, [id]);

  async function save(){
    setSaving(true);
    const body = {
      stem: it.stem, options: it.options, correctIndex: it.correct_index,
      correctIndices: it.correct_indices, explainer: it.explainer,
      sourceSnippetRef: it.source_snippet_ref, difficulty: it.difficulty,
      variantGroupId: it.variant_group_id, status: it.status, trustLabel: it.trust_label,
      trustMappingRefs: it.trust_mapping_refs
    };
    await fetch(`${apiUrl}/curator/items/${id}`, { method:'PUT', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
    setSaving(false);
    alert('Saved');
  }

  if (!it) return <main style={{padding:24}}>Loading…</main>;
  return (
    <main style={{ padding: 24, fontFamily:'system-ui', maxWidth:900, margin:'0 auto' }}>
      <h2>Edit Item</h2>
      <label>Stem<br/><textarea value={it.stem||''} onChange={e=>setIt({...it, stem:e.target.value})} rows={3} style={{width:'100%'}}/></label>
      <label>Options (comma-separated)<br/><input value={(it.options||[]).join(',')} onChange={e=>setIt({...it, options:e.target.value.split(',')})} style={{width:'100%'}}/></label>
      <label>Correct Index<br/><input type="number" value={it.correct_index ?? ''} onChange={e=>setIt({...it, correct_index:Number(e.target.value)})}/></label>
      <label>Explainer<br/><textarea value={it.explainer||''} onChange={e=>setIt({...it, explainer:e.target.value})} rows={3} style={{width:'100%'}}/></label>
      <div style={{marginTop:12, display:'flex', gap:12}}>
        <button onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</button>
        <a href="/curator">Back</a>
      </div>
    </main>
  );
}
