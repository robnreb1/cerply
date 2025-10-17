/**
 * Workflow State Management
 * Handles workflow transitions and state persistence
 */

export type WorkflowType = 
  | 'learner_welcome'
  | 'build'
  | 'module'
  | 'manager_welcome'
  | 'certify_welcome'
  | 'shortcut_upload'
  | 'shortcut_progress'
  | 'shortcut_curate'
  | 'shortcut_search'
  | 'shortcut_certify'
  | 'shortcut_about'
  | 'shortcut_challenge'
  | 'shortcut_new';

export interface WorkflowState {
  currentWorkflow: WorkflowType;
  workflowData: Record<string, any>;
  workflowStack: WorkflowType[]; // For returning from shortcuts
  conversationHistory: Array<{ role: string; content: string; timestamp: string }>;
  conversationId: string;
}

export interface WorkflowTransition {
  nextWorkflow: WorkflowType;
  data: Record<string, any>;
  action: 'TRANSITION' | 'CONTINUE' | 'STUB' | 'CONFIRM_TOPIC' | 'SHOW_TOPIC_SELECTION' | 'SUBJECT_REFINEMENT'; // STUB = handoff not implemented yet
  messageToDisplay?: string;
  uiComponent?: 'topic_selection' | 'loading' | 'error' | null;
}

/**
 * Save workflow state to localStorage
 */
export function saveWorkflowState(state: WorkflowState): void {
  try {
    localStorage.setItem('cerply_workflow_state', JSON.stringify(state));
  } catch (error) {
    console.error('[workflow-state] Failed to save state:', error);
  }
}

/**
 * Load workflow state from localStorage
 */
export function loadWorkflowState(): WorkflowState | null {
  try {
    const saved = localStorage.getItem('cerply_workflow_state');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('[workflow-state] Failed to load state:', error);
    return null;
  }
}

/**
 * Clear workflow state from localStorage
 */
export function clearWorkflowState(): void {
  try {
    localStorage.removeItem('cerply_workflow_state');
  } catch (error) {
    console.error('[workflow-state] Failed to clear state:', error);
  }
}

/**
 * Initialize a new workflow state
 */
export function initializeWorkflowState(workflow: WorkflowType = 'learner_welcome'): WorkflowState {
  return {
    currentWorkflow: workflow,
    workflowData: {},
    workflowStack: [],
    conversationHistory: [],
    conversationId: crypto.randomUUID(),
  };
}

/**
 * Add message to conversation history
 */
export function addMessageToHistory(
  state: WorkflowState,
  role: 'user' | 'assistant',
  content: string
): WorkflowState {
  return {
    ...state,
    conversationHistory: [
      ...state.conversationHistory,
      {
        role,
        content,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Transition to a new workflow
 */
export function transitionWorkflow(
  currentState: WorkflowState,
  transition: WorkflowTransition
): WorkflowState {
  const newState: WorkflowState = {
    ...currentState,
    currentWorkflow: transition.nextWorkflow,
    workflowData: {
      ...currentState.workflowData,
      ...transition.data,
    },
  };

  // If transitioning to a different workflow, push current to stack (for back navigation)
  if (transition.nextWorkflow !== currentState.currentWorkflow) {
    newState.workflowStack = [...currentState.workflowStack, currentState.currentWorkflow];
  }

  return newState;
}

/**
 * Go back to previous workflow in stack
 */
export function goBackWorkflow(currentState: WorkflowState): WorkflowState | null {
  if (currentState.workflowStack.length === 0) {
    return null;
  }

  const previousWorkflow = currentState.workflowStack[currentState.workflowStack.length - 1];
  
  return {
    ...currentState,
    currentWorkflow: previousWorkflow,
    workflowStack: currentState.workflowStack.slice(0, -1),
  };
}

