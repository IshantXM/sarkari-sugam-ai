import { z } from 'zod';

export const extractedTenderSchema = z.object({
  tender_id: z.string().nullable(),
  title: z.string().nullable().optional(),
  issuing_agency: z.string().nullable(),
  budget_usd: z.number().nullable(),
  submission_deadline: z.string().nullable(),
  eligibility: z.string().nullable(),
  source_url: z.string().url().nullable().or(z.literal('')),
  extraction_confidence: z.number().min(0).max(1),
});

/**
 * Extracts structured tender information from unstructured markdown/HTML text using heuristics
 * @param {string} markdown
 * @param {string} sourceUrl
 * @returns {object} validated tender object
 */
export function extractTenderFromMarkdown(markdown = '', sourceUrl = null) {
  if (!markdown || typeof markdown !== 'string') {
    return {
      tender_id: null,
      issuing_agency: null,
      budget_usd: null,
      submission_deadline: null,
      eligibility: null,
      source_url: sourceUrl || null,
      extraction_confidence: 0,
    };
  }

  // 1. Extract Tender ID / Reference
  let tenderId = null;
  const idRegexes = [
    /(?:Tender\s*(?:No|Number|ID|Notice|Ref|Reference)|NIT\s*No|Reference\s*No|Ref)\s*[:\*\-]*\s*([A-Za-z0-9_\-\/]+)/i,
    /\b([A-Z]{2,8}-[A-Z0-9]{2,8}-\d{4}-\d{3,6})\b/i,
    /\b([A-Z]{3,}-[A-Z0-9_\-]{4,})\b/,
  ];
  for (const regex of idRegexes) {
    const match = markdown.match(regex);
    if (match && match[1]) {
      tenderId = match[1].trim();
      break;
    }
  }

  // 2. Extract Issuing Agency
  let issuingAgency = null;
  const agencyRegexes = [
    /(?:Issuing\s*Agency(?:\s*[\/&]\s*Department)?|Department|Ministry|Authority|Procuring\s*Entity|Organisation|Organization)\s*[:\*\-]*\s*([^\n\r\*#]+)/i,
  ];
  for (const regex of agencyRegexes) {
    const match = markdown.match(regex);
    if (match && match[1]) {
      const clean = match[1].replace(/^[*\s:]+/, '').trim();
      if (clean.length > 2 && clean.length < 120) {
        issuingAgency = clean;
        break;
      }
    }
  }

  // 3. Extract Budget USD (number)
  let budgetUsd = null;
  const budgetRegexes = [
    /(?:Estimated\s*Cost|Budget|Estimated\s*Value|Tender\s*Value|Contract\s*Value)\s*[:\*\-]*\s*([^\n\r]+)/i,
    /\$(\d[\d,]+(?:\.\d+)?)/,
  ];
  for (const regex of budgetRegexes) {
    const match = markdown.match(regex);
    if (match && match[1]) {
      const budgetText = match[1];
      // Check for dollar amount
      const dollarMatch = budgetText.match(/\$?([\d,]+(?:\.\d+)?)/);
      if (dollarMatch && dollarMatch[1]) {
        const parsed = parseFloat(dollarMatch[1].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          budgetUsd = parsed;
          break;
        }
      }
    }
  }

  // 4. Extract Submission Deadline
  let submissionDeadline = null;
  const deadlineRegexes = [
    /(?:Closing\s*Date|Last\s*Date(?:\s*of\s*Submission)?|Submission\s*Deadline|Bid\s*Submission\s*End|Due\s*Date)\s*[:\*\-]*\s*([^\n\r\*#]+)/i,
  ];
  for (const regex of deadlineRegexes) {
    const match = markdown.match(regex);
    if (match && match[1]) {
      const clean = match[1].replace(/^[*\s:]+/, '').trim();
      if (clean.length > 4 && clean.length < 80) {
        submissionDeadline = clean;
        break;
      }
    }
  }

  // 5. Extract Eligibility
  let eligibility = null;
  const eligibilityRegexes = [
    /(?:Minimum\s*Eligibility(?:\s*Criteria)?|Eligibility\s*(?:Criteria)?|Qualifications?)\s*[:\*\-]*\s*([^\n\r\*#]+)/i,
    /##\s*(?:Minimum\s*)?Eligibility[^\n]*\n+([^\n#]+)/i,
  ];
  for (const regex of eligibilityRegexes) {
    const match = markdown.match(regex);
    if (match && match[1]) {
      const clean = match[1].replace(/^[\d\.\-\*\s:]+/, '').trim();
      if (clean.length > 5 && clean.length < 300) {
        eligibility = clean;
        break;
      }
    }
  }

  // Calculate extraction confidence based on 5 core fields
  const coreFields = [tenderId, issuingAgency, budgetUsd, submissionDeadline, eligibility];
  const foundCount = coreFields.filter((f) => f !== null && f !== undefined).length;
  const extractionConfidence = Number((foundCount / coreFields.length).toFixed(2));

  const candidate = {
    tender_id: tenderId,
    issuing_agency: issuingAgency,
    budget_usd: budgetUsd,
    submission_deadline: submissionDeadline,
    eligibility: eligibility,
    source_url: sourceUrl || null,
    extraction_confidence: extractionConfidence,
  };

  // Validate using Zod schema
  return extractedTenderSchema.parse(candidate);
}

/**
 * Detects and extracts scanned image / circular links (JPG, PNG, WebP) from Markdown or HTML content
 * @param {string} content - Markdown or HTML string from TinyFish scrape
 * @param {string} baseUrl - Base URL to resolve relative image paths
 * @returns {string[]} Array of candidate circular image URLs sorted by relevance
 */
export function extractCircularImages(content = '', baseUrl = '') {
  if (!content || typeof content !== 'string') return [];

  const foundUrls = new Set();
  const scored = [];

  // 1. Markdown image syntax: ![alt](url)
  const mdImgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+|\/[^\s\)]+)\)/gi;
  let match;
  while ((match = mdImgRegex.exec(content)) !== null) {
    const alt = match[1] || '';
    const rawUrl = match[2];
    const resolved = resolveUrl(rawUrl, baseUrl);
    if (resolved && !foundUrls.has(resolved)) {
      foundUrls.add(resolved);
      scored.push({ url: resolved, score: scoreImageUrl(resolved, alt) });
    }
  }

  // 2. Markdown links pointing to image files: [title](url.jpg)
  const mdLinkRegex = /\[([^\]]*)\]\((https?:\/\/[^\s\)]+\.(?:jpe?g|png|webp|tif|tiff)|\/[^\s\)]+\.(?:jpe?g|png|webp|tif|tiff))\)/gi;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    const text = match[1] || '';
    const rawUrl = match[2];
    const resolved = resolveUrl(rawUrl, baseUrl);
    if (resolved && !foundUrls.has(resolved)) {
      foundUrls.add(resolved);
      scored.push({ url: resolved, score: scoreImageUrl(resolved, text) + 2 });
    }
  }

  // 3. HTML img tags: <img src="..." alt="...">
  const htmlImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlImgRegex.exec(content)) !== null) {
    const rawTag = match[0];
    const rawUrl = match[1];
    const altMatch = rawTag.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : '';
    const resolved = resolveUrl(rawUrl, baseUrl);
    if (resolved && !foundUrls.has(resolved)) {
      foundUrls.add(resolved);
      scored.push({ url: resolved, score: scoreImageUrl(resolved, alt) });
    }
  }

  // Sort descending by score, filter out negative scores (e.g. logos)
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.url);
}

function resolveUrl(url, baseUrl) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!baseUrl) return null;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
}

function scoreImageUrl(url = '', text = '') {
  let score = 1;
  const combined = `${url} ${text}`.toLowerCase();

  // Government scheme / circular keywords
  if (/circular|notice|scheme|yojana|tender|nit|corrigendum|amendment|annexure|advertisement|advt|scan/.test(combined)) {
    score += 5;
  }
  // Image extensions
  if (/\.(?:jpe?g|png|webp)/i.test(url)) {
    score += 2;
  }
  // Demote logos, icons, avatars, nav buttons
  if (/logo|icon|avatar|favicon|banner_bg|social|button|arrow/.test(combined)) {
    score -= 10;
  }
  return score;
}

export default {
  extractTenderFromMarkdown,
  extractedTenderSchema,
  extractCircularImages,
};
