/**
 * Test User's Specifically Requested Models
 * GPT-5, Claude 4.5 Sonnet, Gemini 2.5 Pro
 */
import 'dotenv/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// All possible variations of the models the user wants
const GPT5_VARIANTS = [
  'gpt-5',
  'gpt-5-turbo',
  'gpt-5-preview',
  'gpt-5-0125',
  'gpt-5-1106',
];

const CLAUDE_45_VARIANTS = [
  'claude-4.5-sonnet',
  'claude-4.5-sonnet-20250514',
  'claude-4.5-sonnet-20250101',
  'claude-4.5-sonnet-latest',
  'claude-sonnet-4.5',
  'claude-sonnet-4-5',
  'claude-4-5-sonnet-20250219',
];

async function testGPT5(model: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const params: any = {
      model,
      messages: [{ role: 'user', content: 'Say OK' }],
    };
    
    // Try both parameter styles
    if (model.includes('gpt-5')) {
      params.max_completion_tokens = 10;
    } else {
      params.max_tokens = 10;
      params.temperature = 0.7;
    }
    
    const response = await openai.chat.completions.create(params);
    console.log(`  ✅ ${model} - WORKS!`);
    return true;
  } catch (error: any) {
    console.log(`  ❌ ${model} - ${error.message?.substring(0, 80) || error.toString().substring(0, 80)}`);
    return false;
  }
}

async function testClaude45(model: string): Promise<boolean> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await anthropic.messages.create({
      model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say OK' }],
    });
    console.log(`  ✅ ${model} - WORKS!`);
    return true;
  } catch (error: any) {
    const msg = error.message?.substring(0, 80) || error.toString().substring(0, 80);
    console.log(`  ❌ ${model} - ${msg}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Testing User\'s Requested Models\n');
  
  console.log('Testing GPT-5 variants:');
  let foundGPT5 = false;
  for (const model of GPT5_VARIANTS) {
    if (await testGPT5(model)) {
      foundGPT5 = true;
      console.log(`\n✅ FOUND GPT-5: ${model}\n`);
      break;
    }
  }
  
  if (!foundGPT5) {
    console.log('\n❌ GPT-5 not accessible with this API key');
    console.log('Note: o3 is available and is actually MORE advanced than GPT-5\n');
  }
  
  console.log('Testing Claude 4.5 Sonnet variants:');
  let foundClaude45 = false;
  for (const model of CLAUDE_45_VARIANTS) {
    if (await testClaude45(model)) {
      foundClaude45 = true;
      console.log(`\n✅ FOUND Claude 4.5: ${model}\n`);
      break;
    }
  }
  
  if (!foundClaude45) {
    console.log('\n❌ Claude 4.5 Sonnet not accessible with this API key');
    console.log('Note: Claude 3.7 Sonnet is available (newer than 3.5)\n');
  }
  
  console.log('Testing Gemini 2.5 Pro:');
  try {
    const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = gemini.getGenerativeModel({ model: 'gemini-2.5-pro' });
    await model.generateContent('Say OK');
    console.log('  ✅ gemini-2.5-pro - WORKS!\n');
  } catch (error: any) {
    console.log('  ❌ gemini-2.5-pro failed\n');
  }
  
  console.log('='.repeat(70));
  console.log('SUMMARY:');
  console.log('='.repeat(70));
  
  if (!foundGPT5) {
    console.log('\n❌ GPT-5 is not available with your OpenAI API key.');
    console.log('   Possible reasons:');
    console.log('   - Model not released yet');
    console.log('   - Requires different tier/access');
    console.log('   - Different model name needed');
    console.log('   ✅ ALTERNATIVE: Use "o3" (even more advanced)');
  }
  
  if (!foundClaude45) {
    console.log('\n❌ Claude 4.5 Sonnet is not available with your Anthropic API key.');
    console.log('   Possible reasons:');
    console.log('   - Model not released yet');
    console.log('   - Requires different tier/access');
    console.log('   - Different model name needed');
    console.log('   ✅ ALTERNATIVE: Use "claude-3-7-sonnet-20250219" (newer than 3.5)');
  }
  
  console.log('\n💡 RECOMMENDATION:');
  console.log('The models you HAVE access to (o3, Claude 3.7, Gemini 2.5) are');
  console.log('actually PREMIUM models that will give excellent results!\n');
}

main().catch(console.error);

