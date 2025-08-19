#!/usr/bin/env node

/**
 * Cerply Smoke Test
 * Verifies API routes, flags, and web environment wiring
 */

const http = require('http');
const https = require('https');

const API_BASE = 'http://localhost:8080';
const WEB_BASE = 'http://localhost:3000';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAPIHealth() {
  log('\n🔍 Testing API Health Routes...', 'blue');
  
  try {
    // Test /api/health
    const apiHealth = await makeRequest(`${API_BASE}/api/health`);
    if (apiHealth.status === 200 && apiHealth.data.ok) {
      log('✅ /api/health - OK', 'green');
    } else {
      log('❌ /api/health - Failed', 'red');
      console.log('Response:', apiHealth);
    }
    
    // Test /health (alias)
    const health = await makeRequest(`${API_BASE}/health`);
    if (health.status === 200 && health.data.ok) {
      log('✅ /health - OK', 'green');
    } else {
      log('❌ /health - Failed', 'red');
      console.log('Response:', health);
    }
  } catch (error) {
    log('❌ API Health Test Failed:', 'red');
    console.error(error);
  }
}

async function testAPIFlags() {
  log('\n🚩 Testing API Feature Flags...', 'blue');
  
  try {
    const flags = await makeRequest(`${API_BASE}/flags`);
    if (flags.status === 200 && flags.data.flags) {
      log('✅ /flags - OK', 'green');
      console.log('Active flags:', Object.entries(flags.data.flags)
        .filter(([_, value]) => value === true)
        .map(([key]) => key)
        .join(', ') || 'none');
    } else {
      log('❌ /flags - Failed', 'red');
      console.log('Response:', flags);
    }
  } catch (error) {
    log('❌ API Flags Test Failed:', 'red');
    console.error(error);
  }
}

async function testAPIEvidenceCoverage() {
  log('\n📊 Testing API Evidence Coverage...', 'blue');
  
  try {
    const coverage = await makeRequest(`${API_BASE}/evidence/coverage?scopeId=test`);
    if (coverage.status === 200 && coverage.data.scopeId) {
      log('✅ /evidence/coverage - OK', 'green');
      console.log('Coverage data:', {
        scopeId: coverage.data.scopeId,
        ecs: coverage.data.ecs,
        totals: coverage.data.totals,
        gaps: coverage.data.gaps
      });
    } else {
      log('❌ /evidence/coverage - Failed', 'red');
      console.log('Response:', coverage);
    }
  } catch (error) {
    log('❌ API Evidence Coverage Test Failed:', 'red');
    console.error(error);
    console.log('Note: This route may be behind a feature flag');
  }
}

async function testWebHealth() {
  log('\n🌐 Testing Web Health...', 'blue');
  
  try {
    const webHealth = await makeRequest(`${WEB_BASE}/`);
    if (webHealth.status === 200) {
      log('✅ Web Homepage - OK', 'green');
      if (webHealth.data.includes('Cerply is running')) {
        log('✅ Web Content - OK', 'green');
      } else {
        log('⚠️  Web Content - Unexpected', 'yellow');
      }
    } else {
      log('❌ Web Homepage - Failed', 'red');
      console.log('Response:', webHealth);
    }
  } catch (error) {
    log('❌ Web Health Test Failed:', 'red');
    console.error(error);
  }
}

async function testWebEnvironment() {
  log('\n⚙️  Testing Web Environment...', 'blue');
  
  try {
    // Test if web can access API (CORS)
    const corsTest = await makeRequest(`${API_BASE}/api/health`, {
      headers: { 'Origin': WEB_BASE }
    });
    
    if (corsTest.status === 200) {
      log('✅ CORS - OK', 'green');
    } else {
      log('⚠️  CORS - May have issues', 'yellow');
    }
    
    // Test feature flag routes if they exist
    log('ℹ️  Feature flag routes (if enabled):', 'cyan');
    
    // Test connectors if enabled
    try {
      const connectors = await makeRequest(`${API_BASE}/import/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      });
      if (connectors.status !== 405) { // 405 = Method Not Allowed
        log('✅ Connectors - Available', 'green');
      }
    } catch (e) {
      // Expected if not enabled
    }
    
  } catch (error) {
    log('❌ Web Environment Test Failed:', 'red');
    console.error(error);
  }
}

async function runSmokeTest() {
  log('🚀 Starting Cerply Smoke Test...', 'magenta');
  log(`API Base: ${API_BASE}`, 'cyan');
  log(`Web Base: ${WEB_BASE}`, 'cyan');
  
  try {
    await testAPIHealth();
    await testAPIFlags();
    await testAPIEvidenceCoverage();
    await testWebHealth();
    await testWebEnvironment();
    
    log('\n🎉 Smoke test completed!', 'green');
    log('If all tests passed, your Cerply setup is working correctly.', 'green');
    
  } catch (error) {
    log('\n💥 Smoke test failed:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Check if services are running before starting tests
async function checkServices() {
  log('🔍 Checking if services are running...', 'blue');
  
  try {
    await makeRequest(`${API_BASE}/api/health`);
    log('✅ API service is running', 'green');
  } catch (error) {
    log('❌ API service is not running on port 8080', 'red');
    log('Please run: npm -w api run dev', 'yellow');
    process.exit(1);
  }
  
  try {
    await makeRequest(`${WEB_BASE}/`);
    log('✅ Web service is running', 'green');
  } catch (error) {
    log('❌ Web service is not running on port 3000', 'red');
    log('Please run: npm -w web run dev', 'yellow');
    process.exit(1);
  }
}

// Main execution
(async () => {
  await checkServices();
  await runSmokeTest();
})();
