import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy – Cerply',
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container py-20">
        <Link href="/" className="text-brand-coral-600 mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-lg max-w-3xl space-y-6">
          <p className="text-brand-subtle">
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="text-brand-subtle">
              Cerply ("we," "our," or "us") respects your privacy. This Privacy Policy explains how
              we collect, use, and protect your personal information when you use our website and
              services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
            <p className="text-brand-subtle">
              We collect information you provide directly to us, such as when you join our waitlist,
              contact us, or use our services. This may include your name, email address, and usage
              data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
            <p className="text-brand-subtle">
              We use the information we collect to provide, maintain, and improve our services, to
              communicate with you, and to comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Data Security</h2>
            <p className="text-brand-subtle">
              We implement appropriate technical and organizational measures to protect your
              personal information against unauthorized access, alteration, disclosure, or
              destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-brand-subtle">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:hello@cerply.com">hello@cerply.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

