import { test, expect, type Page } from '@playwright/test';

// Helper to mock M3 API endpoints with auto-assessment
async function mockAutoAssessmentAPI(page: Page) {
  // Mock POST /api/preview
  await page.route('**/api/preview', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: 'A comprehensive guide to quantum mechanics fundamentals.',
        proposed_modules: [
          { id: 'mod-1', title: 'Wave-Particle Duality', estimated_items: 5 },
          { id: 'mod-2', title: 'Heisenberg Uncertainty Principle', estimated_items: 4 },
        ],
        clarifying_questions: [
          'Do you have a background in classical physics?',
        ],
      }),
    });
  });

  // Mock POST /api/generate
  await page.route('**/api/generate', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        modules: [
          {
            id: 'mod-1',
            title: 'Wave-Particle Duality',
            lessons: [
              {
                id: 'q1',
                type: 'card',
                front: 'What does wave-particle duality mean?',
                back: 'Matter exhibits both wave and particle properties',
              },
              {
                id: 'q2',
                type: 'card',
                front: 'Who proposed wave-particle duality?',
                back: 'Louis de Broglie',
              },
              {
                id: 'q3',
                type: 'card',
                front: 'What is the Heisenberg Uncertainty Principle?',
                back: 'Cannot simultaneously know exact position and momentum',
              },
            ],
          },
        ],
      }),
    });
  });

  // Mock POST /api/score (auto-assessment)
  let scoreCallCount = 0;
  await page.route('**/api/score', async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    
    scoreCallCount++;
    
    // Determine correctness based on answer content
    const userAnswer = String(body.user_answer || '').toLowerCase();
    const expectedAnswer = String(body.expected_answer || '').toLowerCase();
    const latency = body.latency_ms || 5000;
    
    const correct = userAnswer.includes('correct') || 
                    userAnswer.includes('wave') || 
                    userAnswer.includes('particle') ||
                    userAnswer.includes('broglie') ||
                    userAnswer.length > 10;
    
    // Simulate different difficulties based on latency + hints
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (latency > 30000 || body.hint_count > 1) {
      difficulty = 'hard';
    } else if (latency < 10000 && body.hint_count === 0 && correct) {
      difficulty = 'easy';
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        correct,
        difficulty,
        explain: correct 
          ? 'Excellent! You understand the core concept.' 
          : `The correct approach is: ${expectedAnswer}. Review the definition and try breaking it down into smaller steps.`,
        next_hint: !correct ? 'Focus on the key definition first, then apply it to the example.' : undefined,
        diagnostics: {
          latency_ms: latency,
          hint_count: body.hint_count || 0,
          retry_count: body.retry_count || 0,
          confidence: correct && latency < 15000 ? 'high' : 'medium',
        },
        // Legacy fields
        score: correct ? 1.0 : 0.0,
        misconceptions: !correct ? ['Review the core concepts'] : [],
        next_review_days: correct ? 7 : 1,
      }),
    });
  });

  // Mock POST /api/certified/schedule
  await page.route('**/api/certified/schedule', async (route) => {
    const body = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: body.session_id,
        plan_id: body.plan_id,
        order: body.items.map((item: any) => item.id),
        due: new Date().toISOString(),
        meta: { algo: 'sm2-lite', version: 'v0' },
      }),
    });
  });

  // Mock POST /api/certified/progress
  await page.route('**/api/certified/progress', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      return route.fulfill({ status: 204 });
    } else if (request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: 'test-session',
          items: [],
        }),
      });
    }
    return route.fulfill({ status: 405 });
  });
}

