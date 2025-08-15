
import Link from 'next/link';
export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Cerply</h1>
      <p><b>Turn information into knowledge.</b></p>
      <ul>
        <li>Curate lessons (Draft -> QA -> Publish) with trust labels</li>
        <li>Adaptive micro-quizzes with safe variants</li>
        <li>Analytics pilot dashboard</li>
      </ul>
      <p>
        <Link href="/curator">Curator Dashboard -></Link><br/>
        <Link href="/learn">Learn -></Link><br/>
        <Link href="/analytics/pilot">Analytics (pilot) -></Link>
      </p>
    </main>
  );
}
