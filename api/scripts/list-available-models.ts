/**
 * List Available LLM Models
 * Queries each API to find what models are actually available
 */
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listAnthropicModels() {
  console.log('\n===== Checking Anthropic Documentation =====');
  console.log('Common Claude models:');
  console.log('- claude-3-5-sonnet-20241022 (latest 3.5 Sonnet)');
  console.log('- claude-3-opus-20240229');
  console.log('- claude-3-sonnet-20240229');
  console.log('\nTrying claude-3-5-sonnet-20241022 explicitly...');
  
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });
    console.log('✅ claude-3-5-sonnet-20241022 works!');
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

async function listGeminiModels() {
  console.log('\n===== Listing Available Gemini Models =====');
  try {
    const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`
    );
    const data = await response.json();
    console.log('Available Gemini models:');
    data.models?.forEach((model: any) => {
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`- ${model.name.replace('models/', '')}`);
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to list models:', error.message);
  }
}

async function main() {
  await listAnthropicModels();
  await listGeminiModels();
}

main();

