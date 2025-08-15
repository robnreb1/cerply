
'use client';
import { useEffect, useState } from 'react';
const FF = process.env.NEXT_PUBLIC_FF_ADAPTIVE_ENGINE_V1 === 'true';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function Quiz({ itemIds }:{ itemIds:string[] }){
  return <div><p>Items selected: {itemIds.join(', ')}</p><p>(Render interactive micro-quiz here)</p></div>;
}

export default function Learn() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (!FF) return;
    (async () => {
      const r = await fetch(`${apiUrl}/learn/next?userId=user-1`);
      if (r.ok) setData(await r.json());
    })();
  }, []);

  if (!FF) return <main style={{padding:24}}><h2>Learn</h2><p>Feature flag off.</p></main>;
  if (!data) return <main style={{padding:24}}>Loading…</main>;
  return (
    <main style={{ padding: 24 }}>
      <h2>Learn</h2>
      <p>Objective: {data.objectiveId}</p>
      <Quiz itemIds={data.items}/>
    </main>
  );
}
