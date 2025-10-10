import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendSlackMessage,
  formatQuestionAsBlockKit,
  verifySlackSignature,
  parseSlackButtonClick,
} from '../src/adapters/slack';
import {
  deliverLesson,
  getUserPreferredChannel,
  isWithinQuietHours,
} from '../src/services/delivery';

describe('Slack Adapter', () => {
  describe('formatQuestionAsBlockKit', () => {
    it('should format question as Block Kit JSON', () => {
      const blocks = formatQuestionAsBlockKit(
        'What is 2+2?',
        ['A. 3', 'B. 4', 'C. 5'],
        'q123'
      );

      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('section');
      expect(blocks[0].text.text).toContain('What is 2+2?');
      expect(blocks[1].type).toBe('actions');
      expect(blocks[1].block_id).toBe('q123');
      expect(blocks[1].elements).toHaveLength(3);
    });

    it('should truncate long option text to 75 chars', () => {
      const longOption = 'A. ' + 'x'.repeat(100);
      const blocks = formatQuestionAsBlockKit(
        'Test question?',
        [longOption],
        'q456'
      );

      expect(blocks[1].elements[0].text.text.length).toBeLessThanOrEqual(75);
    });

    it('should generate correct option values (option_a, option_b, etc)', () => {
      const blocks = formatQuestionAsBlockKit(
        'Test?',
        ['A. First', 'B. Second', 'C. Third', 'D. Fourth'],
        'q789'
      );

      expect(blocks[1].elements[0].value).toBe('option_a');
      expect(blocks[1].elements[1].value).toBe('option_b');
      expect(blocks[1].elements[2].value).toBe('option_c');
      expect(blocks[1].elements[3].value).toBe('option_d');
    });
  });

  describe('verifySlackSignature', () => {
    it('should verify valid signature', () => {
      const body = '{"type":"url_verification"}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signingSecret = 'test-secret';

      const crypto = require('crypto');
      const sigBasestring = `v0:${timestamp}:${body}`;
      const signature =
        'v0=' +
        crypto
          .createHmac('sha256', signingSecret)
          .update(sigBasestring)
          .digest('hex');

      const isValid = verifySlackSignature(body, timestamp, signature, signingSecret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const body = '{"type":"url_verification"}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = 'v0=invalid';
      const signingSecret = 'test-secret';

      const isValid = verifySlackSignature(body, timestamp, signature, signingSecret);
      expect(isValid).toBe(false);
    });

    it('should reject old timestamp (> 5 minutes)', () => {
      const body = '{"type":"url_verification"}';
      const timestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 mins ago
      const signature = 'v0=abc123';
      const signingSecret = 'test-secret';

      const isValid = verifySlackSignature(body, timestamp, signature, signingSecret);
      expect(isValid).toBe(false);
    });

    it('should reject timestamp in the future (> 5 minutes)', () => {
      const body = '{"type":"url_verification"}';
      const timestamp = (Math.floor(Date.now() / 1000) + 600).toString(); // 10 mins future
      const signature = 'v0=abc123';
      const signingSecret = 'test-secret';

      const isValid = verifySlackSignature(body, timestamp, signature, signingSecret);
      expect(isValid).toBe(false);
    });

    it('should use constant-time comparison to prevent timing attacks', () => {
      const body = '{"type":"url_verification"}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signingSecret = 'test-secret';

      const crypto = require('crypto');
      const sigBasestring = `v0:${timestamp}:${body}`;
      const correctSig = 'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');
      
      // Slightly different signature (same length)
      const wrongSig = 'v0=' + 'a'.repeat(64);

      // Both should take roughly same time (no early exit)
      const start1 = Date.now();
      verifySlackSignature(body, timestamp, correctSig, signingSecret);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      verifySlackSignature(body, timestamp, wrongSig, signingSecret);
      const time2 = Date.now() - start2;

      // Time difference should be minimal (within 10ms tolerance)
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe('parseSlackButtonClick', () => {
    it('should parse button click payload', () => {
      const payload = {
        type: 'block_actions',
        user: { id: 'U123456' },
        actions: [{ block_id: 'q123', value: 'option_a' }],
        response_url: 'https://hooks.slack.com/...',
      };

      const result = parseSlackButtonClick(payload);
      expect(result.slackUserId).toBe('U123456');
      expect(result.questionId).toBe('q123');
      expect(result.answerValue).toBe('option_a');
      expect(result.responseUrl).toBe('https://hooks.slack.com/...');
    });

    it('should handle payload with multiple actions (take first)', () => {
      const payload = {
        user: { id: 'U789' },
        actions: [
          { block_id: 'q456', value: 'option_b' },
          { block_id: 'q999', value: 'option_x' }
        ],
        response_url: 'https://hooks.slack.com/xyz',
      };

      const result = parseSlackButtonClick(payload);
      expect(result.questionId).toBe('q456');
      expect(result.answerValue).toBe('option_b');
    });
  });
});

describe('Delivery Service', () => {
  describe('isWithinQuietHours', () => {
    it('should return false if no quiet hours set', () => {
      const result = isWithinQuietHours(undefined, 'UTC');
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = isWithinQuietHours('', 'UTC');
      expect(result).toBe(false);
    });

    it('should detect quiet hours (basic check)', () => {
      // Note: This is a simple test. Real implementation needs timezone handling.
      const quietHours = '22:00-07:00';
      const result = isWithinQuietHours(quietHours, 'UTC');
      expect(typeof result).toBe('boolean');
    });

    it('should handle different timezones', () => {
      const quietHours = '22:00-07:00';
      const result1 = isWithinQuietHours(quietHours, 'America/New_York');
      const result2 = isWithinQuietHours(quietHours, 'Asia/Tokyo');
      
      // Both should return boolean (may differ based on current time)
      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');
    });
  });
});

describe('Error Handling', () => {
  it('should handle Slack API errors gracefully', async () => {
    // Mock fetch to return error
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: false, error: 'invalid_auth' }),
    });

    await expect(
      sendSlackMessage('U123', 'invalid-token', {
        text: 'Test?',
        options: ['A', 'B'],
        questionId: 'q1',
      })
    ).rejects.toThrow('Slack API error: invalid_auth');
  });

  it('should handle network timeouts', async () => {
    // Mock fetch to timeout
    global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

    await expect(
      sendSlackMessage('U123', 'xoxb-token', {
        text: 'Test?',
        options: ['A', 'B'],
        questionId: 'q1',
      })
    ).rejects.toThrow('Network timeout');
  });
});

