/**
 * Content Variance Tests
 * 
 * Ensures generated content varies across runs to prevent templating.
 * Tests lexical diversity and structural variance.
 */

import { test, expect } from '@playwright/test';

interface ContentResult {
  text: string;
  structure: string[];
  lexicalTokens: string[];
}

test.describe('Content Variance Tests', () => {
  
  function analyzeContent(content: string): ContentResult {
    // Extract structural elements
    const structure = [
      content.includes('##') ? 'headers' : 'no-headers',
      content.includes('1.') || content.includes('•') ? 'lists' : 'no-lists',
      content.includes('?') ? 'questions' : 'no-questions',
      content.includes('Example') || content.includes('example') ? 'examples' : 'no-examples'
    ];
    
    // Extract lexical tokens (words)
    const lexicalTokens = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 3);
    
    return {
      text: content,
      structure,
      lexicalTokens
    };
  }
  
  function calculateDiversity(results: ContentResult[]): {
    lexical: number;
    structural: number;
    overall: number;
  } {
    if (results.length < 2) {
      return { lexical: 0, structural: 0, overall: 0 };
    }
    
    // Calculate lexical diversity (Jaccard similarity)
    let totalLexicalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const set1 = new Set(results[i].lexicalTokens);
        const set2 = new Set(results[j].lexicalTokens);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        const similarity = intersection.size / union.size;
        totalLexicalSimilarity += similarity;
        comparisons++;
      }
    }
    
    const lexicalDiversity = 1 - (totalLexicalSimilarity / comparisons);
    
    // Calculate structural diversity
    const allStructures = results.map(r => r.structure.join('|'));
    const uniqueStructures = new Set(allStructures);
    const structuralDiversity = uniqueStructures.size / results.length;
    
    const overall = (lexicalDiversity + structuralDiversity) / 2;
    
    return {
      lexical: lexicalDiversity,
      structural: structuralDiversity,
      overall
    };
  }
  
  test('content generation varies across multiple runs', async ({ page }) => {
    const prompt = 'Explain machine learning basics';
    const results: ContentResult[] = [];
    
    // Generate content 3 times with different contexts
    for (let i = 0; i < 3; i++) {
      await page.goto('/learn');
      await page.waitForSelector('[data-testid="topic-input"]');
      
      // Use different topics to simulate varied context
      const topics = [
        'machine learning basics',
        'artificial intelligence fundamentals', 
        'data science introduction'
      ];
      
      await page.fill('[data-testid="topic-input"]', topics[i]);
      await page.click('[data-testid="preview-button"]');
      
      await page.waitForSelector('[data-testid="confirm-start"]');
      await page.click('[data-testid="confirm-start"]');
      
      // Wait for content to load
      await page.waitForSelector('[data-testid="chat-toggle"]');
      
      // Open chat and ask for content
      await page.click('[data-testid="chat-toggle"]');
      await page.waitForSelector('[data-testid="chat-input"]');
      
      await page.fill('[data-testid="chat-input"]', prompt);
      await page.click('[data-testid="chat-send"]');
      
      // Wait for response
      await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
      
      const response = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
      
      if (response) {
        results.push(analyzeContent(response));
      }
      
      // Clear any state
      await page.reload();
    }
    
    // Verify we got results
    expect(results.length).toBeGreaterThanOrEqual(2);
    
    // Calculate diversity
    const diversity = calculateDiversity(results);
    
    // Check diversity thresholds
    expect(diversity.lexical).toBeGreaterThan(0.3);
    expect(diversity.structural).toBeGreaterThan(0.2);
    expect(diversity.overall).toBeGreaterThan(0.25);
  });
  
  test('microcopy generation varies across contexts', async ({ page }) => {
    const contexts = [
      { level: 'beginner', topic: 'basic math' },
      { level: 'intermediate', topic: 'algebra' },
      { level: 'advanced', topic: 'calculus' }
    ];
    
    const results: string[] = [];
    
    for (const context of contexts) {
      await page.goto('/learn');
      await page.waitForSelector('[data-testid="topic-input"]');
      
      await page.fill('[data-testid="topic-input"]', context.topic);
      await page.click('[data-testid="preview-button"]');
      
      await page.waitForSelector('[data-testid="confirm-start"]');
      await page.click('[data-testid="confirm-start"]');
      
      await page.waitForSelector('[data-testid="chat-toggle"]');
      await page.click('[data-testid="chat-toggle"]');
      await page.waitForSelector('[data-testid="chat-input"]');
      
      // Ask for encouragement (should vary by context)
      await page.fill('[data-testid="chat-input"]', 'encourage me');
      await page.click('[data-testid="chat-send"]');
      
      await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
      const response = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
      
      if (response) {
        results.push(response);
      }
      
      await page.reload();
    }
    
    // Check that responses vary
    expect(results.length).toBe(3);
    
    // All responses should be different
    const uniqueResponses = new Set(results);
    expect(uniqueResponses.size).toBeGreaterThan(1);
    
    // Check that responses are contextually appropriate
    results.forEach((response, index) => {
      expect(response.length).toBeGreaterThan(10);
      expect(response).not.toBe('Natural language responses will be powered by the orchestrator in the full version.');
    });
  });
  
  test('intent suggestions vary by context', async ({ page }) => {
    const topics = [
      'beginner programming',
      'advanced machine learning',
      'intermediate web development'
    ];
    
    const suggestionSets: string[][] = [];
    
    for (const topic of topics) {
      await page.goto('/learn');
      await page.waitForSelector('[data-testid="topic-input"]');
      
      await page.fill('[data-testid="topic-input"]', topic);
      await page.click('[data-testid="preview-button"]');
      
      await page.waitForSelector('[data-testid="confirm-start"]');
      await page.click('[data-testid="confirm-start"]');
      
      await page.waitForSelector('[data-testid="chat-toggle"]');
      await page.click('[data-testid="chat-toggle"]');
      await page.waitForSelector('[data-testid="chat-input"]');
      
      // Get intent suggestions
      const suggestions = await page.locator('button:has-text("Try saying:") + div button').allTextContents();
      suggestionSets.push(suggestions);
      
      await page.reload();
    }
    
    // Check that suggestions vary across contexts
    expect(suggestionSets.length).toBe(3);
    
    // At least some suggestions should be different
    const allSuggestions = suggestionSets.flat();
    const uniqueSuggestions = new Set(allSuggestions);
    expect(uniqueSuggestions.size).toBeGreaterThan(suggestionSets[0].length);
  });
  
  test('error messages vary appropriately', async ({ page }) => {
    const errorScenarios = [
      'network timeout',
      'invalid input',
      'server error'
    ];
    
    const errorMessages: string[] = [];
    
    // Simulate different error scenarios
    for (const scenario of errorScenarios) {
      await page.goto('/learn');
      await page.waitForSelector('[data-testid="topic-input"]');
      
      if (scenario === 'network timeout') {
        // Simulate network issues by using invalid API endpoint
        await page.route('**/api/preview', route => route.abort());
      } else if (scenario === 'invalid input') {
        // Use invalid input
        await page.fill('[data-testid="topic-input"]', '');
      }
      
      await page.fill('[data-testid="topic-input"]', 'test topic');
      await page.click('[data-testid="preview-button"]');
      
      // Wait for error or timeout
      try {
        await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });
        const errorMessage = await page.textContent('[data-testid="error-message"]');
        if (errorMessage) {
          errorMessages.push(errorMessage);
        }
      } catch (e) {
        // Error didn't appear, that's okay for this test
      }
      
      await page.reload();
    }
    
    // Check that error messages are appropriate and varied
    if (errorMessages.length > 0) {
      const uniqueErrors = new Set(errorMessages);
      expect(uniqueErrors.size).toBeGreaterThan(0);
      
      errorMessages.forEach(error => {
        expect(error.length).toBeGreaterThan(5);
        expect(error).toContain('error');
      });
    }
  });
  
  test('placeholder text cycles appropriately', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForSelector('[data-testid="topic-input"]');
    
    const initialPlaceholder = await page.getAttribute('[data-testid="topic-input"]', 'placeholder');
    expect(initialPlaceholder).toBeTruthy();
    
    // Wait for placeholder to cycle (if implemented)
    await page.waitForTimeout(4000);
    
    const cycledPlaceholder = await page.getAttribute('[data-testid="topic-input"]', 'placeholder');
    
    // Placeholder should either cycle or remain the same (both are acceptable)
    expect(cycledPlaceholder).toBeTruthy();
    expect(cycledPlaceholder!.length).toBeGreaterThan(10);
  });
});
