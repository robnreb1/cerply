#!/usr/bin/env bash
# Direct Unit Test for Module Creation Agent
# Tests the agent logic directly without auth/HTTP overhead

set -e

echo "🧪 Epic 14 v2.0 - Direct Agent Unit Tests"
echo "==========================================="
echo ""

cd "$(dirname "$0")/api"

# Check if we can run TypeScript
if ! command -v npx &> /dev/null; then
  echo "❌ npx not found - please install Node.js"
  exit 1
fi

echo "Running TypeScript agent tests..."
echo ""

# Create inline test script
cat > /tmp/test-agent.ts << 'EOF'
import { moduleCreationAgent, ConversationTurn, ModuleCreationContext } from './src/services/module-creation-agent';

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Natural Context Inference');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const ctx1: ModuleCreationContext = {
    conversationHistory: [],
    managerId: 'test-manager-123',
    organizationId: 'test-org-456',
  };
  
  // Simulate first message
  ctx1.conversationHistory.push({
    role: 'manager',
    content: 'I need to train my sales team on our new product pricing model',
    timestamp: new Date(),
  });
  
  try {
    const response1 = await moduleCreationAgent(ctx1);
    console.log('\n📩 Agent Response:');
    console.log(response1.message);
    console.log('\n📋 Suggestions:', response1.suggestions);
    console.log('📊 Needs More Info:', response1.needsMoreInfo);
    console.log('✅ Ready to Create:', response1.readyToCreate);
    
    // Assertions
    const msg = response1.message.toLowerCase();
    
    if (msg.includes('what topic') || msg.includes('what would you like to train')) {
      console.log('\n❌ FAIL: Agent asked about topic (should have inferred from "pricing model")');
    } else {
      console.log('\n✅ PASS: Agent did not ask obvious "what topic" question');
    }
    
    if (msg.includes('document') || msg.includes('material') || msg.includes('experience')) {
      console.log('✅ PASS: Agent asked smart clarifying question');
    } else {
      console.log('⚠️  WARN: Agent may not have asked specific follow-up');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Module Preview Generation (One-Shot)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const ctx2: ModuleCreationContext = {
      conversationHistory: [],
      managerId: 'test-manager-123',
      organizationId: 'test-org-456',
    };
    
    ctx2.conversationHistory.push({
      role: 'manager',
      content: 'Train my engineering team on TypeScript generics. They\'re intermediate level. Need 85% proficiency by Dec 1st.',
      timestamp: new Date(),
    });
    
    const response2 = await moduleCreationAgent(ctx2);
    console.log('\n📩 Agent Response:');
    console.log(response2.message);
    
    if (response2.modulePreview) {
      console.log('\n📊 Module Preview Generated:');
      console.log('  Title:', response2.modulePreview.title);
      console.log('  Target Level:', response2.modulePreview.targetMasteryLevel);
      console.log('  Estimated:', response2.modulePreview.estimatedMinutes, 'minutes');
      console.log('  Sections:', response2.modulePreview.contentBlocks.length);
      console.log('  Target Proficiency:', response2.modulePreview.targetProficiencyPct + '%');
      
      console.log('\n✅ PASS: Agent generated module preview immediately');
      
      if (response2.modulePreview.title.toLowerCase().includes('typescript')) {
        console.log('✅ PASS: Title is specific (mentions TypeScript)');
      }
      
      if (response2.modulePreview.targetProficiencyPct === 85) {
        console.log('✅ PASS: Target proficiency matches request (85%)');
      } else {
        console.log(`⚠️  WARN: Target proficiency is ${response2.modulePreview.targetProficiencyPct}% (requested 85%)`);
      }
    } else {
      console.log('\n❌ FAIL: Agent didn\'t generate preview (all info was provided)');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Loop-Guard (No Repeated Questions)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const ctx3: ModuleCreationContext = {
      conversationHistory: [],
      managerId: 'test-manager-123',
      organizationId: 'test-org-456',
      conversationId: 'test-conv-789',
    };
    
    // Turn 1
    ctx3.conversationHistory.push({
      role: 'manager',
      content: 'I need to train my sales team on pricing',
      timestamp: new Date(),
    });
    
    const resp3a = await moduleCreationAgent(ctx3);
    
    ctx3.conversationHistory.push({
      role: 'agent',
      content: resp3a.message,
      suggestions: resp3a.suggestions,
      timestamp: new Date(),
    });
    
    // Turn 2: Provide answer
    ctx3.conversationHistory.push({
      role: 'manager',
      content: 'They are experienced sellers, ready by Jan 15',
      timestamp: new Date(),
    });
    
    const resp3b = await moduleCreationAgent(ctx3);
    console.log('\n📩 Agent Response (Turn 2):');
    console.log(resp3b.message);
    
    const msg3 = resp3b.message.toLowerCase();
    
    if (msg3.includes('experience level') || msg3.includes('experience?')) {
      console.log('\n❌ FAIL: Agent asked about experience again');
    } else {
      console.log('\n✅ PASS: Agent did not repeat experience question');
    }
    
    if (msg3.includes('when do you need') || msg3.includes('deadline?')) {
      console.log('❌ FAIL: Agent asked about deadline again');
    } else {
      console.log('✅ PASS: Agent did not repeat deadline question');
    }
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

runTests().then(() => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Agent Unit Tests Complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test Runner Failed:', error);
  process.exit(1);
});
EOF

# Run the test with ts-node
echo "Executing agent tests..."
npx ts-node /tmp/test-agent.ts

# Cleanup
rm -f /tmp/test-agent.ts

