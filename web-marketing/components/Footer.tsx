import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-brand-border mt-auto">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-brand-subtle text-sm">
            © {currentYear} Cerply. All rights reserved.
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-brand-subtle hover:text-brand-ink">
              Privacy
            </Link>
            <Link href="/terms" className="text-brand-subtle hover:text-brand-ink">
              Terms
            </Link>
            <a
              href="mailto:hello@cerply.com"
              className="text-brand-subtle hover:text-brand-ink"
            >
              Contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

