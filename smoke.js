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
      console.log('Coverage summary:', coverage.data.summary || '(none)');
      console.log('Gaps (count):', Array.isArray(coverage.data.gaps) ? coverage.data.gaps.length : 0);
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

async function testIngestClarify() {
  log('\n🧭 Testing Ingest Clarify...', 'blue');
  try {
    const resp = await makeRequest(`${API_BASE}/api/ingest/clarify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'GCSE Maths' })
    });
    if (resp.status === 200 && resp.data.question) {
      log('✅ /api/ingest/clarify - OK', 'green');
    } else {
      log('❌ /api/ingest/clarify - Failed', 'red');
      console.log('Response:', resp);
    }
  } catch (error) {
    log('❌ Ingest Clarify Test Failed:', 'red');
    console.error(error);
  }
}

async function testIngestPreview() {
  log('\n📝 Testing Ingest Preview...', 'blue');
  try {
    const resp = await makeRequest(`${API_BASE}/api/ingest/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Astrophysics for beginners, focus on cosmology, 45 mins' })
    });
    const hasModules = resp.status === 200 && ((resp.data.ok && Array.isArray(resp.data.modules)) || Array.isArray(resp.data.modules));
    if (hasModules) {
      log('✅ /api/ingest/preview - OK', 'green');
      console.log('Modules:', (resp.data.modules || []).length);
    } else {
      log('❌ /api/ingest/preview - Failed', 'red');
      console.log('Response:', resp);
    }
  } catch (error) {
    log('❌ Ingest Preview Test Failed:', 'red');
    console.error(error);
  }
}

async function testIngestGenerate() {
  log('\n⚙️  Testing Ingest Generate...', 'blue');
  try {
    const modules = [
      { id: 'mod-01', title: 'Foundations', estMinutes: 10 },
      { id: 'mod-02', title: 'Core Concepts', estMinutes: 10 }
    ];
    const resp = await makeRequest(`${API_BASE}/api/ingest/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules })
    });
    // Accept 200 (OK) or 401 (auth-gated) as pass
    if (resp.status === 200 || resp.status === 401) {
      log(`✅ /api/ingest/generate - ${resp.status === 200 ? 'OK' : 'Auth required (expected if gated)'}`, 'green');
    } else {
      log('❌ /api/ingest/generate - Failed', 'red');
      console.log('Response:', resp);
    }
  } catch (error) {
    log('❌ Ingest Generate Test Failed:', 'red');
    console.error(error);
  }
}

async function testAuthStub() {
  log('\n🔐 Testing Auth Stub...', 'blue');
  try {
    const resp = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@example.com' })
    });
    if (resp.status === 200 && resp.data.ok && typeof resp.data.next === 'string') {
      log('✅ /api/auth/login - OK', 'green');
      console.log('Next callback path:', resp.data.next);
    } else {
      log('❌ /api/auth/login - Failed', 'red');
      console.log('Response:', resp);
    }
  } catch (error) {
    log('❌ Auth Stub Test Failed:', 'red');
    console.error(error);
  }
}

async function testAuthFlow() {
  log('\n🔐 Testing Auth Flow (callback + me)...', 'blue');
  try {
    const login = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@example.com' })
    });
    if (!(login.status === 200 && login.data && login.data.next)) {
      log('❌ /api/auth/login - Unexpected response', 'red');
      console.log('Response:', login);
      return;
    }
    const nextPath = login.data.next;
    const cbUrl = `${API_BASE}${nextPath}`;
    const cb = await makeRequest(cbUrl, { method: 'GET' });
    const setCookie = cb.headers && cb.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookieKv = cookieHeader ? cookieHeader.split(';')[0] : '';
    if (cb.status === 302 && cookieKv) {
      const me = await makeRequest(`${API_BASE}/api/auth/me`, {
        headers: { 'Cookie': cookieKv }
      });
      if (me.status === 200 && me.data && me.data.ok) {
        log('✅ Auth flow (/login -> /callback -> /me) - OK', 'green');
      } else {
        log('❌ /api/auth/me - Failed', 'red');
        console.log('Response:', me);
      }
    } else {
      log('❌ Auth callback did not return cookie/redirect', 'red');
      console.log('Response:', cb);
    }
  } catch (error) {
    log('❌ Auth Flow Test Failed:', 'red');
    console.error(error);
  }
}

async function testConnectorsAndTeams() {
  log('\n🧩 Testing Connectors & Teams (flagged)...', 'blue');
  // /import/url (ff_connectors_basic_v1)
  try {
    const connectors = await makeRequest(`${API_BASE}/import/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    });
    if (connectors.status === 200 || connectors.status === 501) {
      log(`✅ /import/url - ${connectors.status === 200 ? 'Available' : 'Disabled (expected)'}`, 'green');
    } else {
      log('❌ /import/url - Unexpected status', 'red');
      console.log('Response:', connectors);
    }
  } catch (e) {
    log('⚠️  /import/url - Error (likely disabled)', 'yellow');
  }
  // /groups (ff_group_challenges_v1)
  try {
    const groups = await makeRequest(`${API_BASE}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'demo-group' })
    });
    if (groups.status === 200 || groups.status === 501) {
      log(`✅ /groups - ${groups.status === 200 ? 'Available' : 'Disabled (expected)'}`, 'green');
    } else {
      log('❌ /groups - Unexpected status', 'red');
      console.log('Response:', groups);
    }
  } catch (e) {
    log('⚠️  /groups - Error (likely disabled)', 'yellow');
  }
}

async function testResearch() {
  log('\n🔎 Testing Research Endpoints (flagged)...', 'blue');
  // /api/research/fetch
  try {
    const fetchResp = await makeRequest(`${API_BASE}/api/research/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    });
    if ([200, 404, 501].includes(fetchResp.status)) {
      log(`✅ /api/research/fetch - ${fetchResp.status === 200 ? 'Available' : 'Disabled (expected)'}`, 'green');
    } else {
      log('❌ /api/research/fetch - Unexpected status', 'red');
      console.log('Response:', fetchResp);
    }
  } catch (e) {
    log('⚠️  /api/research/fetch - Error (likely disabled)', 'yellow');
  }
  // /api/research/search
  try {
    const searchResp = await makeRequest(`${API_BASE}/api/research/search?q=test`);
    if ([200, 404, 501].includes(searchResp.status)) {
      log(`✅ /api/research/search - ${searchResp.status === 200 ? 'Available' : 'Disabled (expected)'}`, 'green');
    } else {
      log('❌ /api/research/search - Unexpected status', 'red');
      console.log('Response:', searchResp);
    }
  } catch (e) {
    log('⚠️  /api/research/search - Error (likely disabled)', 'yellow');
  }
}

