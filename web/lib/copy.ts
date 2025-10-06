// Microcopy for Learner MVP
// Concise, encouraging, enterprise-ready

export const copy = {
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
} as const;
