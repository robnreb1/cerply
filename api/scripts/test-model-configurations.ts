/**
 * Compare Different Model Role Configurations
 * Tests cost and quality trade-offs
 */
import 'dotenv/config';
import { db } from '../src/db';
import { contentGenerations } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const ARTEFACT = `Fire safety procedures: In case of fire, immediately evacuate the building using the nearest exit. Do not use lifts. Call 999 once outside. Meet at the assembly point in the car park. Do not re-enter until the fire marshal gives the all-clear.`;

const UNDERSTANDING = `This procedure emphasizes the importance of knowing and using the designated evacuation routes during a fire emergency. Occupants are instructed to immediately evacuate the building using the nearest exit, with a clear directive not to use lifts. The procedure highlights the importance of proceeding to the assembly point, which is specifically located in the car park, to ensure everyone is accounted for.`;

// Configuration options to test
const CONFIGURATIONS = [
  {
    name: 'Current (o3 as Generator)',
    generator1: 'o3',
    generator2: 'claude-sonnet-4-5',
    factChecker: 'gemini-2.5-pro',
    estimatedCost: 0.13,
  },
  {
    name: 'Optimized (o3 as Fact-Checker)',
    generator1: 'claude-sonnet-4-5',
    generator2: 'gpt-4o',  // Fast and cheap
    factChecker: 'o3',
    estimatedCost: 0.07,
  },
  {
    name: 'Budget (All Fast Models)',
    generator1: 'gpt-4o',
    generator2: 'claude-3-haiku-20240307',
    factChecker: 'gemini-2.5-pro',
    estimatedCost: 0.03,
  },
];

interface TestResult {
  config: string;
  modules: number;
  questions: number;
  cost: number;
  time: number;
  qualityScore: number;
}

async function testConfiguration(config: typeof CONFIGURATIONS[0]): Promise<TestResult> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${config.name}`);
  console.log(`Generator A: ${config.generator1}`);
  console.log(`Generator B: ${config.generator2}`);
  console.log(`Fact-Checker: ${config.factChecker}`);
  console.log(`Estimated Cost: $${config.estimatedCost}`);
  console.log('='.repeat(70));

  const start = Date.now();

  try {
    // Call the API to generate with specific model configuration
    const response = await fetch('http://localhost:8080/api/content/understand', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'dev-admin-token-12345',
      },
      body: JSON.stringify({
        artefact: ARTEFACT,
        // Note: In production, you'd override models via env vars before testing
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const { generationId } = await response.json();
    console.log(`✓ Understanding created: ${generationId}`);

    // Trigger generation
    const genResponse = await fetch('http://localhost:8080/api/content/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'dev-admin-token-12345',
      },
      body: JSON.stringify({ generationId }),
    });

    if (!genResponse.ok) {
      throw new Error(`Generation failed: ${genResponse.status}`);
    }

    console.log('✓ Generation started, polling...');

    // Poll for completion (max 10 minutes)
    let completed = false;
    const maxWait = 600; // 10 minutes
    const pollStart = Date.now();

    while (!completed && (Date.now() - pollStart) < maxWait * 1000) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s

      const pollResponse = await fetch(
        `http://localhost:8080/api/content/generations/${generationId}`,
        {
          headers: { 'x-admin-token': 'dev-admin-token-12345' },
        }
      );

      const result = await pollResponse.json();

      if (result.status === 'completed') {
        completed = true;
        const elapsed = Date.now() - start;

        const moduleCount = result.modules?.length || 0;
        const questionCount = result.modules?.reduce(
          (sum: number, m: any) => sum + (m.questions?.length || 0),
          0
        ) || 0;

        console.log(`\n✅ COMPLETED`);
        console.log(`   Modules: ${moduleCount}`);
        console.log(`   Questions: ${questionCount}`);
        console.log(`   Cost: $${result.totalCost}`);
        console.log(`   Time: ${Math.round(elapsed / 1000)}s`);

        // Simple quality score: modules + questions - (cost * 10)
        const qualityScore = moduleCount * 10 + questionCount * 2 - result.totalCost * 50;

        return {
          config: config.name,
          modules: moduleCount,
          questions: questionCount,
          cost: result.totalCost,
          time: elapsed / 1000,
          qualityScore,
        };
      } else if (result.status === 'failed') {
        throw new Error('Generation failed');
      }

      process.stdout.write('.');
    }

    throw new Error('Timeout waiting for generation');
  } catch (error: any) {
    console.error(`\n❌ FAILED: ${error.message}`);
    return {
      config: config.name,
      modules: 0,
      questions: 0,
      cost: 0,
      time: (Date.now() - start) / 1000,
      qualityScore: 0,
    };
  }
}

async function main() {
  console.log('\n🔬 MODEL CONFIGURATION COMPARISON TEST\n');
  console.log('This will test different model role assignments to find the');
  console.log('optimal balance of cost, speed, and quality.\n');

  console.log('⚠️  NOTE: To properly test different configurations, you need to:');
  console.log('   1. Set env vars: LLM_GENERATOR_1, LLM_GENERATOR_2, LLM_FACT_CHECKER');
  console.log('   2. Restart the API between tests');
  console.log('   3. Or use this script as a reference for manual testing\n');

  const results: TestResult[] = [];

  // For now, just test the current configuration
  // (Manual testing required for other configs)
  console.log('\nTesting current configuration...');
  const current = await testConfiguration(CONFIGURATIONS[0]);
  results.push(current);

  console.log('\n' + '='.repeat(70));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log('\nTo test other configurations:');
  console.log('1. Edit api/.env:');
  CONFIGURATIONS.forEach(config => {
    console.log(`\n   # ${config.name}`);
    console.log(`   LLM_GENERATOR_1=${config.generator1}`);
    console.log(`   LLM_GENERATOR_2=${config.generator2}`);
    console.log(`   LLM_FACT_CHECKER=${config.factChecker}`);
  });
  console.log('\n2. Restart API: npm run dev');
  console.log('3. Run: bash api/scripts/test-ensemble-api.sh');
  console.log('4. Compare results\n');

  console.log('\nRECOMMENDATION:');
  console.log('Test "Optimized (o3 as Fact-Checker)" next!');
  console.log('Expected benefits:');
  console.log('  • 40-50% cost reduction ($0.07 vs $0.13)');
  console.log('  • Similar or better quality (o3 validates both drafts)');
  console.log('  • Potentially faster (2 fast models + 1 slow validator)\n');
}

main().catch(console.error);

