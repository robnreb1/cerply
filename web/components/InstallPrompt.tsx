'use client';

import React, { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isiOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const done = localStorage.getItem('pwa_hide_prompt') === '1';
    if (done) return;

    const handler = (e: Event) => {
      e.preventDefault?.();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  if (!visible && !(isiOS() && !localStorage.getItem('pwa_hide_prompt'))) return null;

  const onInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      try {
        const r = await deferred.userChoice;
        if (r?.outcome) localStorage.setItem('pwa_hide_prompt', '1');
      } catch {}
      setVisible(false);
      setDeferred(null);
    }
  };
  const onClose = () => {
    localStorage.setItem('pwa_hide_prompt', '1');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 flex justify-center px-3">
      <div className="max-w-3xl w-full bg-white border rounded-lg shadow p-3 flex items-center justify-between gap-3">
        <div className="text-sm">
          {isiOS()
            ? 'Install Cerply: tap Share → Add to Home Screen'
            : 'Install Cerply for a faster, app‑like experience.'}
        </div>
        {!isiOS() && (
          <button className="border rounded px-3 py-1 text-sm" onClick={onInstall}>Install</button>
        )}
        <button className="border rounded px-2 py-1 text-sm" aria-label="Close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}


