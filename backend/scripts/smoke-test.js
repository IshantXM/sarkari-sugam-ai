import axios from 'axios';
import http from 'http';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5005;
const BASE_URL = `http://localhost:${PORT}`;

let totalPassed = 0;
let totalFailed = 0;
let serverProcess = null;

function logResult(name, passed, details = '') {
  if (passed) {
    totalPassed++;
    console.log(`  \x1b[32m[PASS]\x1b[0m: ${name} ${details}`);
  } else {
    totalFailed++;
    console.error(`  \x1b[31m[FAIL]\x1b[0m: ${name} ${details}`);
  }
}

function isServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function cleanup() {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {
      // ignore
    }
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(1);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(1);
});

async function runSmokeTests() {
  console.log(`\n=======================================================`);
  console.log(`Running Sarkari Sugam AI Smoke Tests against ${BASE_URL}`);
  console.log(`=======================================================\n`);

  // Ensure server is up (start temporary instance if not running)
  const isUp = await isServerRunning(PORT);
  if (!isUp) {
    console.log(`[INFO] Backend is not running on port ${PORT}. Starting server instance automatically...`);
    serverProcess = spawn(process.execPath, ['server.js'], {
      cwd: process.cwd(),
      stdio: 'ignore',
    });

    let ready = false;
    for (let i = 0; i < 35; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (await isServerRunning(PORT)) {
        ready = true;
        break;
      }
    }

    if (!ready) {
      console.error(
        `\x1b[31m[ERROR]\x1b[0m Could not connect to backend at http://localhost:${PORT}.\n` +
          `Please start the backend server in another terminal using:\n` +
          `  npm run dev   (or npm start)\n`
      );
      cleanup();
      process.exit(1);
    }
    console.log(`[INFO] Server ready on port ${PORT}. Proceeding with tests...\n`);
  }

  const client = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true, // Don't throw on 4xx/5xx to inspect status
    timeout: 45000,
  });

  console.log('--- AUTHENTICATION & JWT INTEGRITY TESTS ---');

  // Test Auth 1: Unauthenticated request to protected endpoint must return 401
  try {
    const unauthRes = await client.get('/api/tenders/saved');
    const valid = unauthRes.status === 401 && unauthRes.data?.error === 'unauthorized';
    logResult('Security 401: Unauthenticated access blocked on /api/tenders/saved', valid, `(Status: ${unauthRes.status})`);
  } catch (err) {
    logResult('Security 401: Unauthenticated access blocked on /api/tenders/saved', false, `(Error: ${err.message})`);
  }

  // Test Auth 2: Authenticate and obtain JWT (using dynamically registered user)
  let authToken = null;
  const smokeEmail = `smoke_${Date.now()}@test-sugam.in`;
  const smokePass = 'sugamPass123!';
  try {
    await client.post('/api/auth/register', {
      name: 'Smoke Test User',
      email: smokeEmail,
      password: smokePass,
    });

    const loginRes = await client.post('/api/auth/login', {
      email: smokeEmail,
      password: smokePass,
    });
    const valid = loginRes.status === 200 && Boolean(loginRes.data?.token);
    authToken = loginRes.data?.token;
    client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    logResult('POST /api/auth/login', valid, `(Status: ${loginRes.status}, User: ${loginRes.data?.user?.email})`);
  } catch (err) {
    logResult('POST /api/auth/login', false, `(Error: ${err.message})`);
  }

  console.log('\n--- POSITIVE TEST CASES (Valid Inputs with JWT) ---');

  // Test 1: GET /api/health
  try {
    const res = await client.get('/api/health');
    const valid =
      res.status === 200 &&
      res.data?.ok === true &&
      typeof res.data?.demo_mode === 'boolean' &&
      typeof res.data?.uptime_seconds === 'number';
    logResult('GET /api/health', valid, `(Status: ${res.status}, demo_mode: ${res.data?.demo_mode})`);
  } catch (err) {
    logResult('GET /api/health', false, `(Network Error: ${err.message})`);
  }

  // Test 2: POST /api/tenders/search (Discovery via live TinyFish Search)
  try {
    const res = await client.post('/api/tenders/search', {
      query: 'cloud infrastructure tender',
      limit: 3,
    });
    const valid =
      res.status === 200 &&
      res.data?.status === 'success' &&
      Array.isArray(res.data?.results) &&
      res.data.results.length > 0;
    logResult(
      'POST /api/tenders/search',
      valid,
      `(Status: ${res.status}, Count: ${res.data?.count}, Source: ${res.data?.source})`
    );
  } catch (err) {
    logResult('POST /api/tenders/search', false, `(Error: ${err.message})`);
  }

  // Test 3: POST /api/tenders/fetch (Clean Markdown via live TinyFish Fetch)
  try {
    const res = await client.post('/api/tenders/fetch', {
      url: 'https://example.com',
    });
    const valid =
      res.status === 200 &&
      res.data?.status === 'success' &&
      Boolean(res.data?.markdown_preview);
    logResult(
      'POST /api/tenders/fetch',
      valid,
      `(Status: ${res.status}, Source: ${res.data?.source})`
    );
  } catch (err) {
    logResult('POST /api/tenders/fetch', false, `(Error: ${err.message})`);
  }

  // Test 4: POST /api/tenders/agent (Live TinyFish Web Agent)
  try {
    const res = await client.post('/api/tenders/agent', {
      url: 'https://example.com',
      task: 'Extract the page title and description',
    });
    const valid =
      res.status === 200 &&
      res.data?.status === 'success' &&
      Array.isArray(res.data?.execution_steps) &&
      res.data.execution_steps.length > 0;
    logResult(
      'POST /api/tenders/agent',
      valid,
      `(Status: ${res.status}, Steps: ${res.data?.execution_steps?.length}, Duration: ${res.data?.duration_ms}ms)`
    );
  } catch (err) {
    logResult('POST /api/tenders/agent', false, `(Error: ${err.message})`);
  }

  // Test 5: POST /api/tenders/diff (Live diff against target URL)
  try {
    const res = await client.post('/api/tenders/diff', {
      tender_id: 'TENDER-LIVE-01',
      url: 'https://example.com',
      current: { budget_usd: 50000 },
    });
    const valid =
      res.status === 200 &&
      res.data?.status === 'success' &&
      typeof res.data?.mutation_detected === 'boolean';
    logResult(
      'POST /api/tenders/diff',
      valid,
      `(Status: ${res.status}, Mutation: ${res.data?.mutation_detected})`
    );
  } catch (err) {
    logResult('POST /api/tenders/diff', false, `(Error: ${err.message})`);
  }

  console.log('\n--- NEGATIVE TEST CASES (Input Validation 400s) ---');

  // Negative 1: Search query too short
  try {
    const res = await client.post('/api/tenders/search', { query: 'hi' });
    const valid = res.status === 400 && res.data?.error === 'validation_failed';
    logResult('Validation 400: Search query too short', valid, `(Status: ${res.status}, Error: ${res.data?.error})`);
  } catch (err) {
    logResult('Validation 400: Search query too short', false, `(Error: ${err.message})`);
  }

  // Negative 2: Fetch invalid URL scheme
  try {
    const res = await client.post('/api/tenders/fetch', { url: 'javascript:alert(1)' });
    const valid = res.status === 400 && res.data?.error === 'validation_failed';
    logResult('Validation 400: Fetch rejected javascript: scheme', valid, `(Status: ${res.status}, Error: ${res.data?.error})`);
  } catch (err) {
    logResult('Validation 400: Fetch rejected javascript: scheme', false, `(Error: ${err.message})`);
  }

  // Negative 3: Agent invalid URL format
  try {
    const res = await client.post('/api/tenders/agent', { url: 'not-a-valid-url' });
    const valid = res.status === 400 && res.data?.error === 'validation_failed';
    logResult('Validation 400: Agent invalid URL format', valid, `(Status: ${res.status}, Error: ${res.data?.error})`);
  } catch (err) {
    logResult('Validation 400: Agent invalid URL format', false, `(Error: ${err.message})`);
  }

  // Negative 4: Diff empty tender_id
  try {
    const res = await client.post('/api/tenders/diff', { tender_id: '' });
    const valid = res.status === 400 && res.data?.error === 'validation_failed';
    logResult('Validation 400: Diff empty tender_id', valid, `(Status: ${res.status}, Error: ${res.data?.error})`);
  } catch (err) {
    logResult('Validation 400: Diff empty tender_id', false, `(Error: ${err.message})`);
  }

  // Route 404 test
  try {
    const res = await client.get('/api/undefined-endpoint');
    const valid = res.status === 404 && res.data?.error === 'route_not_found';
    logResult('Route 404: Unmatched endpoint handler', valid, `(Status: ${res.status}, Error: ${res.data?.error})`);
  } catch (err) {
    logResult('Route 404: Unmatched endpoint handler', false, `(Error: ${err.message})`);
  }

  console.log('\n--- TOKEN REVOCATION & PROPER DELETION TESTS ---');

  // Test Logout & Token Invalidation
  try {
    const logoutRes = await client.post('/api/auth/logout');
    const valid = logoutRes.status === 200 && logoutRes.data?.status === 'success';
    logResult('POST /api/auth/logout (Session Revoked)', valid, `(Status: ${logoutRes.status})`);

    // Verify revoked token is now rejected with 401
    const postLogoutRes = await client.get('/api/tenders/saved');
    const tokenBlocked = postLogoutRes.status === 401 && postLogoutRes.data?.error === 'token_revoked';
    logResult('Security 401: Revoked token rejected on /api/tenders/saved', tokenBlocked, `(Status: ${postLogoutRes.status}, Error: ${postLogoutRes.data?.error})`);
  } catch (err) {
    logResult('POST /api/auth/logout & Revocation Check', false, `(Error: ${err.message})`);
  }

  console.log(`\n=======================================================`);
  console.log(`Smoke Test Summary: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log(`=======================================================\n`);

  cleanup();

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests();
