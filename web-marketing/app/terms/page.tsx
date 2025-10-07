import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service – Cerply',
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container py-20">
        <Link href="/" className="text-brand-coral-600 mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-lg max-w-3xl space-y-6">
          <p className="text-brand-subtle">
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
            <p className="text-brand-subtle">
              By accessing or using Cerply's website and services, you agree to be bound by these
              Terms of Service and all applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Use of Services</h2>
            <p className="text-brand-subtle">
              You may use our services only for lawful purposes and in accordance with these Terms.
              You agree not to use our services in any way that could damage, disable, or impair our
              systems.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Intellectual Property</h2>
            <p className="text-brand-subtle">
              All content, features, and functionality of our services are owned by Cerply and are
              protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Disclaimer</h2>
            <p className="text-brand-subtle">
              Our services are provided "as is" without warranties of any kind, either express or
              implied. We do not guarantee that our services will be uninterrupted or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-brand-subtle">
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:hello@cerply.com">hello@cerply.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

