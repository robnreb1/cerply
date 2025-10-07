'use client';

import { useState } from 'react';
import WaitlistModal from './WaitlistModal';

export default function Hero() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section className="container py-20 md:py-28 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Learn anything.
          <br />
          Remember everything.
        </h1>
        <p className="text-xl md:text-2xl text-brand-subtle max-w-3xl mx-auto mb-10">
          Turn policies, regs, notes and transcripts into bite-size, spaced, adaptive learning.
          Quality first; certified by experts when it matters.
        </p>
        <div className="flex justify-center">
          <button onClick={() => setShowModal(true)} className="btn text-lg">
            Join the waitlist
          </button>
        </div>
      </section>
      {showModal && <WaitlistModal onClose={() => setShowModal(false)} />}
    </>
  );
}

