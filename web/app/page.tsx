// web/app/page.tsx
// Conversational Learning Interface - Main Entry Point with Workflow State Machine
// Welcome Workflow Implementation

'use client';
import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { 
  WorkflowState, 
  initializeWorkflowState, 
  saveWorkflowState, 
  loadWorkflowState,
  addMessageToHistory,
  transitionWorkflow
} from './lib/workflow-state';
import { executeWelcomeWorkflow } from './workflows/welcome';
import TopicSelection from '@/components/TopicSelection';
import WorkflowLoading from '@/components/WorkflowLoading';
import ClickableText from '@/components/ClickableText';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  granularity?: 'subject' | 'topic' | 'module';
  metadata?: any;
  awaitingConfirmation?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflowState, setWorkflowState] = useState<WorkflowState>(initializeWorkflowState());
  const [showTopicSelection, setShowTopicSelection] = useState(false);
  const [topicOptions, setTopicOptions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load saved workflow state on mount
  useEffect(() => {
    const savedState = loadWorkflowState();
    if (savedState) {
      setWorkflowState(savedState);
      // Reconstruct messages from conversation history
      const reconstructedMessages = savedState.conversationHistory.map((msg, idx) => ({
        id: `${msg.role}-${idx}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      setMessages(reconstructedMessages.length > 0 ? reconstructedMessages : [welcomeMessage()]);
    } else {
      setMessages([welcomeMessage()]);
    }
  }, []);

  // Welcome message
  function welcomeMessage(): Message {
    return {
      id: 'welcome',
      role: 'assistant',
      content: "Hi, I'm Cerply. Shall we continue with your live topics, or would you like to learn something new?",
    };
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput,
    };

    // Add user message
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Hide topic selection if showing
    setShowTopicSelection(false);

    try {
      // EPIC 13: Agent Orchestrator (if feature flag enabled)
      if (process.env.NEXT_PUBLIC_FF_AGENT_ORCHESTRATOR_V1 === 'true') {
        try {
          const agentResponse = await fetch('/api/agent/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': 'test-admin-token',
            },
            body: JSON.stringify({
              userId: 'test-user-123', // TODO: Replace with actual user ID from auth
              message: userInput,
              conversationHistory: messages.slice(-6).map(m => ({
                role: m.role,
                content: m.content,
              })),
            }),
          });

          if (agentResponse.ok) {
            const agentData = await agentResponse.json();
            
            // Add agent's response
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: agentData.message,
              metadata: {
                agent: true,
                toolCalls: agentData.toolCalls,
                iterations: agentData.metadata?.iterations,
              },
            };
            setMessages(prev => [...prev, assistantMessage]);

            // If agent signaled content generation, show transition message
            if (agentData.action === 'START_GENERATION') {
              const transitionMessages = [
                "While we wait, would you like to continue with your live content, or perhaps explore other skills?",
                "In the meantime, would you like to pick up where you left off, or look at something new?",
                "While that's being prepared, you could continue with your current topics or explore other areas.",
              ];
              
              setTimeout(() => {
                const selectedMessage = transitionMessages[Math.floor(Math.random() * transitionMessages.length)];
                const transitionMessage: Message = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: selectedMessage,
                };
                setMessages(prev => [...prev, transitionMessage]);
              }, 800);
            }

            setIsLoading(false);
            return;
          } else {
            console.error('[Agent] API error:', agentResponse.status);
            // Fall through to workflow system
          }
        } catch (agentError) {
          console.error('[Agent] Error:', agentError);
          // Fall through to workflow system
        }
      }

      // FALLBACK: Original workflow system
      // Update workflow state with user message
      let updatedState = addMessageToHistory(workflowState, 'user', userInput);
      
      // INTELLIGENT: Let backend LLM classifier determine if response is affirmative or refinement
      // Check if we're awaiting confirmation (last message was a question)
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
      const isAwaitingConfirmation = lastAssistantMsg?.content.includes('Is that what you\'re looking for?') || 
                                     lastAssistantMsg?.content.includes('Does that align with what you had in mind?') ||
                                     lastAssistantMsg?.content.includes('Is that what you have in mind?');
      
      // If awaiting confirmation, call conversation API (backend will classify as affirm vs refine)
      if (isAwaitingConfirmation) {
        // Extract original topic from conversation history
        const allUserMessages = updatedState.conversationHistory.filter(m => m.role === 'user');
        const originalTopic = allUserMessages.length >= 2 ? allUserMessages[allUserMessages.length - 2].content : userInput;
        
        try {
          const conversationResponse = await fetch('/api/conversation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': 'test-admin-token',
            },
            body: JSON.stringify({
              userInput: userInput,
              messageHistory: updatedState.conversationHistory,
              currentState: 'confirming', // Backend LLM will classify as affirmative or refinement
              originalRequest: originalTopic,
              understanding: `The learner wants to learn about ${originalTopic}`,
            }),
          });

          if (conversationResponse.ok) {
            const convData = await conversationResponse.json();
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: convData.content,
            };
            setMessages(prev => [...prev, assistantMessage]);
            updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
            
            // Show transition message after confirmation
            if (convData.action === 'START_GENERATION') {
              const transitionMessages = [
                "While we wait, would you like to continue with your live content, or perhaps explore other skills?",
                "In the meantime, would you like to pick up where you left off, or look at something new?",
                "While that's being prepared, you could continue with your current topics or explore other areas.",
                "In the meantime, feel free to resume your active learning or browse other topics.",
                "While we wait, you could continue with your live modules or look at something different.",
                "In the meantime, would you like to pick up your current learning or explore other skills?",
                "While that's happening, feel free to continue your active content or consider other areas.",
                "In the meantime, you could resume where you left off or explore something new.",
                "While we wait, would you like to continue with your current topics or look at other areas?",
                "In the meantime, you're welcome to pick up your live modules or explore something different.",
                "While that's being organized, you could continue your active learning or browse other topics.",
                "In the meantime, feel free to resume your current content or look at other skills.",
                "While we wait, you could pick up where you left off or explore other areas you're interested in.",
                "In the meantime, would you like to continue with your live topics or look at something new?",
                "While that's happening, feel free to resume your active modules or explore other skills.",
                "In the meantime, you could continue your current learning or look at something different.",
                "While we wait, you're welcome to pick up your live content or explore other areas.",
                "In the meantime, would you like to resume where you left off or browse other topics?",
                "While that's being prepared, feel free to continue with your current topics or look at something new.",
                "In the meantime, you could pick up your active learning or explore other skills you'd like to develop.",
                "While we wait, would you like to continue with your live modules or explore something different?"
              ];
              
              setTimeout(() => {
                const selectedMessage = transitionMessages[Math.floor(Math.random() * transitionMessages.length)];
                const transitionMessage: Message = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: selectedMessage,
                };
                setMessages(prev => [...prev, transitionMessage]);
                setWorkflowState(prevState => {
                  const updated = addMessageToHistory(prevState, 'assistant', transitionMessage.content);
                  saveWorkflowState(updated);
                  return updated;
                });
              }, 800);
            }
            
            // Save state and exit
            setWorkflowState(updatedState);
            saveWorkflowState(updatedState);
            setIsLoading(false);
            return;
          }
        } catch (confirmError) {
          console.error('[Home] Confirmation conversation error:', confirmError);
          // Fall through to normal workflow if confirmation fails
        }
      }
      
      // Execute workflow based on current workflow type
      let transition;
      
      switch (updatedState.currentWorkflow) {
        case 'learner_welcome':
          transition = await executeWelcomeWorkflow(userInput, updatedState);
          break;
        case 'build':
          // Build workflow not implemented yet
          transition = {
            nextWorkflow: 'learner_welcome' as const,
            data: {},
            action: 'STUB' as const,
            messageToDisplay: 'The Build workflow is coming soon. This is where content generation will happen.',
          };
          break;
        case 'module':
          // Module workflow not implemented yet
          transition = {
            nextWorkflow: 'learner_welcome' as const,
            data: {},
            action: 'STUB' as const,
            messageToDisplay: 'The Module workflow is coming soon. This is where learning sessions will happen.',
          };
          break;
        default:
          transition = {
            nextWorkflow: 'learner_welcome' as const,
            data: {},
            action: 'CONTINUE' as const,
            messageToDisplay: 'This workflow is not yet implemented.',
          };
      }

      // Handle transition
      if (transition.action === 'CONFIRM_TOPIC') {
        // New topic needs confirmation - use conversation API in confirming state
        try {
          const conversationResponse = await fetch('/api/conversation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': 'test-admin-token',
            },
            body: JSON.stringify({
              userInput: userInput,
              messageHistory: updatedState.conversationHistory,
              currentState: 'confirming',
              originalRequest: userInput,
              understanding: `The learner wants to learn about ${userInput}`,
            }),
          });

          if (conversationResponse.ok) {
            const convData = await conversationResponse.json();
            
            // CRITICAL: If user rejected and provided correction (e.g., "no, I meant physics")
            // Restart the workflow with the corrected input
            if (convData.action === 'RESTART_WITH_CORRECTION' && convData.content) {
              const correctedInput = convData.content;
              console.log('[Home] User correction detected, restarting with:', correctedInput);
              
              // Restart workflow with corrected input
              // This will re-run granularity detection and start fresh
              const newTransition = await executeWelcomeWorkflow(correctedInput, updatedState);
              
              // Handle the new transition (likely SUBJECT_REFINEMENT or CONFIRM_TOPIC)
              if (newTransition.action === 'SUBJECT_REFINEMENT') {
                // Call conversation API for subject refinement
                const retryConversationResponse = await fetch('/api/conversation', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': 'test-admin-token',
                  },
                  body: JSON.stringify({
                    userInput: correctedInput,
                    messageHistory: updatedState.conversationHistory,
                    currentState: 'refining_subject',
                    originalRequest: newTransition.data.subjectName || correctedInput,
                    metadata: newTransition.data,
                  }),
                });
                
                if (retryConversationResponse.ok) {
                  const retryData = await retryConversationResponse.json();
                  const retryMessage: Message = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: retryData.content,
                  };
                  setMessages(prev => [...prev, retryMessage]);
                  updatedState = addMessageToHistory(updatedState, 'assistant', retryMessage.content);
                }
              } else if (newTransition.action === 'CONFIRM_TOPIC') {
                // Call conversation API for topic confirmation
                const retryConversationResponse = await fetch('/api/conversation', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': 'test-admin-token',
                  },
                  body: JSON.stringify({
                    userInput: correctedInput,
                    messageHistory: updatedState.conversationHistory,
                    currentState: 'confirming',
                    originalRequest: correctedInput,
                    understanding: `The learner wants to learn about ${correctedInput}`,
                  }),
                });
                
                if (retryConversationResponse.ok) {
                  const retryData = await retryConversationResponse.json();
                  const retryMessage: Message = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: retryData.content,
                  };
                  setMessages(prev => [...prev, retryMessage]);
                  updatedState = addMessageToHistory(updatedState, 'assistant', retryMessage.content);
                }
              }
              
              // Save state and exit early
              setWorkflowState(updatedState);
              saveWorkflowState(updatedState);
              setIsLoading(false);
              return;
            }
            
            // Normal flow: show the confirmation response
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: convData.content,
            };
            setMessages(prev => [...prev, assistantMessage]);
            updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
            
            // If action is START_GENERATION, show transition message
            if (convData.action === 'START_GENERATION') {
              // Wait a moment, then show the transition message (20+ variations)
              const transitionMessages = [
                "While we wait, would you like to continue with your live content, or perhaps explore other skills?",
                "In the meantime, would you like to pick up where you left off, or look at something new?",
                "While that's being prepared, you could continue with your current topics or explore other areas.",
                "In the meantime, feel free to resume your active learning or browse other topics.",
                "While we wait, you could continue with your live modules or look at something different.",
                "In the meantime, would you like to pick up your current learning or explore other skills?",
                "While that's happening, feel free to continue your active content or consider other areas.",
                "In the meantime, you could resume where you left off or explore something new.",
                "While we wait, would you like to continue with your current topics or look at other areas?",
                "In the meantime, you're welcome to pick up your live modules or explore something different.",
                "While that's being organized, you could continue your active learning or browse other topics.",
                "In the meantime, feel free to resume your current content or look at other skills.",
                "While we wait, you could pick up where you left off or explore other areas you're interested in.",
                "In the meantime, would you like to continue with your live topics or look at something new?",
                "While that's happening, feel free to resume your active modules or explore other skills.",
                "In the meantime, you could continue your current learning or look at something different.",
                "While we wait, you're welcome to pick up your live content or explore other areas.",
                "In the meantime, would you like to resume where you left off or browse other topics?",
                "While that's being prepared, feel free to continue with your current topics or look at something new.",
                "In the meantime, you could pick up your active learning or explore other skills you'd like to develop.",
                "While we wait, would you like to continue with your live modules or explore something different?"
              ];
              
              setTimeout(() => {
                const selectedMessage = transitionMessages[Math.floor(Math.random() * transitionMessages.length)];
                const transitionMessage: Message = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: selectedMessage,
                };
                setMessages(prev => [...prev, transitionMessage]);
                setWorkflowState(prevState => {
                  const updated = addMessageToHistory(prevState, 'assistant', transitionMessage.content);
                  saveWorkflowState(updated);
                  return updated;
                });
              }, 800); // Small delay for better UX
            }
          } else {
            // Fallback to default message
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: transition.messageToDisplay || `I'd like to help you learn "${userInput}". Is that what you're looking for?`,
            };
            setMessages(prev => [...prev, assistantMessage]);
            updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
          }
        } catch (convError) {
          console.error('[DEBUG] Conversation API error:', convError);
          // Fallback
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: transition.messageToDisplay || `I'd like to help you learn "${userInput}". Is that what you're looking for?`,
          };
          setMessages(prev => [...prev, assistantMessage]);
          updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
        }
      } else if (transition.action === 'STUB' || transition.action === 'CONTINUE') {
        // If it's a stub message, generate natural conversation response
        if (transition.messageToDisplay && transition.messageToDisplay.includes('coming soon')) {
          try {
            const conversationResponse = await fetch('/api/conversation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-admin-token': 'test-admin-token',
              },
              body: JSON.stringify({
                userInput: userInput,
                messageHistory: updatedState.conversationHistory,
                currentState: 'learning',
                originalRequest: userInput,
                understanding: null,
              }),
            });

            if (conversationResponse.ok) {
              const convData = await conversationResponse.json();
              const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: convData.content,
              };
              setMessages(prev => [...prev, assistantMessage]);
              updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
            } else {
              // Fallback to stub message
              const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: transition.messageToDisplay || 'This feature is coming soon.',
              };
              setMessages(prev => [...prev, assistantMessage]);
              updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
            }
          } catch (convError) {
            console.error('[Home] Conversation error:', convError);
            // Fallback to stub message
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: transition.messageToDisplay || 'This feature is coming soon.',
            };
            setMessages(prev => [...prev, assistantMessage]);
            updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
          }
        } else {
          // Show message as-is (not a stub)
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: transition.messageToDisplay || 'This feature is coming soon.',
          };
          setMessages(prev => [...prev, assistantMessage]);
          updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
        }
        
        // Show topic selection UI if needed
        if (transition.uiComponent === 'topic_selection' && transition.data.topics) {
          setTopicOptions(transition.data.topics);
          setShowTopicSelection(true);
        }
        
      } else if (transition.action === 'SUBJECT_REFINEMENT') {
        // Subject-level request: Use conversational refinement (no UI widget)
        // Let LLM guide user from broad → narrow → specific
        try {
          const conversationResponse = await fetch('/api/conversation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': 'test-admin-token',
            },
            body: JSON.stringify({
              userInput: userInput,
              messageHistory: updatedState.conversationHistory,
              currentState: 'refining_subject', // New state for subject-level refinement
              originalRequest: transition.data.subjectName || userInput,
              understanding: null,
              metadata: {
                granularity: 'subject',
                refinementLevel: transition.data.refinementLevel || 'subject',
              },
            }),
          });

          if (conversationResponse.ok) {
            const convData = await conversationResponse.json();
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: convData.content,
            };
            setMessages(prev => [...prev, assistantMessage]);
            updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
          } else {
            // Fallback
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: `"${userInput}" is quite broad. Could you tell me which specific aspect you'd like to focus on?`,
            };
            setMessages(prev => [...prev, assistantMessage]);
            updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
          }
        } catch (convError) {
          console.error('[Home] Subject refinement error:', convError);
          // Fallback
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: `"${userInput}" is quite broad. Could you tell me which specific aspect you'd like to focus on?`,
          };
          setMessages(prev => [...prev, assistantMessage]);
          updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
        }
        
      } else if (transition.action === 'SHOW_TOPIC_SELECTION') {
        // Legacy: Show topic selection UI (being phased out in favor of conversational refinement)
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: transition.messageToDisplay || `I found some topics for you.`,
        };
        setMessages(prev => [...prev, assistantMessage]);
        updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);

        // Show topic selection UI
        if (transition.data.topicSuggestions && transition.data.topicSuggestions.length > 0) {
          setTopicOptions(transition.data.topicSuggestions);
          setShowTopicSelection(true);
        }
        
      } else if (transition.action === 'TRANSITION') {
        // Transition to new workflow
        updatedState = transitionWorkflow(updatedState, transition);
        
        if (transition.messageToDisplay) {
          // If it's a stub message, generate natural conversation response
          if (transition.messageToDisplay.includes('coming soon')) {
            try {
              const conversationResponse = await fetch('/api/conversation', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-admin-token': 'test-admin-token',
                },
                body: JSON.stringify({
                  userInput: userInput,
                  messageHistory: updatedState.conversationHistory,
                  currentState: 'learning',
                  originalRequest: userInput,
                  understanding: null,
                }),
              });

              if (conversationResponse.ok) {
                const convData = await conversationResponse.json();
                const assistantMessage: Message = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: convData.content,
                };
                setMessages(prev => [...prev, assistantMessage]);
                updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
              } else {
                // Fallback to stub message
                const assistantMessage: Message = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: transition.messageToDisplay,
                };
                setMessages(prev => [...prev, assistantMessage]);
                updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
              }
            } catch (convError) {
              console.error('[Home] Conversation API error:', convError);
              // Fallback to stub message
              const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: transition.messageToDisplay,
              };
              setMessages(prev => [...prev, assistantMessage]);
              updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
            }
          } else {
            // Show message as-is (not a stub)
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: transition.messageToDisplay,
            };
            setMessages(prev => [...prev, assistantMessage]);
            updatedState = addMessageToHistory(updatedState, 'assistant', assistantMessage.content);
          }
        }
        
        // Show UI component if needed
        if (transition.uiComponent === 'topic_selection' && transition.data.topics) {
          setTopicOptions(transition.data.topics);
          setShowTopicSelection(true);
        }
      }

      // Save updated state
      setWorkflowState(updatedState);
      saveWorkflowState(updatedState);

      // Store conversation in backend
      try {
        await fetch('/api/conversation/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': 'test-admin-token', // TODO: Get from auth context
          },
          body: JSON.stringify({
            userId: '00000000-0000-0000-0000-000000000001', // Test user UUID (TODO: Get from auth context)
            conversationId: updatedState.conversationId,
            messages: updatedState.conversationHistory,
            workflowId: updatedState.currentWorkflow,
          }),
        });
      } catch (storeError) {
        console.error('[Home] Failed to store conversation:', storeError);
        // Non-critical error, continue anyway
      }

    } catch (err: any) {
      console.error('Workflow error:', err);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, something went wrong. Could you try again?",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTopicSelect = (topic: any) => {
    setShowTopicSelection(false);
    handleShortcutSend(topic.title);
  };

  const handleShortcutClick = (shortcut: string) => {
    handleShortcutSend(shortcut.toLowerCase());
  };

  const handleShortcutSend = (text: string) => {
    setInput(text);
    // Trigger send after setting input
    setTimeout(() => {
      const sendButton = document.querySelector('[data-send-button]') as HTMLButtonElement;
      if (sendButton) sendButton.click();
    }, 100);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Cerply</h1>
            <p className="text-xs text-gray-500">Learn anything. Remember everything.</p>
          </div>
          <div className="text-sm text-gray-500">
            {process.env.NODE_ENV === 'development' && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                🧪 Development Mode
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-[calc(100vh-200px)] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-gray-50 text-gray-900 rounded-2xl rounded-tl-sm border border-gray-200'
                  } p-4 shadow-sm`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                          li: ({ children }) => <li className="text-gray-700">{children}</li>,
                          p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-700">{children}</p>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Topic Selection UI */}
            {showTopicSelection && topicOptions.length > 0 && (
              <TopicSelection 
                topics={topicOptions} 
                onSelect={handleTopicSelect}
                onRefine={() => {
                  setShowTopicSelection(false);
                  setInput('I want something more specific');
                }}
              />
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-start">
                <WorkflowLoading workflow={workflowState.currentWorkflow} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What would you like to learn?"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                disabled={isLoading}
                autoFocus
              />
              <button
                data-send-button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-br from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2 font-medium"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
            
            {/* Shortcuts */}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium">Shortcuts:</span>
              <ClickableText 
                text="Upload" 
                onClick={() => handleShortcutClick('upload')}
              />
              <ClickableText 
                text="Challenge" 
                onClick={() => handleShortcutClick('challenge')}
              />
              <ClickableText 
                text="Progress" 
                onClick={() => handleShortcutClick('progress')}
              />
              <ClickableText 
                text="Curate" 
                onClick={() => handleShortcutClick('curate')}
              />
              <ClickableText 
                text="Continue" 
                onClick={() => handleShortcutClick('continue')}
              />
            </div>
          </div>
      </div>
    </div>
    </main>
  );
}
