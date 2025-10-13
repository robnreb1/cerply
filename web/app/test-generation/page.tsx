"use client";

import { useState } from 'react';

// 15 Test Cases for Granularity Detection
const TEST_CASES = [
  // Subject Level (5 cases)
  { id: 1, input: "Leadership", expected: "subject", expectedOutput: "8-12 topics", category: "Subject" },
  { id: 2, input: "Financial Services", expected: "subject", expectedOutput: "10-15 topics", category: "Subject" },
  { id: 3, input: "Soft Skills", expected: "subject", expectedOutput: "8-10 topics", category: "Subject" },
  { id: 4, input: "Risk Management", expected: "subject", expectedOutput: "6-8 topics", category: "Subject" },
  { id: 5, input: "Corporate Training", expected: "subject", expectedOutput: "10-12 topics", category: "Subject" },
  
  // Topic Level (5 cases)
  { id: 6, input: "Effective Delegation", expected: "topic", expectedOutput: "4-6 modules", category: "Topic" },
  { id: 7, input: "Active Listening", expected: "topic", expectedOutput: "4-5 modules", category: "Topic" },
  { id: 8, input: "Conflict Resolution", expected: "topic", expectedOutput: "5-6 modules", category: "Topic" },
  { id: 9, input: "Time Management", expected: "topic", expectedOutput: "4-6 modules", category: "Topic" },
  { id: 10, input: "Emotional Intelligence", expected: "topic", expectedOutput: "5-7 modules", category: "Topic" },
  
  // Module Level (5 cases)
  { id: 11, input: "SMART Goals Framework", expected: "module", expectedOutput: "1 deep module", category: "Module" },
  { id: 12, input: "Eisenhower Matrix", expected: "module", expectedOutput: "1 deep module", category: "Module" },
  { id: 13, input: "5 Whys Technique", expected: "module", expectedOutput: "1 deep module", category: "Module" },
  { id: 14, input: "RACI Matrix", expected: "module", expectedOutput: "1 deep module", category: "Module" },
  { id: 15, input: "Johari Window", expected: "module", expectedOutput: "1 deep module", category: "Module" },
];

export default function TestGenerationPage() {
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

  const handleTestSelect = (testId: number) => {
    const test = TEST_CASES.find(t => t.id === testId);
    if (test) {
      setSelectedTest(testId);
      setCustomInput(test.input);
      setResult(null);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!customInput.trim()) {
      setError('Please enter text or select a test case');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Understanding
      const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token';
      console.log('Using admin token:', adminToken); // Debug
      
      const understandResponse = await fetch(`${apiBase}/api/content/understand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({
          artefact: customInput,
          artefactType: 'text',
        }),
      });

      if (!understandResponse.ok) {
        const errorData = await understandResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${understandResponse.status}`);
      }

      const understandData = await understandResponse.json();

      // Get expected values from test case
      const testCase = TEST_CASES.find(t => t.id === selectedTest);

      setResult({
        ...understandData,
        testCase,
        validations: {
          granularityCorrect: testCase ? understandData.granularity === testCase.expected : null,
          expectedOutput: testCase?.expectedOutput,
        },
      });
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (correct: boolean | null) => {
    if (correct === null) return '⚪';
    return correct ? '✅' : '❌';
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px' }}>
        Granularity Detection Test Interface
      </h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Testing intelligent Subject → Topic → Module detection
      </p>

      {/* Test Case Selector */}
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Select Test Case
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {TEST_CASES.map(test => (
            <button
              key={test.id}
              onClick={() => handleTestSelect(test.id)}
              style={{
                padding: '12px',
                border: selectedTest === test.id ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '6px',
                background: selectedTest === test.id ? '#eff6ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                {test.category} #{test.id}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>
                {test.input}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                → {test.expectedOutput}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Input Field */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
          Test Input
        </label>
        <input
          type="text"
          value={customInput}
          onChange={(e) => {
            setCustomInput(e.target.value);
            setSelectedTest(null); // Clear selection if manually editing
          }}
          placeholder="Enter what you want to teach (e.g., 'Leadership', 'Effective Delegation', 'SMART Goals Framework')"
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '16px',
          }}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !customInput.trim()}
        style={{
          padding: '14px 32px',
          background: loading ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '32px',
        }}
      >
        {loading ? 'Detecting Granularity...' : 'Generate & Test'}
      </button>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#991b1b',
          marginBottom: '24px',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: '#f9fafb',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
              Test Results
            </h2>
          </div>

          {/* Granularity Detection */}
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              Granularity Detection
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Detected
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: result.granularity === 'subject' ? '#7c3aed' :
                        result.granularity === 'module' ? '#ea580c' :
                        '#059669',
                  textTransform: 'uppercase',
                }}>
                  {result.granularity}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Expected Output
                </div>
                <div style={{ fontSize: '16px', fontWeight: 500 }}>
                  {result.granularityMetadata?.expected}
                </div>
              </div>
            </div>
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#166534',
            }}>
              <strong>Reasoning:</strong> {result.granularityMetadata?.reasoning}
            </div>
          </div>

          {/* Validation Results */}
          {result.testCase && (
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Validation
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {getStatusIcon(result.validations.granularityCorrect)}
                  </span>
                  <span style={{ fontSize: '14px' }}>
                    <strong>Granularity:</strong>{' '}
                    {result.validations.granularityCorrect
                      ? `Correct (${result.granularity})`
                      : `Incorrect (expected ${result.testCase.expected}, got ${result.granularity})`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>ℹ️</span>
                  <span style={{ fontSize: '14px' }}>
                    <strong>Expected:</strong> {result.validations.expectedOutput}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Understanding */}
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              LLM Understanding
            </h3>
            <div style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#374151',
              background: '#f9fafb',
              padding: '12px',
              borderRadius: '6px',
              whiteSpace: 'pre-wrap',
            }}>
              {result.understanding}
            </div>
          </div>

          {/* Metadata */}
          <div style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              Generation Metadata
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '14px' }}>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '4px' }}>Cost</div>
                <div style={{ fontWeight: 600 }}>${result.cost?.toFixed(4) || '0.0000'}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '4px' }}>Tokens</div>
                <div style={{ fontWeight: 600 }}>{result.tokens?.toLocaleString() || '0'}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '4px' }}>Status</div>
                <div style={{ fontWeight: 600, color: '#059669' }}>{result.status}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Testing Instructions
        </h3>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li>Select a test case (or enter custom text)</li>
          <li>Click "Generate & Test"</li>
          <li>Verify granularity detection is correct</li>
          <li>Check expected output matches</li>
          <li>Review LLM understanding</li>
        </ol>
        <p style={{ marginTop: '12px', fontSize: '14px', color: '#1e40af' }}>
          <strong>Goal:</strong> All 15 test cases should detect granularity correctly.
        </p>
      </div>
    </div>
  );
}

