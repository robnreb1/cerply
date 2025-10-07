'use client';

import { useState } from 'react';
import WaitlistModal from './WaitlistModal';

<<<<<<< HEAD
const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

=======
>>>>>>> chore/prod-monitoring-and-closeout
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
<<<<<<< HEAD
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button onClick={() => setShowModal(true)} className="btn text-lg">
            Join the waitlist
          </button>
          {calendlyUrl && (
            <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-lg">
              Book a 15-min chat
            </a>
          )}
=======
        <div className="flex justify-center">
          <button onClick={() => setShowModal(true)} className="btn text-lg">
            Join the waitlist
          </button>
>>>>>>> chore/prod-monitoring-and-closeout
        </div>
      </section>
      {showModal && <WaitlistModal onClose={() => setShowModal(false)} />}
    </>
  );
}

