// Microcopy for Learner MVP
// Concise, encouraging, enterprise-ready

// INTRO_COPY - The only allowed static string per platform principles
export const INTRO_COPY = "Learn anything. Remember everything.";

export const copy = {
  // Home page (backward compatibility)
  topBarTagline: "Learn anything. Remember everything.",
  processing: "Thinking...",
  reassurance: "", // Removed per user feedback
  trustBadges: "Audit-ready · Expert-reviewed · Adaptive · Private by default",
  
  // Icon labels (backward compatibility)
  iconLabels: {
    certified: "Certified",
    curate: "Curate",
    guild: "Guild",
    account: "Account",
    upload: "Upload",
  },
  
  // Button labels (backward compatibility)
  buttons: {
    upload: "Upload",
    createModules: "Create modules",
  },
  
  // Pane A: Topic & Preview
  topic: {
    heading: "What would you like to master?",
    placeholder: "Enter a topic, paste content, or drop a link...",
    uploadCta: "Upload file",
    previewCta: "Preview",
    loading: "Analyzing your topic...",
  },
  
  preview: {
    heading: "Does this look right?",
    summary: "Summary",
    modules: "Proposed modules",
    clarifying: "Quick questions",
    confirmYes: "Looks great — Start",
    confirmRefine: "Refine",
    estimatedItems: "items",
  },
  
  // Auth gate
  auth: {
    gateHeading: "Sign in to continue",
    gateMessage: "Cerply adapts to your learning patterns and ensures long-term retention — we need to know it's you.",
    signInCta: "Sign in",
    whyRequired: "Why do I need to sign in?",
  },
  
  // Pane B: Session
  session: {
    heading: "Learning Session",
    itemProgress: (current: number, total: number) => `Question ${current} of ${total}`,
    target: (count: number) => `Target ${count} this session`,
    resumeNotice: "Resuming where you left off",
    flipCta: "Reveal answer",
    gradeCta: "How well did you know this?",
    grades: {
      1: "Not at all",
      2: "Poorly",
      3: "Okay",
      4: "Well",
      5: "Perfectly"
    },
    explainCta: "Explain",
    whyCta: "Why?",
    nextCta: "Continue",
    completedHeading: "Session complete!",
    completedMessage: (count: number) => `You've completed ${count} questions. Great work!`,
    continueCta: "Keep going",
    finishCta: "Finish session",
  },
  
  // Pane C: While you wait
  fallback: {
    heading: "While you wait...",
    profileTeaser: "Tell us about your learning style",
    statsHeading: "Your progress",
    relatedHeading: "You might also like",
    accuracy: (percent: number) => `${percent}% accuracy`,
    answered: (count: number) => `${count} answered`,
  },
  
  // NL Ask
  nlAsk: {
    heading: "Ask Cerply",
    placeholder: "Ask anything about this topic...",
    submitCta: "Ask",
    toggle: "Chat",
  },
  
  // Level badge
  level: {
    beginner: "Beginner",
    novice: "Novice",
    intermediate: "Intermediate",
    advanced: "Advanced",
    expert: "Expert",
    worldClass: "World-class",
  },
  
  // Errors
  error: {
    network: "Connection issue — please check your internet",
    api: "Something went wrong — please try again",
    validation: "Please check your input and try again",
    auth: "Please sign in to continue",
  },
  
  // Accessibility
  a11y: {
    flipCard: "Flip card to reveal answer",
    gradeButton: (grade: number, label: string) => `Grade your answer as ${grade} - ${label}`,
    explainButton: "Get explanation for this question",
    closeModal: "Close dialog",
    expandChat: "Expand chat panel",
    collapseChat: "Collapse chat panel",
  },
  
  // Existing placeholders for InputAction (backward compatibility)
  placeholders: [
    'What do I need to know about ISO27001?',
    'Teach me the fundamentals of quantum mechanics',
    'I need to understand GDPR compliance',
    'How do I write better SQL queries?',
    'Explain React hooks with examples',
  ],
} as const;

// Also export as COPY (uppercase) for existing imports
export const COPY = copy;