async function testMaterials() {
  log('\n📚 Testing Materials KB (flagged)...', 'blue');
  // lookup
  try {
    const lookup = await makeRequest(`${API_BASE}/api/materials/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'KS3 Maths' })
    });
    if ([200, 404, 501].includes(lookup.status)) {
      log(`✅ /api/materials/lookup - ${lookup.status === 200 ? 'Available' : 'Disabled (expected)'}`, 'green');
    } else {
      log('❌ /api/materials/lookup - Unexpected status', 'red');
      console.log('Response:', lookup);
    }
  } catch (e) {
    log('⚠️  /api/materials/lookup - Error (likely disabled)', 'yellow');
  }
  // save
  try {
    const save = await makeRequest(`${API_BASE}/api/materials/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'KS3 Maths', modules: [{ id: 'mod-01', title: 'Foundations' }] })
    });
    if ([200, 404, 501].includes(save.status)) {
      log(`✅ /api/materials/save - ${save.status === 200 ? 'Available' : 'Disabled (expected)'}`, 'green');
    } else {
      log('❌ /api/materials/save - Unexpected status', 'red');
      console.log('Response:', save);
    }
  } catch (e) {
    log('⚠️  /api/materials/save - Error (likely disabled)', 'yellow');
  }
  // certify (may be auth/paywall gated)
  try {
    const certify = await makeRequest(`${API_BASE}/api/materials/certify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'KS3 Maths' })
    });
    if ([200, 401, 402, 404, 501].includes(certify.status)) {
      log(`✅ /api/materials/certify - ${certify.status === 200 ? 'Available' : 'Gated/Disabled (expected)'}`, 'green');
    } else {
      log('❌ /api/materials/certify - Unexpected status', 'red');
      console.log('Response:', certify);
    }
  } catch (e) {
    log('⚠️  /api/materials/certify - Error (likely disabled)', 'yellow');
  }
}

async function testWebProxyPreview() {
  log('\n🌐 Testing Web Proxy Preview...', 'blue');
  try {
    const resp = await makeRequest(`${WEB_BASE}/api/ingest/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Biology intro 30 mins' })
    });
    const ok = resp.status === 200 && (Array.isArray(resp.data.modules) || resp.data.ok === true);
    if (ok) {
      log('✅ Web /api/ingest/preview - OK', 'green');
    } else {
      log('❌ Web /api/ingest/preview - Failed', 'red');
      console.log('Response:', resp);
    }
  } catch (error) {
    log('❌ Web Proxy Preview Test Failed:', 'red');
    console.error(error);
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
    await testIngestClarify();
    await testIngestPreview();
    await testIngestGenerate();
    await testAuthStub();
    await testAuthFlow();
    await testResearch();
    await testMaterials();
    await testConnectorsAndTeams();
    await testWebHealth();
    await testWebEnvironment();
    await testWebProxyPreview();
    
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