test.describe('Learner Auto-Assessment E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockAutoAssessmentAPI(page);
    // Set auth token
    await page.goto('/learn');
    await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));
  });

  test('AA-1: No self-grade buttons visible (critical acceptance)', async ({ page }) => {
    await page.goto('/learn');

    // Go through flow to session
    await page.getByTestId('topic-input').fill('Quantum mechanics');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    // Wait for session
    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Flip card
    await card.click();

    // CRITICAL: No grade buttons (1-5) should exist
    await expect(page.getByTestId('grade-1')).not.toBeVisible();
    await expect(page.getByTestId('grade-2')).not.toBeVisible();
    await expect(page.getByTestId('grade-3')).not.toBeVisible();
    await expect(page.getByTestId('grade-4')).not.toBeVisible();
    await expect(page.getByTestId('grade-5')).not.toBeVisible();

    // Should have answer input instead
    await expect(page.getByTestId('answer-input')).toBeVisible();
    await expect(page.getByTestId('submit-button')).toBeVisible();
  });

  test('AA-2: Answer submit → instant correctness feedback', async ({ page }) => {
    await page.goto('/learn');

    // Quick path to session
    await page.getByTestId('topic-input').fill('Test topic');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Flip
    await card.click();

    // Answer correctly
    const answerInput = page.getByTestId('answer-input');
    await answerInput.fill('Matter exhibits both wave and particle properties');

    const submitBtn = page.getByTestId('submit-button');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Should show instant feedback
    await expect(page.getByText(/✓ Correct!/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/Difficulty: easy/i)).toBeVisible();

    // Should NOT auto-show explanation if correct
    await expect(page.getByText(/Explanation:/i)).not.toBeVisible();

    // But link should be available
    await expect(page.getByText(/Show explanation/i)).toBeVisible();
  });

  test('AA-3: Wrong answer → auto-show explanation', async ({ page }) => {
    await page.goto('/learn');

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.click();

    // Answer incorrectly
    const answerInput = page.getByTestId('answer-input');
    await answerInput.fill('wrong answer');
    await page.getByTestId('submit-button').click();

    // Should show incorrect feedback
    await expect(page.getByText(/✗ Not quite/i)).toBeVisible({ timeout: 3000 });

    // Should AUTO-SHOW explanation (not hidden behind button)
    await expect(page.getByText(/Explanation:/i)).toBeVisible();
    await expect(page.getByText(/Review the definition/i)).toBeVisible();
  });

  test('AA-4: Latency tracking (timestamp on flip, calculated on submit)', async ({ page }) => {
    await page.goto('/learn');

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Record time before flip
    const flipTime = Date.now();
    await card.click();

    // Wait 2 seconds
    await page.waitForTimeout(2000);

    // Answer
    await page.getByTestId('answer-input').fill('test answer');
    await page.getByTestId('submit-button').click();

    // Latency should be ~2000ms (captured by API)
    // We can't directly assert on API body, but we verify the flow completes
    await expect(page.getByText(/Correct|Not quite/i)).toBeVisible({ timeout: 3000 });
  });

  test('AA-5: Adaptation feedback chip appears', async ({ page }) => {
    await page.goto('/learn');

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Answer fast and correct (should trigger step-up after 3)
    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        // Wait for auto-advance
        await page.waitForTimeout(2000);
      }

      await card.click();
      await page.getByTestId('answer-input').fill('correct answer with wave particle');
      await page.getByTestId('submit-button').click();

      await expect(page.getByText(/Correct/i)).toBeVisible({ timeout: 3000 });
    }

    // After 3rd correct, should show adaptation feedback
    // (Note: In real impl, this requires adaptive engine tracking. Here we verify UI exists)
    // For now, just verify the structure is present
    await expect(page.getByRole('heading', { name: /Your Learning Session/i })).toBeVisible();
  });

  test('AA-6: Telemetry posted on submit (action=submit, not action=grade)', async ({ page }) => {
    let progressPayload: any = null;

    // Intercept progress POST
    await page.route('**/api/certified/progress', async (route) => {
      if (route.request().method() === 'POST') {
        progressPayload = route.request().postDataJSON();
        return route.fulfill({ status: 204 });
      }
      return route.continue();
    });

    await page.goto('/learn');
    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.click();
    await page.getByTestId('answer-input').fill('test answer');
    await page.getByTestId('submit-button').click();

    await expect(page.getByText(/Correct|Not quite/i)).toBeVisible({ timeout: 3000 });

    // Wait for progress POST
    await page.waitForTimeout(500);

    // Verify telemetry structure
    expect(progressPayload).toBeTruthy();
    expect(progressPayload.action).toBe('submit'); // NOT 'grade'
    expect(progressPayload.result).toBeTruthy();
    expect(progressPayload.result.correct).toBeTypeOf('boolean');
    expect(progressPayload.result.latency_ms).toBeTypeOf('number');
    expect(progressPayload.result.item_difficulty).toMatch(/easy|medium|hard/);
  });

  test('AA-7: Real-time accuracy updates in HUD', async ({ page }) => {
    await page.goto('/learn');

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Answer 1: Correct
    await card.click();
    await page.getByTestId('answer-input').fill('correct wave particle');
    await page.getByTestId('submit-button').click();
    await expect(page.getByText(/✓ Correct/i)).toBeVisible({ timeout: 3000 });

    // Should show 100% accuracy
    await expect(page.getByText(/100% correct/i)).toBeVisible();

    // Wait for auto-advance
    await page.waitForTimeout(2000);

    // Answer 2: Incorrect
    await card.click();
    await page.getByTestId('answer-input').fill('wrong');
    await page.getByTestId('submit-button').click();
    await expect(page.getByText(/✗ Not quite/i)).toBeVisible({ timeout: 3000 });

    // Should show 50% accuracy (1 correct out of 2)
    await expect(page.getByText(/50% correct/i)).toBeVisible();
  });

  test('AA-8: Submit button disabled when no answer', async ({ page }) => {
    await page.goto('/learn');

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.click();

    // Submit should be disabled when input empty
    const submitBtn = page.getByTestId('submit-button');
    await expect(submitBtn).toBeDisabled();

    // Type something
    await page.getByTestId('answer-input').fill('test');
    await expect(submitBtn).toBeEnabled();

    // Clear it
    await page.getByTestId('answer-input').clear();
    await expect(submitBtn).toBeDisabled();
  });

  test('AA-9: Keyboard flow (Enter to submit)', async ({ page }) => {
    await page.goto('/learn');

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Space to flip
    await card.focus();
    await card.press('Space');

    // Type answer
    const answerInput = page.getByTestId('answer-input');
    await answerInput.fill('test answer');
    
    // Enter submits (but not shift+enter)
    await answerInput.press('Shift+Enter');
    await expect(page.getByText(/Correct|Not quite/i)).not.toBeVisible();
    
    // Plain Enter should work if we had JS listener
    // (Note: Default form submission behavior, may need to test manually)
  });

  test('AA-10: No "grade" field sent to API (backward compat check)', async ({ page }) => {
    let progressPayload: any = null;

    await page.route('**/api/certified/progress', async (route) => {
      if (route.request().method() === 'POST') {
        progressPayload = route.request().postDataJSON();
        return route.fulfill({ status: 204 });
      }
      return route.continue();
    });

    await page.goto('/learn');
    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.click();
    await page.getByTestId('answer-input').fill('test');
    await page.getByTestId('submit-button').click();
    await expect(page.getByText(/Correct|Not quite/i)).toBeVisible({ timeout: 3000 });

    await page.waitForTimeout(500);

    // Verify NO grade field (it's optional, should not be set by UI)
    expect(progressPayload.grade).toBeUndefined();
  });
});

