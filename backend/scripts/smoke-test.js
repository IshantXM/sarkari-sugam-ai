import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

let totalPassed = 0;
let totalFailed = 0;

function logResult(name, passed, details = '') {
  if (passed) {
    totalPassed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name} ${details}`);
  } else {
    totalFailed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name} ${details}`);
  }
}

async function runSmokeTests() {
  console.log(`\n=======================================================`);
  console.log(`🧪 Running Sarkari Sugam AI Smoke Tests against ${BASE_URL}`);
  console.log(`=======================================================\n`);

  const client = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true, // Don't throw on 4xx/5xx to inspect status
    timeout: 10000,
  });

  console.log('--- POSITIVE TEST CASES (Valid Inputs) ---');

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

  // Test 2: POST /api/tenders/search (Discovery)
  try {
    const res = await client.post('/api/tenders/search', {
      query: 'cloud infrastructure tender',
      limit: 5,
    });
    const valid =
      res.status === 200 &&
      res.data?.status === 'success' &&
      Array.isArray(res.data?.results) &&
      res.data.count === 2; // Test case check: query "cloud infrastructure tender" returns 2 results in demo mode
    logResult(
      'POST /api/tenders/search',
      valid,
      `(Status: ${res.status}, Count: ${res.data?.count}, Source: ${res.data?.source})`
    );
  } catch (err) {
    logResult('POST /api/tenders/search', false, `(Error: ${err.message})`);
  }

  // Test 3: POST /api/tenders/fetch (WOW 1: Context Shrink)
  try {
    const res = await client.post('/api/tenders/fetch', {
      url: 'https://stateprocure.gov/tenders/cloud-infra-2026',
    });
    const valid =
      res.status === 200 &&
      res.data?.status === 'success' &&
      res.data?.data?.tender_id === 'STATE-IT-2026-0417' &&
      res.data?.telemetry?.compression_ratio === '96.6%' &&
      Boolean(res.data?.markdown_preview);
    logResult(
      'POST /api/tenders/fetch',
      valid,
      `(Status: ${res.status}, Ratio: ${res.data?.telemetry?.compression_ratio}, ID: ${res.data?.data?.tender_id})`
    );
  } catch (err) {
    logResult('POST /api/tenders/fetch', false, `(Error: ${err.message})`);
  }

  // Test 4: POST /api/tenders/agent (WOW 2: Gated Portal Navigation)
  try {
    const res = await client.post('/api/tenders/agent', {
      url: 'https://cityhub.gov/eprocure/login',
      task: 'Extract active cloud infrastructure tenders',
    });
    const valid =
      res.status === 200 &&
      res.data?.status === 'success' &&
      Array.isArray(res.data?.execution_steps) &&
      res.data.execution_steps.length >= 3 &&
      Array.isArray(res.data?.extracted_tenders) &&
      res.data.extracted_tenders.length > 0;
    logResult(
      'POST /api/tenders/agent',
      valid,
      `(Status: ${res.status}, Steps: ${res.data?.execution_steps?.length}, Tenders: ${res.data?.extracted_tenders?.length})`
    );
  } catch (err) {
    logResult('POST /api/tenders/agent', false, `(Error: ${err.message})`);
  }

  // Test 5: POST /api/tenders/diff (WOW 3: Corrigendum / Mutation Alert)
  try {
    const res = await client.post('/api/tenders/diff', {
      tender_id: 'STATE-IT-2026-0417',
    });
    const valid =
      res.status === 200 &&
      res.data?.status === 'success' &&
      res.data?.mutation_detected === true &&
      Array.isArray(res.data?.changes) &&
      res.data.changes.length > 0 &&
      Boolean(res.data?.alert);
    logResult(
      'POST /api/tenders/diff',
      valid,
      `(Status: ${res.status}, Mutations: ${res.data?.changes?.length}, Alert Mode: ${res.data?.alert?.mode})`
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

  console.log(`\n=======================================================`);
  console.log(`📊 Smoke Test Summary: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log(`=======================================================\n`);

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests();
