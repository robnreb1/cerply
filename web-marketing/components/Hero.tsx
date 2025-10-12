'use client';

import { useState } from 'react';
import WaitlistModal from './WaitlistModal';

export default function Hero() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section className="container py-20 md:py-28 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Your Team's
          <br />
          Institutional Memory
        </h1>
        <p className="text-xl md:text-2xl text-brand-subtle max-w-3xl mx-auto mb-10">
          Transform your organization's knowledge into adaptive learning experiences. 
          Enterprise-grade security, expert-certified content, proven retention outcomes.
        </p>
        <div className="flex justify-center">
          <button onClick={() => setShowModal(true)} className="btn text-lg">
            Request a Demo
          </button>
        </div>
      </section>
      {showModal && <WaitlistModal onClose={() => setShowModal(false)} />}
    </>
  );
}