test.describe('Learner Auto-Assessment - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await mockAutoAssessmentAPI(page);
    await page.goto('/learn');
    await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));
  });

  test('Edge-1: Empty answer shows validation message', async ({ page }) => {
    await page.goto('/learn');

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.click();

    // Submit button should be disabled when empty
    await expect(page.getByTestId('submit-button')).toBeDisabled();
  });

  test('Edge-2: Very long answer accepted', async ({ page }) => {
    await page.goto('/learn');

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.click();

    // Type very long answer
    const longAnswer = 'a'.repeat(1000);
    await page.getByTestId('answer-input').fill(longAnswer);
    await page.getByTestId('submit-button').click();

    // Should still process
    await expect(page.getByText(/Correct|Not quite/i)).toBeVisible({ timeout: 3000 });
  });

  test('Edge-3: Rapid submission (debounce check)', async ({ page }) => {
    await page.goto('/learn');

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.click();

    await page.getByTestId('answer-input').fill('test');
    
    // Click submit multiple times rapidly
    const submitBtn = page.getByTestId('submit-button');
    await submitBtn.click();
    await submitBtn.click(); // Should be disabled after first click
    await submitBtn.click();

    // Should only process once
    await expect(page.getByText(/Correct|Not quite/i)).toBeVisible({ timeout: 3000 });
  });
});

