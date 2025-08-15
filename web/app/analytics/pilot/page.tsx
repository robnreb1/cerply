
'use client';
import { useEffect, useState } from 'react';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function PilotAnalytics(){
  const [kpi, setKpi] = useState<any>(null);
  useEffect(()=>{ (async()=>{ const r=await fetch(`${apiUrl}/analytics/pilot`); if(r.ok) setKpi(await r.json()); })(); },[]);
  if(!kpi) return <main style={{padding:24}}>Loading…</main>;
  return (
    <main style={{padding:24}}>
      <h2>Analytics (pilot)</h2>
      <ul>
        <li>Users: {kpi.users}</li>
        <li>Attempts: {kpi.attempts}</li>
        <li>Completion (21d): {kpi.completion21d}%</li>
        <li>Lift D0/D7/D30: {kpi.liftD0D7D30.d0}% -> {kpi.liftD0D7D30.d7}% -> {kpi.liftD0D7D30.d30}%</li>
        <li>Spaced-return coverage: {kpi.spacedReturnCoverage}%</li>
        <li>Trust-label impact: {kpi.trustLabelImpact.cerply}% / {kpi.trustLabelImpact.trainer}% / {kpi.trustLabelImpact.unlabelled}%</li>
      </ul>
    </main>
  );
}
