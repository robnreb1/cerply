import Hero from '@/components/Hero';
import ValueProps from '@/components/ValueProps';
import HowItWorks from '@/components/HowItWorks';
import FounderNote from '@/components/FounderNote';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Hero />
        <ValueProps />
        <HowItWorks />
        <FounderNote />
      </main>
      <Footer />
    </div>
  );
}

