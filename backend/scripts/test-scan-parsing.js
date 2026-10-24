import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function testScannedCircular() {
  try {
    const imagePath = 'C:\\Users\\Ishant Mohan\\.gemini\\antigravity-ide\\brain\\f358ff07-2225-4edf-abfc-f555ea63c8f9\\gov_scheme_notice_scan_1792865744871.jpg';
    console.log(`Reading scanned circular image from: ${imagePath}`);
    const imageBytes = fs.readFileSync(imagePath);
    const base64Data = imageBytes.toString('base64');
    console.log(`Image size: ${Math.round(imageBytes.length / 1024)} KB. Base64 length: ${base64Data.length}`);

    console.log('\nSending scanned circular to /api/tenders/parse-image...');
    const start = Date.now();
    const res = await axios.post('http://localhost:5005/api/tenders/parse-image', {
      base64Data,
      mimeType: 'image/jpeg',
      save_to_database: true,
    }, {
      timeout: 30000,
    });

    console.log(`\nVision Parsing succeeded in ${Date.now() - start}ms! Status: ${res.status}`);
    console.log('\n===== EXTRACTED SCHEME INTELLIGENCE =====');
    console.log(JSON.stringify(res.data.data, null, 2));
    console.log(`\nSaved to database: ${res.data.saved_to_db}`);
  } catch (err) {
    console.error('Test error:', err.response?.data || err.message);
  }
}

testScannedCircular();
