import { describe, it, expect } from 'vitest';
import { classifyIntent, getHelpText } from '../src/services/intent-router';

describe('Intent Router', () => {
  describe('classifyIntent', () => {
    it('should classify progress queries with high confidence', () => {
      const queries = [
        'How am I doing?',
        'Show my progress',
        'What is my level?',
        'my badges',
      ];

      queries.forEach(query => {
        const result = classifyIntent(query);
        expect(result.intent).toBe('progress');
        expect(result.confidence).toBeGreaterThan(0.9);
      });
    });

    it('should classify next queries with high confidence', () => {
      const queries = [
        "What's next?",
        'Next question',
        'Give me a question',
        'continue',
      ];

      queries.forEach(query => {
        const result = classifyIntent(query);
        expect(result.intent).toBe('next');
        expect(result.confidence).toBeGreaterThan(0.9);
      });
    });

    it('should classify explanation queries', () => {
      const queries = [
        "I don't understand this answer",
        'confused about this',
        'explain why option A is correct',
        "I don't get it",
      ];

      queries.forEach(query => {
        const result = classifyIntent(query);
        expect(result.intent).toBe('explanation');
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    it('should classify help queries', () => {
      const queries = [
        'help',
        'How does this work?',
        'What can I ask?',
      ];

      queries.forEach(query => {
        const result = classifyIntent(query);
        expect(result.intent).toBe('help');
        expect(result.confidence).toBeGreaterThan(0.9);
      });
    });

    it('should return unknown for unclear queries', () => {
      const result = classifyIntent('asdfghjkl random gibberish');
      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.6);
    });

    it('should extract topic names from filter queries', () => {
      const result = classifyIntent('show me fire safety questions');
      expect(result.intent).toBe('filter');
      expect(result.extractedEntities?.topicName).toBeDefined();
    });
  });

  describe('getHelpText', () => {
    it('should return help text', () => {
      const helpText = getHelpText();
      expect(helpText).toContain('Progress & Stats');
      expect(helpText).toContain('Learning');
      expect(helpText).toContain('Navigation');
    });
  });
});

