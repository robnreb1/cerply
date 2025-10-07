import Link from 'next/link';
import Footer from '@/components/Footer';

export default function WaitlistOkPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center">
        <div className="container text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-coral-500 text-white text-3xl mb-6">
            ✓
          </div>
          <h1 className="text-4xl font-bold mb-4">You're on the list!</h1>
          <p className="text-xl text-brand-subtle mb-8 max-w-2xl mx-auto">
            Thanks for your interest in Cerply. We'll be in touch soon with updates and early
            access.
          </p>
          <Link href="/" className="btn">
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

