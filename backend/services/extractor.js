import { z } from 'zod';

export const extractedTenderSchema = z.object({
  tender_id: z.string().nullable(),
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

export default {
  extractTenderFromMarkdown,
  extractedTenderSchema,
};
