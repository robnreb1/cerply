/**
 * Epic 6: Ensemble Content Generation - Test Suite
 * Tests for LLM orchestrator, canon storage, and content routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PROMPTS } from '../src/services/llm-orchestrator';
import {
  isGenericContent,
  classifyContentType,
  calculateCanonSavings,
} from '../src/services/canon';

// ==============================================================================
// LLM Orchestrator Tests
// ==============================================================================

describe('LLM Orchestrator', () => {
  describe('PROMPTS', () => {
    it('should have all required prompt templates', () => {
      expect(PROMPTS.understanding).toBeDefined();
      expect(PROMPTS.refinement).toBeDefined();
      expect(PROMPTS.generatorA).toBeDefined();
      expect(PROMPTS.generatorB).toBeDefined();
      expect(PROMPTS.factChecker).toBeDefined();
    });

    it('should have system and user prompts for understanding', () => {
      expect(PROMPTS.understanding.system).toContain('learning designer');
      expect(PROMPTS.understanding.user).toContain('{{ARTEFACT}}');
    });

    it('should have placeholder variables in refinement prompt', () => {
      expect(PROMPTS.refinement.user).toContain('{{ARTEFACT}}');
      expect(PROMPTS.refinement.user).toContain('{{PREVIOUS_UNDERSTANDING}}');
      expect(PROMPTS.refinement.user).toContain('{{FEEDBACK}}');
    });

    it('should have placeholder variables in generator prompts', () => {
      expect(PROMPTS.generatorA.user).toContain('{{UNDERSTANDING}}');
      expect(PROMPTS.generatorA.user).toContain('{{ARTEFACT}}');
      expect(PROMPTS.generatorB.user).toContain('{{UNDERSTANDING}}');
      expect(PROMPTS.generatorB.user).toContain('{{ARTEFACT}}');
    });

    it('should request JSON output from generators', () => {
      expect(PROMPTS.generatorA.user).toContain('JSON');
      expect(PROMPTS.generatorB.user).toContain('JSON');
      expect(PROMPTS.factChecker.user).toContain('JSON');
    });

    it('should instruct fact-checker to verify against source', () => {
      expect(PROMPTS.factChecker.user).toContain('Verify all facts');
      expect(PROMPTS.factChecker.user).toContain('hallucinations');
      expect(PROMPTS.factChecker.user).toContain('{{GENERATOR_A_OUTPUT}}');
      expect(PROMPTS.factChecker.user).toContain('{{GENERATOR_B_OUTPUT}}');
    });

    it('should request provenance in fact-checker output', () => {
      expect(PROMPTS.factChecker.user).toContain('provenance');
      expect(PROMPTS.factChecker.user).toContain('source');
    });
  });

  describe('Prompt Replacement', () => {
    it('should replace artefact placeholder correctly', () => {
      const artefact = 'Fire safety procedures';
      const replaced = PROMPTS.understanding.user.replace('{{ARTEFACT}}', artefact);
      expect(replaced).toContain('Fire safety procedures');
      expect(replaced).not.toContain('{{ARTEFACT}}');
    });

    it('should replace multiple placeholders in refinement', () => {
      let prompt = PROMPTS.refinement.user;
      prompt = prompt.replace('{{ARTEFACT}}', 'Test artefact');
      prompt = prompt.replace('{{PREVIOUS_UNDERSTANDING}}', 'Test understanding');
      prompt = prompt.replace('{{FEEDBACK}}', 'Test feedback');
      
      expect(prompt).toContain('Test artefact');
      expect(prompt).toContain('Test understanding');
      expect(prompt).toContain('Test feedback');
      expect(prompt).not.toContain('{{');
    });
  });

  describe('Generator Differentiation', () => {
    it('should have different approaches for Generator A and B', () => {
      const aPrompt = PROMPTS.generatorA.system;
      const bPrompt = PROMPTS.generatorB.system;
      
      expect(aPrompt).not.toEqual(bPrompt);
      expect(bPrompt).toContain('different pedagogical approach');
    });

    it('should emphasize storytelling in Generator B', () => {
      expect(PROMPTS.generatorB.user).toContain('Storytelling');
      expect(PROMPTS.generatorB.user).toContain('scenarios');
    });
  });
});

// ==============================================================================
// Canon Storage Tests
// ==============================================================================

describe('Canon Storage', () => {
  describe('isGenericContent', () => {
    it('should detect fire safety as generic', () => {
      expect(isGenericContent('Fire safety procedures for evacuation')).toBe(true);
    });

    it('should detect GDPR as generic', () => {
      expect(isGenericContent('GDPR compliance requirements for data protection')).toBe(true);
    });

    it('should detect multiple generic keywords', () => {
      expect(isGenericContent('Workplace safety and emergency evacuation procedures')).toBe(true);
    });

    it('should not detect proprietary content as generic', () => {
      expect(isGenericContent('Acme Corp internal policy XYZ for project management')).toBe(false);
    });

    it('should not detect generic with only one keyword', () => {
      expect(isGenericContent('Our company fire drill schedule')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isGenericContent('FIRE SAFETY and EMERGENCY procedures')).toBe(true);
    });
  });

  describe('classifyContentType', () => {
    it('should classify as generic with 3+ keywords', () => {
      expect(classifyContentType('Fire safety, emergency evacuation, and workplace safety')).toBe('generic');
    });

    it('should classify as mixed with 1-2 keywords', () => {
      expect(classifyContentType('Our fire safety policy for Acme Corp')).toBe('mixed');
    });

    it('should classify as proprietary with 0 keywords', () => {
      expect(classifyContentType('Project management guidelines for internal teams')).toBe('proprietary');
    });
  });

  describe('calculateCanonSavings', () => {
    it('should calculate 100% savings for reuse', () => {
      expect(calculateCanonSavings(0.52)).toBe(0.52);
    });

    it('should handle different cost amounts', () => {
      expect(calculateCanonSavings(1.0)).toBe(1.0);
      expect(calculateCanonSavings(0.25)).toBe(0.25);
    });
  });
});

// ==============================================================================
// Content Type Classification Tests
// ==============================================================================

describe('Content Classification', () => {
  const genericExamples = [
    'Fire safety procedures: In case of fire, evacuate immediately and call emergency services',
    'GDPR data protection: Personal data must be processed lawfully and stored securely',
    'Workplace harassment: All employees have the right to a harassment-free workplace',
    'Security awareness: Phishing emails are a common threat; verify sender before clicking',
  ];

  const proprietaryExamples = [
    'Acme Corp Q4 product roadmap and feature prioritization',
    'Internal code review process for the engineering team',
    'Company-specific CRM configuration and workflows',
  ];

  genericExamples.forEach((example, idx) => {
    it(`should detect generic example ${idx + 1}`, () => {
      expect(isGenericContent(example)).toBe(true);
    });
  });

  proprietaryExamples.forEach((example, idx) => {
    it(`should detect proprietary example ${idx + 1}`, () => {
      expect(isGenericContent(example)).toBe(false);
    });
  });
});

// ==============================================================================
// Error Handling Tests
// ==============================================================================

describe('Error Handling', () => {
  it('should handle empty artefact text', () => {
    expect(isGenericContent('')).toBe(false);
  });

  it('should handle very short text', () => {
    expect(isGenericContent('Fire')).toBe(false);
  });

  it('should handle special characters', () => {
    expect(isGenericContent('Fire safety & emergency procedures!!!')).toBe(true);
  });

  it('should handle unicode characters', () => {
    expect(isGenericContent('Fire safety 🔥 and emergency evacuation 🚨')).toBe(true);
  });
});

// ==============================================================================
// Integration Tests (Mock-based)
// ==============================================================================

describe('Integration Scenarios', () => {
  it('should identify reusable content in typical flow', () => {
    const artefact = 'Fire safety: evacuate immediately, call emergency, meet at assembly point';
    
    const isGeneric = isGenericContent(artefact);
    expect(isGeneric).toBe(true);
    
    const contentType = classifyContentType(artefact);
    expect(contentType).toBe('generic');
    
    const savings = calculateCanonSavings(0.52);
    expect(savings).toBeGreaterThan(0);
  });

  it('should handle proprietary content in typical flow', () => {
    const artefact = 'Acme Corp internal workflow for customer support tickets';
    
    const isGeneric = isGenericContent(artefact);
    expect(isGeneric).toBe(false);
    
    const contentType = classifyContentType(artefact);
    expect(contentType).toBe('proprietary');
  });
});

// ==============================================================================
// Prompt Quality Tests
// ==============================================================================

describe('Prompt Quality', () => {
  it('should have clear instructions in understanding prompt', () => {
    expect(PROMPTS.understanding.user).toContain('explain');
    expect(PROMPTS.understanding.user).toContain('understand');
  });

  it('should request specific format in understanding', () => {
    expect(PROMPTS.understanding.user).toContain('I understand this covers');
  });

  it('should have quality criteria in generator prompts', () => {
    expect(PROMPTS.generatorA.user).toContain('multiple choice questions');
    expect(PROMPTS.generatorA.user).toContain('explanation');
  });

  it('should request structured output with IDs', () => {
    expect(PROMPTS.generatorA.user).toMatch(/id.*module/i);
  });

  it('should emphasize fact-checking in fact-checker prompt', () => {
    expect(PROMPTS.factChecker.system).toContain('fact-checker');
    expect(PROMPTS.factChecker.system).toContain('verify');
    expect(PROMPTS.factChecker.user).toContain('hallucinations');
  });
});

// ==============================================================================
// Cost Calculation Tests
// ==============================================================================

describe('Cost Estimation', () => {
  it('should calculate savings correctly', () => {
    const originalCost = 0.52;
    const savings = calculateCanonSavings(originalCost);
    
    expect(savings).toBe(0.52);
    expect(savings / originalCost).toBe(1.0); // 100% savings
  });

  it('should handle zero cost', () => {
    expect(calculateCanonSavings(0)).toBe(0);
  });

  it('should handle large costs', () => {
    const largeCost = 10.50;
    expect(calculateCanonSavings(largeCost)).toBe(largeCost);
  });
});

// ==============================================================================
// Content Validation Tests
// ==============================================================================

describe('Content Validation', () => {
  it('should validate minimum keyword count for generic detection', () => {
    // Need at least 2 keywords
    expect(isGenericContent('fire safety procedures')).toBe(true);
    expect(isGenericContent('only fire mentioned here')).toBe(false);
  });

  it('should ignore common stop words in similarity', () => {
    const text1 = 'The fire safety procedures are important';
    const text2 = 'Fire safety procedures';
    
    // Both should be detected as generic
    expect(isGenericContent(text1)).toBe(true);
    expect(isGenericContent(text2)).toBe(true);
  });
});

// ==============================================================================
// Boundary Tests
// ==============================================================================

describe('Boundary Conditions', () => {
  it('should handle very long artefacts', () => {
    const longArtefact = 'Fire safety and emergency evacuation procedures. '.repeat(1000);
    expect(isGenericContent(longArtefact)).toBe(true);
  });

  it('should handle text with no spaces', () => {
    expect(isGenericContent('firesafetyemergency')).toBe(false);
  });

  it('should handle null-like values gracefully', () => {
    expect(() => isGenericContent(null as any)).not.toThrow();
  });
});

