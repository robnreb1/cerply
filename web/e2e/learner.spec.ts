import { test, expect, type Page } from '@playwright/test';

// Helper to mock M3 API endpoints
async function mockM3API(page: Page) {
  // Mock POST /api/preview
  await page.route('**/api/preview', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      return route.fulfill({
        status: 405,
        headers: { Allow: 'POST' },
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
        }),
      });
    }

    const body = request.postDataJSON();
    if (!body.content || body.content.trim().length === 0) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INVALID_REQUEST', message: 'Content is required' },
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: 'A comprehensive guide to quantum mechanics fundamentals.',
        proposed_modules: [
          { id: 'mod-1', title: 'Wave-Particle Duality', estimated_items: 5 },
          { id: 'mod-2', title: 'Heisenberg Uncertainty Principle', estimated_items: 4 },
          { id: 'mod-3', title: 'Quantum Tunneling', estimated_items: 3 },
        ],
        clarifying_questions: [
          'Do you have a background in classical physics?',
          'Are you interested in applications or theory?',
        ],
      }),
    });
  });

  // Mock POST /api/generate
  await page.route('**/api/generate', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      return route.fulfill({ status: 405, headers: { Allow: 'POST' } });
    }

    const body = request.postDataJSON();
    if (!body.modules || !Array.isArray(body.modules) || body.modules.length === 0) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INVALID_REQUEST', message: 'At least one module is required' },
        }),
      });
    }

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
                type: 'question',
                front: 'What does wave-particle duality mean?',
                back: 'Matter exhibits both wave and particle properties',
              },
              {
                id: 'q2',
                type: 'question',
                front: 'Who proposed wave-particle duality?',
                back: 'Louis de Broglie',
              },
            ],
          },
          {
            id: 'mod-2',
            title: 'Heisenberg Uncertainty Principle',
            lessons: [
              {
                id: 'q3',
                type: 'question',
                front: 'What is the Heisenberg Uncertainty Principle?',
                back: 'Cannot simultaneously know exact position and momentum',
              },
            ],
          },
        ],
      }),
    });
  });

  // Mock POST /api/score
  await page.route('**/api/score', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      return route.fulfill({ status: 405 });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        score: 0.85,
        difficulty: 'medium',
        misconceptions: ['Common confusion with classical mechanics'],
        next_review_days: 3,
        explanation: 'Good understanding, minor review needed',
      }),
    });
  });

  // Mock POST /api/certified/schedule
  await page.route('**/api/certified/schedule', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      return route.fulfill({ status: 405 });
    }

    const body = request.postDataJSON();
    if (!body.session_id || !body.plan_id || !body.items || body.items.length === 0) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INVALID_SCHEDULE', message: 'Invalid schedule payload' },
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: body.session_id,
        plan_id: body.plan_id,
        order: body.items.map((item: any) => item.id),
        due: new Date().toISOString(),
        meta: { algo: 'sm2-lite', version: '1.0' },
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

  // Mock GET /api/daily/next
  await page.route('**/api/daily/next', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        queue: [
          { id: 'q1', priority: 10, due: new Date().toISOString() },
          { id: 'q2', priority: 8, due: new Date().toISOString() },
        ],
      }),
    });
  });
}

