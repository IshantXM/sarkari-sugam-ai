import { execSync } from 'child_process';
import fs from 'fs';

const tests = [
  {
    name: '1. GET /api/health',
    cmd: 'curl.exe -s http://localhost:5000/api/health',
  },
  {
    name: '2. POST /api/tenders/search',
    cmd: 'curl.exe -s -X POST http://localhost:5000/api/tenders/search -H "Content-Type: application/json" -d "{\\"query\\": \\"cloud infrastructure tender\\", \\"limit\\": 5}"',
  },
  {
    name: '3. POST /api/tenders/fetch (WOW 1: Context Shrink)',
    cmd: 'curl.exe -s -X POST http://localhost:5000/api/tenders/fetch -H "Content-Type: application/json" -d "{\\"url\\": \\"https://stateprocure.gov/tenders/cloud-infra-2026\\"}"',
  },
  {
    name: '4. POST /api/tenders/agent (WOW 2: Gated Portal Navigation)',
    cmd: 'curl.exe -s -X POST http://localhost:5000/api/tenders/agent -H "Content-Type: application/json" -d "{\\"url\\": \\"https://cityhub.gov/eprocure/login\\", \\"task\\": \\"Extract active cloud tenders\\"}"',
  },
  {
    name: '5. POST /api/tenders/diff (WOW 3: Corrigendum / Mutation Alert)',
    cmd: 'curl.exe -s -X POST http://localhost:5000/api/tenders/diff -H "Content-Type: application/json" -d "{\\"tender_id\\": \\"STATE-IT-2026-0417\\"}"',
  },
];

let doc = '# Sarkari Sugam AI — Demo Mode Endpoint cURL Verification\n\n';
doc += `**Test Timestamp:** ${new Date().toISOString()}\n`;
doc += `**Environment:** DEMO_MODE=true\n\n---\n\n`;

for (const t of tests) {
  doc += `### ${t.name}\n\n`;
  doc += `**Command:**\n\`\`\`bash\n${t.cmd}\n\`\`\`\n\n`;
  doc += `**Response Output:**\n\`\`\`json\n`;
  try {
    const res = execSync(t.cmd, { encoding: 'utf-8' });
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

fs.writeFileSync('scripts/curl-demo-results.md', doc, 'utf-8');
console.log('Saved demo results to scripts/curl-demo-results.md');
