/**
 * Natural Interactions E2E Tests
 * 
 * Tests natural language commands and conversational UX patterns.
 * Ensures all accepted NL commands work correctly and adapt appropriately.
 */

import { test, expect } from '@playwright/test';

test.describe('Natural Language Commands', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to learn page
    await page.goto('/learn');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="topic-input"]');
  });

  test('content modification commands work correctly', async ({ page }) => {
    // Start a learning session first
    await page.fill('[data-testid="topic-input"]', 'machine learning basics');
    await page.click('[data-testid="preview-button"]');
    
    await page.waitForSelector('[data-testid="confirm-start"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Wait for session to start
    await page.waitForSelector('[data-testid="chat-toggle"]');
    
    // Open chat
    await page.click('[data-testid="chat-toggle"]');
    await page.waitForSelector('[data-testid="chat-input"]');
    
    // Test "shorter" command
    await page.fill('[data-testid="chat-input"]', 'make this shorter');
    await page.click('[data-testid="chat-send"]');
    
    await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
    const shorterResponse = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
    expect(shorterResponse).toContain('shorter');
    
    // Test "bullets" command
    await page.fill('[data-testid="chat-input"]', 'convert to bullets');
    await page.click('[data-testid="chat-send"]');
    
    await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
    const bulletsResponse = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
    expect(bulletsResponse).toContain('bullet');
  });

  test('time constraint commands adapt content', async ({ page }) => {
    // Start a learning session
    await page.fill('[data-testid="topic-input"]', 'data science fundamentals');
    await page.click('[data-testid="preview-button"]');
    
    await page.waitForSelector('[data-testid="confirm-start"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Wait for session to start
    await page.waitForSelector('[data-testid="chat-toggle"]');
    
    // Open chat
    await page.click('[data-testid="chat-toggle"]');
    await page.waitForSelector('[data-testid="chat-input"]');
    
    // Test time constraint
    await page.fill('[data-testid="chat-input"]', 'I only have 15 minutes');
    await page.click('[data-testid="chat-send"]');
    
    await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
    const timeResponse = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
    expect(timeResponse).toContain('15');
    expect(timeResponse).toContain('minute');
  });

  test('simplification commands work', async ({ page }) => {
    // Start a learning session
    await page.fill('[data-testid="topic-input"]', 'quantum physics');
    await page.click('[data-testid="preview-button"]');
    
    await page.waitForSelector('[data-testid="confirm-start"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Wait for session to start
    await page.waitForSelector('[data-testid="chat-toggle"]');
    
    // Open chat
    await page.click('[data-testid="chat-toggle"]');
    await page.waitForSelector('[data-testid="chat-input"]');
    
    // Test simplification
    await page.fill('[data-testid="chat-input"]', 'explain like I\'m 12');
    await page.click('[data-testid="chat-send"]');
    
    await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
    const simplifyResponse = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
    expect(simplifyResponse).toContain('simple');
  });

  test('learning preference commands adapt', async ({ page }) => {
    // Start a learning session
    await page.fill('[data-testid="topic-input"]', 'advanced calculus');
    await page.click('[data-testid="preview-button"]');
    
    await page.waitForSelector('[data-testid="confirm-start"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Wait for session to start
    await page.waitForSelector('[data-testid="chat-toggle"]');
    
    // Open chat
    await page.click('[data-testid="chat-toggle"]');
    await page.waitForSelector('[data-testid="chat-input"]');
    
    // Test "don't understand" command
    await page.fill('[data-testid="chat-input"]', 'I don\'t get it');
    await page.click('[data-testid="chat-send"]');
    
    await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
    const understandResponse = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
    expect(understandResponse).toContain('differently');
    
    // Test "examples" command
    await page.fill('[data-testid="chat-input"]', 'give me examples');
    await page.click('[data-testid="chat-send"]');
    
    await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
    const examplesResponse = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
    expect(examplesResponse).toContain('example');
  });

  test('navigation commands work correctly', async ({ page }) => {
    // Start a learning session
    await page.fill('[data-testid="topic-input"]', 'web development');
    await page.click('[data-testid="preview-button"]');
    
    await page.waitForSelector('[data-testid="confirm-start"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Wait for session to start
    await page.waitForSelector('[data-testid="chat-toggle"]');
    
    // Open chat
    await page.click('[data-testid="chat-toggle"]');
    await page.waitForSelector('[data-testid="chat-input"]');
    
    // Test "what's next" command
    await page.fill('[data-testid="chat-input"]', 'what\'s next');
    await page.click('[data-testid="chat-send"]');
    
    await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
    const nextResponse = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
    expect(nextResponse).toContain('next');
    
    // Test "show progress" command
    await page.fill('[data-testid="chat-input"]', 'show my progress');
    await page.click('[data-testid="chat-send"]');
    
    await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
    const progressResponse = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
    expect(progressResponse).toContain('progress');
  });

  test('intent suggestions appear and work', async ({ page }) => {
    // Start a learning session
    await page.fill('[data-testid="topic-input"]', 'artificial intelligence');
    await page.click('[data-testid="preview-button"]');
    
    await page.waitForSelector('[data-testid="confirm-start"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Wait for session to start
    await page.waitForSelector('[data-testid="chat-toggle"]');
    
    // Open chat
    await page.click('[data-testid="chat-toggle"]');
    await page.waitForSelector('[data-testid="chat-input"]');
    
    // Check for intent suggestions
    const suggestions = page.locator('text=Try saying:');
    await expect(suggestions).toBeVisible();
    
    // Click on a suggestion
    const firstSuggestion = page.locator('button:has-text("Make this shorter")').first();
    if (await firstSuggestion.isVisible()) {
      await firstSuggestion.click();
      
      // Should send the suggestion as a message
      await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-900');
      const userMessage = await page.textContent('[data-testid="chat-messages"] .bg-zinc-900:last-child');
      expect(userMessage).toBe('Make this shorter');
    }
  });

  test('chat placeholder changes with interaction engine', async ({ page }) => {
    // Start a learning session
    await page.fill('[data-testid="topic-input"]', 'blockchain technology');
    await page.click('[data-testid="preview-button"]');
    
    await page.waitForSelector('[data-testid="confirm-start"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Wait for session to start
    await page.waitForSelector('[data-testid="chat-toggle"]');
    
    // Open chat
    await page.click('[data-testid="chat-toggle"]');
    await page.waitForSelector('[data-testid="chat-input"]');
    
    // Check that placeholder shows interaction engine hints
    const placeholder = await page.getAttribute('[data-testid="chat-input"]', 'placeholder');
    expect(placeholder).toContain('Try \'make this shorter\'');
  });

  test('general conversation commands work', async ({ page }) => {
    // Start a learning session
    await page.fill('[data-testid="topic-input"]', 'machine learning');
    await page.click('[data-testid="preview-button"]');
    
    await page.waitForSelector('[data-testid="confirm-start"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Wait for session to start
    await page.waitForSelector('[data-testid="chat-toggle"]');
    
    // Open chat
    await page.click('[data-testid="chat-toggle"]');
    await page.waitForSelector('[data-testid="chat-input"]');
    
    // Test general conversation
    await page.fill('[data-testid="chat-input"]', 'Can you help me understand this better?');
    await page.click('[data-testid="chat-send"]');
    
    await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
    const response = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
    expect(response).toBeTruthy();
    expect(response!.length).toBeGreaterThan(10);
  });

  test('error handling for unclear commands', async ({ page }) => {
    // Start a learning session
    await page.fill('[data-testid="topic-input"]', 'data structures');
    await page.click('[data-testid="preview-button"]');
    
    await page.waitForSelector('[data-testid="confirm-start"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Wait for session to start
    await page.waitForSelector('[data-testid="chat-toggle"]');
    
    // Open chat
    await page.click('[data-testid="chat-toggle"]');
    await page.waitForSelector('[data-testid="chat-input"]');
    
    // Test unclear command
    await page.fill('[data-testid="chat-input"]', 'asdfghjkl');
    await page.click('[data-testid="chat-send"]');
    
    await page.waitForSelector('[data-testid="chat-messages"] .bg-zinc-100');
    const response = await page.textContent('[data-testid="chat-messages"] .bg-zinc-100:last-child');
    expect(response).toContain('rephrasing');
  });
});