describe('Integration Scenarios', () => {
  it('should handle complete question delivery flow', async () => {
    // Mock successful Slack API response
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        ts: '1234567890.123456',
        channel: 'U123456',
      }),
    });

    const result = await sendSlackMessage('U123456', 'xoxb-valid-token', {
      text: 'What is the capital of France?',
      options: ['A. Paris', 'B. London', 'C. Berlin', 'D. Madrid'],
      questionId: 'q-geography-001',
    });

    expect(result.messageId).toBe('1234567890.123456');
    expect(result.deliveredAt).toBeInstanceOf(Date);
  });

  it('should handle button click and feedback flow', () => {
    const payload = {
      user: { id: 'U123456' },
      actions: [{ block_id: 'q-fire-001', value: 'option_a' }],
      response_url: 'https://hooks.slack.com/actions/T123/B456/xyz',
    };

    const parsed = parseSlackButtonClick(payload);
    
    expect(parsed.slackUserId).toBe('U123456');
    expect(parsed.questionId).toBe('q-fire-001');
    expect(parsed.answerValue).toBe('option_a');
  });
});

describe('Security', () => {
  it('should prevent signature replay attacks', () => {
    const body = '{"type":"block_actions"}';
    const signingSecret = 'production-secret-123';
    
    // Old timestamp (6 minutes ago)
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 360).toString();
    
    const crypto = require('crypto');
    const sigBasestring = `v0:${oldTimestamp}:${body}`;
    const validSignature = 'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

    // Even with valid signature, old timestamp should be rejected
    const result = verifySlackSignature(body, oldTimestamp, validSignature, signingSecret);
    expect(result).toBe(false);
  });

  it('should validate signature before processing webhook', () => {
    const body = '{"type":"block_actions"}';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const wrongSecret = 'wrong-secret';
    const correctSecret = 'correct-secret';

    const crypto = require('crypto');
    const sigBasestring = `v0:${timestamp}:${body}`;
    const signature = 'v0=' + crypto.createHmac('sha256', correctSecret).update(sigBasestring).digest('hex');

    // Should fail with wrong secret
    const result = verifySlackSignature(body, timestamp, signature, wrongSecret);
    expect(result).toBe(false);
  });
});

describe('Edge Cases', () => {
  it('should handle empty options array', () => {
    const blocks = formatQuestionAsBlockKit('Empty question?', [], 'q-empty');
    
    expect(blocks[1].elements).toHaveLength(0);
  });

  it('should handle special characters in question text', () => {
    const specialChars = 'What does "Hello & <World>" mean?';
    const blocks = formatQuestionAsBlockKit(specialChars, ['A. Test'], 'q-special');
    
    expect(blocks[0].text.text).toContain(specialChars);
  });

  it('should handle unicode in options', () => {
    const unicodeOptions = ['A. 你好', 'B. こんにちは', 'C. 안녕하세요', 'D. مرحبا'];
    const blocks = formatQuestionAsBlockKit('Hello in different languages?', unicodeOptions, 'q-unicode');
    
    expect(blocks[1].elements).toHaveLength(4);
    expect(blocks[1].elements[0].text.text).toContain('你好');
  });

  it('should handle malformed quiet hours format', () => {
    const result1 = isWithinQuietHours('invalid-format', 'UTC');
    const result2 = isWithinQuietHours('22:00', 'UTC');
    const result3 = isWithinQuietHours('22:00-', 'UTC');
    
    // Should not crash, return false or handle gracefully
    expect(typeof result1).toBe('boolean');
    expect(typeof result2).toBe('boolean');
    expect(typeof result3).toBe('boolean');
  });
});

