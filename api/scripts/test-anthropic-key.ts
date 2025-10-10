/**
 * Test Anthropic API Key
 * Try multiple models to see if the key works at all
 */
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const models = [
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

async function testModel(model: string) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await anthropic.messages.create({
      model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });
    console.log(`✅ ${model}: WORKS!`);
    return true;
  } catch (error: any) {
    const errorMsg = error.message.includes('404') ? '404 Not Found' : error.message;
    console.log(`❌ ${model}: ${errorMsg}`);
    return false;
  }
}

async function main() {
  console.log('Testing Anthropic API key with multiple models...\n');
  
  let anyWorked = false;
  for (const model of models) {
    const worked = await testModel(model);
    if (worked) anyWorked = true;
  }
  
  if (!anyWorked) {
    console.log('\n⚠️  No Anthropic models are accessible with this API key.');
    console.log('Possible reasons:');
    console.log('1. API key is invalid or expired');
    console.log('2. API key lacks model access (some keys are limited)');
    console.log('3. Account has billing issues');
    console.log('\nWorkaround: Use gpt-4o for Generator 2 instead');
  }
}

main();

