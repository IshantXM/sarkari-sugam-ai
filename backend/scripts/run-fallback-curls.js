import { execSync } from 'child_process';
import fs from 'fs';

const tests = [
  {
    name: '1. GET /api/health (Live Mode Inspection)',
    cmd: 'curl.exe -s http://localhost:5005/api/health',
  },
  {
    name: '2. POST /api/tenders/search (Fallback on Live Network/Key Failure)',
    cmd: 'curl.exe -s -X POST http://localhost:5005/api/tenders/search -H "Content-Type: application/json" -d "{\\"query\\": \\"cloud infrastructure tender\\", \\"limit\\": 5}"',
  },
  {
    name: '3. POST /api/tenders/fetch (Fallback on Live Fetch Failure)',
    cmd: 'curl.exe -s -X POST http://localhost:5005/api/tenders/fetch -H "Content-Type: application/json" -d "{\\"url\\": \\"https://stateprocure.gov/tenders/cloud-infra-2026\\"}"',
  },
  {
    name: '4. POST /api/tenders/agent (Fallback on Live Agent Gateway Failure)',
    cmd: 'curl.exe -s -X POST http://localhost:5005/api/tenders/agent -H "Content-Type: application/json" -d "{\\"url\\": \\"https://cityhub.gov/eprocure/login\\", \\"task\\": \\"Extract active cloud tenders\\"}"',
  },
  {
    name: '5. POST /api/tenders/diff (Fallback on Live Re-fetch Failure)',
    cmd: 'curl.exe -s -X POST http://localhost:5005/api/tenders/diff -H "Content-Type: application/json" -d "{\\"tender_id\\": \\"STATE-IT-2026-0417\\", \\"url\\": \\"https://stateprocure.gov/tenders/cloud-infra-2026\\"}"',
  },
];

let doc = '# Sarkari Sugam AI — Fallback Path Verification (Fake TinyFish API Key)\n\n';
doc += `**Test Timestamp:** ${new Date().toISOString()}\n`;
doc += `**Environment:** DEMO_MODE=false, TINYFISH_API_KEY=sk-tinyfish-fake-live-key-99999\n`;
doc += `**Objective:** Confirm all 5 endpoints return HTTP 200, source="fallback_demo", and valid fallback_reason without leaking secrets or crashing.\n\n---\n\n`;

for (const t of tests) {
  doc += `### ${t.name}\n\n`;
  doc += `**Command:**\n\`\`\`bash\n${t.cmd}\n\`\`\`\n\n`;
  doc += `**Response Output:**\n\`\`\`json\n`;
  try {
    const res = execSync(t.cmd, { encoding: 'utf-8', timeout: 35000 });
    try {
      doc += JSON.stringify(JSON.parse(res), null, 2) + '\n';
    } catch {
      doc += res + '\n';
    }
  } catch (err) {
    doc += `ERROR: ${err.message}\n`;
  }
  doc += `\`\`\`\n\n---\n\n`;
}

fs.writeFileSync('scripts/curl-fallback-results.md', doc, 'utf-8');
console.log('Saved fallback test results to scripts/curl-fallback-results.md');
