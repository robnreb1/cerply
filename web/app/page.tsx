
import Link from 'next/link';
export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Cerply</h1>
      <p><b>Turns complex rules into simple habits — and proves it.</b></p>
      <ul>
        <li>Upload a policy → draft Proof Plan</li>
        <li>Create a 4-week reinforcement sprint</li>
        <li>See Evidence Coverage Score</li>
      </ul>
      <p><Link href="/decompose">Try the Decomposer →</Link></p>
    </main>
  );
}
