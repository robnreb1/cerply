// web/components/IngestInteraction.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpTrayIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";

type Message = { role: "user" | "assistant"; content: string; html?: boolean };
type PlannedModule = { id?: string; title: string; estMinutes?: number };

const INTRO_MESSAGES = [
  "What will you master today?",
  'Tell me your goal in one line, for example, "GCSE German (AQA Higher) by May" or "remember the key points from a podcast I listened to".',
  "I will plan the modules, then we can generate the daily practice."
];

export default function IngestInteraction() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingIndex, setTypingIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [activeTab, setActiveTab] = useState<"popular" | "certified" | "challenge" | "analytics">("popular");
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<PlannedModule[] | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' }); }, []);
  useEffect(() => {
    const onShortcut = (e: any) => {
      const tab = e?.detail?.tab as typeof activeTab;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('cerply-shortcut', onShortcut);
    return () => window.removeEventListener('cerply-shortcut', onShortcut);
  }, []);

  // Typewriter effect for initial assistant messages
  useEffect(() => {
    if (messages.length === 0 && typingIndex < INTRO_MESSAGES.length) {
      let i = 0;
      const full = INTRO_MESSAGES[typingIndex];
      setTypedText("");
      const id = setInterval(() => {
        i++;
        setTypedText(full.slice(0, i));
        if (i >= full.length) {
          clearInterval(id);
          // push the fully typed message, then move to next
          setMessages(prev => [...prev, { role: "assistant", content: full }]);
          setTypingIndex((t) => t + 1);
        }
      }, 30);
      return () => clearInterval(id);
    }
  }, [typingIndex, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsGenerating(true);

    try {
      // If we already proposed a plan and user says confirm/generate, proceed to generate
      if (plan && /^(yes|ok|start|go|generate|confirm)/i.test(userMessage)) {
        const gen = await fetch('/api/ingest/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modules: plan })
        });
        if (gen.ok) {
          const j = await gen.json();
          const count = Array.isArray(j?.items) ? j.items.length : 0;
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `Great — I generated ${count} lesson drafts. Ready when you are.` }
          ]);
          setAwaitingConfirm(false);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'I had trouble generating items. Please try again.' }]);
        }
        return;
      }

      // Heuristic: if the input is too short or looks off-topic, ask a clarifying question first
      const tokenish = userMessage.split(/\s+/).filter(Boolean);
      const hasLetters = /[a-zA-Z]/.test(userMessage);
      if (tokenish.length < 2 || !hasLetters) {
        const clarify = await fetch('/api/ingest/clarify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: userMessage })
        });
        if (clarify.ok) {
          const j = await clarify.json();
          const chips = Array.isArray(j?.chips) && j.chips.length ? `\nOptions: ${j.chips.join(' · ')}` : '';
          setMessages(prev => [...prev, { role: 'assistant', content: `${j?.question || 'Can you clarify your goal?'}${chips}` }]);
          return;
        }
      }

      // Otherwise, request a plan preview from the API
      const preview = await fetch('/api/ingest/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMessage })
      });
      if (preview.ok) {
        const j = await preview.json();
        if (j?.error) {
          setMessages(prev => [...prev, { role: 'assistant', content: j.error?.message || 'That does not look like a learnable topic. Try something like “GCSE Maths focus algebra (45 mins)”.' }]);
          return;
        }
        const modules: PlannedModule[] = Array.isArray(j?.modules) ? j.modules : [];
        if (modules.length) {
          setPlan(modules);
          setAwaitingConfirm(true);
          const bullets = modules.map((m: any, i: number) => `${i + 1}. ${m.title}`).join('\n');
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `Here’s a plan for "${userMessage}":\n${bullets}\nReply “confirm” to start, or say what to change.` }
          ]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: `I couldn’t form a plan from that. Can you add a little more detail?` }]);
        }
      } else {
        // Fallback response if preview fails
        setMessages(prev => [...prev, { role: 'assistant', content: `I couldn’t reach the planner just now. Please try again.` }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Fallback response
      setMessages(prev => [...prev, { role: "assistant", content: `Something went wrong — please try again.` }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setInput(`Uploaded: ${file.name}`);
    }
  };

  const popularTopics = [
    { title: "Astrophysics for beginners", emoji: "🛰️" },
    { title: "Excel pivot tables", emoji: "📊" },
    { title: "Project management basics", emoji: "📋" },
    { title: "First aid essentials", emoji: "⛑️" },
    { title: "GDPR essentials", emoji: "🛡️" },
    { title: "Python data analysis", emoji: "🐍" },
    { title: "Public speaking", emoji: "🎤" },
    { title: "Leadership 101", emoji: "🧭" },
    { title: "Customer discovery", emoji: "🕵️" },
    { title: "SQL joins explained", emoji: "🧩" },
  ];

  const certifiedCourses = [
    { title: "Food Safety Level 2", emoji: "🍽️" },
    { title: "Fire Warden Training", emoji: "🔥" },
    { title: "Data Protection Awareness", emoji: "🔐" },
    { title: "Safeguarding Basics", emoji: "🧒" },
    { title: "Manual Handling", emoji: "📦" },
    { title: "Workplace First Aid", emoji: "🩹" },
    { title: "Intro to Cyber Hygiene", emoji: "🛡️" },
    { title: "Anti‑bribery Essentials", emoji: "⚖️" },
  ];

  const getCurrentTopics = () => {
    switch (activeTab) {
      case "popular":
        return popularTopics;
      case "certified":
        return certifiedCourses;
      case "challenge":
        return popularTopics.slice(0, 5); // Example for challenge topics
      case "analytics":
        return popularTopics.slice(5); // Example for analytics topics
      default:
        return popularTopics;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={topRef} />
      {/* Footer shortcuts moved to bottom; header nav removed */}

      {/* Chat Messages */}
      {/* Chat area fills available viewport height minus header/footer; scrolls internally */}
      <div className="flex-1 space-y-4 mb-6 max-h-[calc(100vh-180px)] overflow-y-auto px-1">
        {/* Live typewriter bubble */}
        {messages.length === 0 && typingIndex < INTRO_MESSAGES.length && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-zinc-200 text-zinc-900">
              <p className="text-sm whitespace-pre-wrap">{typedText}</p>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-50 border border-zinc-200 text-zinc-900"
              }`}
            >
              {message.html ? (
                <div className="text-sm" dangerouslySetInnerHTML={{ __html: message.content }} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-200 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-900"></div>
                <span className="text-sm text-zinc-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Carousels removed */}
      <div className="mb-4" />

      {/* Footer shortcuts moved to global footer */}
      <div className="sticky bottom-0 bg-white">
        {/* Input row (single chat bar) */}
        <div className="max-w-3xl mx-auto px-4 pb-4 flex items-center gap-2">
          {/* Upload */}
          <button
            onClick={handleFileUpload}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100 transition-colors"
            aria-label="Upload"
            title="Upload"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
          </button>
          {/* Text input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me your goal..."
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300"
              disabled={isGenerating}
            />
          </div>
          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors"
            aria-label="Send"
            title="Send"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        {awaitingConfirm && plan && (
          <div className="max-w-3xl mx-auto px-4 pb-2">
            <button
              onClick={async () => {
                if (isGenerating) return;
                setIsGenerating(true);
                try {
                  const gen = await fetch('/api/ingest/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ modules: plan })
                  });
                  if (gen.ok) {
                    const j = await gen.json();
                    const count = Array.isArray(j?.items) ? j.items.length : 0;
                    setMessages(prev => [...prev, { role: 'assistant', content: `Great — I generated ${count} lesson drafts. Ready when you are.` }]);
                    setAwaitingConfirm(false);
                  } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: 'I had trouble generating items. Please try again.' }]);
                  }
                } finally {
                  setIsGenerating(false);
                }
              }}
              className="mt-1 inline-flex items-center rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Confirm and generate
            </button>
          </div>
        )}
        {/* duplicate input removed */}
        
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.ppt,.pptx,.rtf"
          multiple
        />
      </div>
    </div>
  );
}