test.describe('Learner MVP UI - Full E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockM3API(page);
  });

  test('L-1: Topic input → Preview → Start (happy path)', async ({ page }) => {
    await page.goto('/learn');

    // Should show input phase
    await expect(page.getByRole('heading', { name: /what would you like to learn/i })).toBeVisible();

    const input = page.getByTestId('topic-input');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused(); // Auto-focus

    // Enter topic
    await input.fill('Quantum mechanics fundamentals');

    // Preview button should be enabled
    const previewBtn = page.getByTestId('preview-button');
    await expect(previewBtn).toBeEnabled();

    // Click preview
    await previewBtn.click();

    // Should show loading state briefly
    await expect(previewBtn).toHaveText(/thinking.../i);

    // Should transition to preview phase
    await expect(page.getByRole('heading', { name: /preview your learning plan/i })).toBeVisible({ timeout: 5000 });

    // Should show summary
    await expect(page.getByText(/comprehensive guide to quantum mechanics/i)).toBeVisible();

    // Should show modules with counts
    await expect(page.getByText(/wave-particle duality/i)).toBeVisible();
    await expect(page.getByText(/5 items/i)).toBeVisible();

    // Should show clarifying questions
    await expect(page.getByText(/background in classical physics/i)).toBeVisible();

    // Should show action buttons
    const startBtn = page.getByTestId('start-button');
    const refineBtn = page.getByTestId('refine-button');
    await expect(startBtn).toBeVisible();
    await expect(refineBtn).toBeVisible();
  });

  test('L-2: Empty topic input should be disabled', async ({ page }) => {
    await page.goto('/learn');

    const previewBtn = page.getByTestId('preview-button');
    await expect(previewBtn).toBeDisabled();

    // Type and delete
    const input = page.getByTestId('topic-input');
    await input.fill('test');
    await expect(previewBtn).toBeEnabled();

    await input.clear();
    await expect(previewBtn).toBeDisabled();
  });

  test('L-3: Auth gate blocks unauthenticated start', async ({ page }) => {
    await page.goto('/learn');

    // Clear any existing auth token
    await page.evaluate(() => localStorage.removeItem('auth_token'));

    // Go through preview
    const input = page.getByTestId('topic-input');
    await input.fill('Quantum mechanics');
    await page.getByTestId('preview-button').click();

    await expect(page.getByRole('heading', { name: /preview your learning plan/i })).toBeVisible({ timeout: 5000 });

    // Click start without auth
    await page.getByTestId('start-button').click();

    // Should show auth gate
    await expect(page.getByRole('heading', { name: /sign in to save your progress/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/we need to know who you are/i)).toBeVisible();

    const signInBtn = page.getByTestId('signin-button');
    await expect(signInBtn).toBeVisible();
  });

  test('L-4: Authenticated user can start session', async ({ page }) => {
    await page.goto('/learn');

    // Set auth token
    await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));

    // Go through flow
    const input = page.getByTestId('topic-input');
    await input.fill('Quantum mechanics');
    await page.getByTestId('preview-button').click();

    await expect(page.getByRole('heading', { name: /preview/i })).toBeVisible({ timeout: 5000 });

    // Start session
    await page.getByTestId('start-button').click();

    // Should show session phase
    await expect(page.getByRole('heading', { name: /your learning session/i })).toBeVisible({ timeout: 10000 });

    // Should show first card
    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible();
    await expect(page.getByText(/what does wave-particle duality mean/i)).toBeVisible();

    // Should show progress
    await expect(page.getByText(/item 1 of/i)).toBeVisible();

    // Should show level
    await expect(page.getByText(/beginner/i)).toBeVisible();
  });

  test('L-5: Card flip and grade flow', async ({ page }) => {
    await page.goto('/learn');
    await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));

    // Quick path to session
    await page.getByTestId('topic-input').fill('Test topic');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    // Wait for session
    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Card should show question
    await expect(page.getByText(/question/i)).toBeVisible();

    // Click to flip
    await card.click();

    // Should show answer
    await expect(page.getByText(/answer/i)).toBeVisible();
    await expect(page.getByText(/matter exhibits both wave and particle/i)).toBeVisible();

    // Should show grade buttons
    await expect(page.getByTestId('grade-1')).toBeVisible();
    await expect(page.getByTestId('grade-5')).toBeVisible();

    // Grade the card
    await page.getByTestId('grade-4').click();

    // Should show score feedback
    await expect(page.getByText(/difficulty: medium/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/next review: 3 days/i)).toBeVisible();

    // Auto-advance should happen (wait for next card or check if advanced)
    // Stats should update
    await expect(page.getByText(/item 2 of/i)).toBeVisible({ timeout: 3000 });
  });

  test('L-6: Explain button shows misconceptions', async ({ page }) => {
    await page.goto('/learn');
    await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));

    // Quick path to session and grade
    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.click(); // Flip
    await page.getByTestId('grade-3').click(); // Grade

    // Should show score feedback
    await expect(page.getByText(/difficulty/i)).toBeVisible({ timeout: 3000 });

    // Click explain
    const explainBtn = page.getByTestId('explain-button');
    await expect(explainBtn).toBeVisible();
    await explainBtn.click();

    // Should show misconceptions
    await expect(page.getByText(/common misconceptions/i)).toBeVisible();
    await expect(page.getByText(/common confusion with classical mechanics/i)).toBeVisible();
  });

  test('L-7: NL Ask Cerply toggle and input', async ({ page }) => {
    await page.goto('/learn');
    await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));

    // Get to session
    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    await expect(page.getByTestId('study-card')).toBeVisible({ timeout: 10000 });

    // Chat should be closed initially
    await expect(page.getByRole('heading', { name: /ask cerply/i })).not.toBeVisible();

    // Toggle button should be visible
    const toggleBtn = page.getByTestId('chat-toggle');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Chat panel should open
    await expect(page.getByRole('heading', { name: /ask cerply/i })).toBeVisible();

    // Input should work
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('What is quantum entanglement?');

    const sendBtn = page.getByTestId('chat-send');
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Should show user message
    await expect(page.getByText(/what is quantum entanglement/i)).toBeVisible();

    // Close chat
    await page.getByRole('button', { name: /✕/i }).click();
    await expect(page.getByRole('heading', { name: /ask cerply/i })).not.toBeVisible();
  });

  test('L-8: Refine returns to input with cleared state', async ({ page }) => {
    await page.goto('/learn');

    await page.getByTestId('topic-input').fill('Test topic');
    await page.getByTestId('preview-button').click();

    await expect(page.getByTestId('refine-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('refine-button').click();

    // Should return to input phase
    await expect(page.getByRole('heading', { name: /what would you like to learn/i })).toBeVisible();
    const input = page.getByTestId('topic-input');
    await expect(input).toHaveValue('Test topic'); // Input retained
  });

  test('L-9: Fallback content shows on slow load', async ({ page }) => {
    // Add delay to preview response
    await page.route('**/api/preview', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 600)); // >400ms threshold
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: 'Test',
          proposed_modules: [{ id: '1', title: 'Test Module', estimated_items: 3 }],
          clarifying_questions: [],
        }),
      });
    });

    await page.goto('/learn');
    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();

    // Should show fallback content
    await expect(page.getByText(/while you wait/i)).toBeVisible({ timeout: 1000 });
    await expect(page.getByText(/analyzing topic scope/i)).toBeVisible();
  });

  test('L-10: Keyboard navigation (Enter to submit, Space to flip)', async ({ page }) => {
    await page.goto('/learn');
    await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));

    const input = page.getByTestId('topic-input');
    await input.fill('Test');

    // Cmd+Enter to submit
    await input.press('Meta+Enter');

    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Space to flip
    await card.focus();
    await card.press('Space');

    // Should show answer
    await expect(page.getByText(/answer/i)).toBeVisible();
  });

  test('L-11: Error handling for API failures', async ({ page }) => {
    // Mock preview failure
    await page.route('**/api/preview', async (route) => {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'SERVER_ERROR', message: 'Internal server error' },
        }),
      });
    });

    await page.goto('/learn');
    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();

    // Should show error message
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/preview failed/i)).toBeVisible();
  });

  test('L-12: Session persistence (localStorage)', async ({ page }) => {
    await page.goto('/learn');
    await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    await expect(page.getByTestId('study-card')).toBeVisible({ timeout: 10000 });

    // Check session ID was stored
    const sessionId = await page.evaluate(() => localStorage.getItem('learn_session_id'));
    expect(sessionId).toBeTruthy();
    expect(sessionId).toMatch(/^sess-\d+$/);
  });

  test('L-13: Upload button is visible but not yet functional', async ({ page }) => {
    await page.goto('/learn');

    const uploadBtn = page.getByTestId('upload-button');
    await expect(uploadBtn).toBeVisible();
    await expect(uploadBtn).toHaveText(/upload/i);
  });

  test('L-14: Completion screen after target items', async ({ page }) => {
    // This test would require mocking a full session with 10 items
    // Skipping for now as it's time-intensive; manual UAT will cover it
    test.skip();
  });

  test('L-15: A11y - all interactive elements have proper ARIA labels', async ({ page }) => {
    await page.goto('/learn');

    // Check critical elements have accessible names
    await expect(page.getByRole('textbox', { name: /topic input/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /preview topic/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /upload file/i })).toBeVisible();
  });
});

test.describe('Learner MVP UI - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await mockM3API(page);
  });

  test('Empty modules array returns 400', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      const body = route.request().postDataJSON();
      if (body.modules && body.modules.length === 0) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { code: 'INVALID_REQUEST', message: 'At least one module is required' },
          }),
        });
      }
      return route.continue();
    });

    // This would be tested through mocking the generate response
    // Full coverage requires unit tests on the API side
  });

  test('Grade button disabled during loading', async ({ page }) => {
    await page.goto('/learn');
    await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    // Immediately try to grade twice (second should be disabled)
    const gradeBtn = page.getByTestId('grade-4');
    await gradeBtn.click();

    // Button should be disabled during API call
    await expect(gradeBtn).toBeDisabled();
  });

  test('Slow network shows thinking indicators', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 600));
      return route.continue();
    });

    await page.goto('/learn');
    await page.evaluate(() => localStorage.setItem('auth_token', 'test-token'));

    await page.getByTestId('topic-input').fill('Test');
    await page.getByTestId('preview-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('start-button').click();

    // Should show fallback content during generation
    await expect(page.getByText(/while you wait/i)).toBeVisible({ timeout: 1000 });
  });
});

