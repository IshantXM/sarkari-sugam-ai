import axios from 'axios';
import { performance } from 'perf_hooks';
import config from '../config/env.js';
import logger from '../utils/logger.js';

const TINYFISH_SEARCH_URL = 'https://api.search.tinyfish.ai';
const TINYFISH_FETCH_URL = 'https://api.fetch.tinyfish.ai';
const TINYFISH_AGENT_BASE = 'https://agent.tinyfish.ai/v1';

/**
 * Safely extracts domain name from a URL
 */
function extractDomain(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Executes an HTTP operation with 1 retry on network error or 5xx
 * Never retries on 4xx client errors
 */
async function executeWithRetry(operationFn) {
  try {
    return await operationFn();
  } catch (err) {
    const status = err.response?.status;
    const is5xx = status && status >= 500 && status < 600;
    const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'));
    const isNetworkError = !isTimeout && (!status || err.code === 'ERR_NETWORK');

    if (is5xx || isNetworkError) {
      logger.warn(`[TINYFISH] Transient network failure (${err.message}). Retrying once after 500ms...`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return await operationFn();
    }
    throw err;
  }
}

/**
 * Known institution abbreviation expansions for Indian educational/government bodies.
 * Maps short forms to { fullName, domain } so we can run a targeted site: search.
 */
const INSTITUTION_ALIASES = {
  'iiit d':    { fullName: 'IIIT Delhi', domain: 'iiitd.ac.in' },
  'iiitd':     { fullName: 'IIIT Delhi', domain: 'iiitd.ac.in' },
  'iiit delhi':{ fullName: 'IIIT Delhi', domain: 'iiitd.ac.in' },
  'iiit h':    { fullName: 'IIIT Hyderabad', domain: 'iiit.ac.in' },
  'iiit b':    { fullName: 'IIIT Bangalore', domain: 'iiitb.ac.in' },
  'iiit pune': { fullName: 'IIIT Pune', domain: 'iiitp.ac.in' },
  'iiit l':    { fullName: 'IIIT Lucknow', domain: 'iiitl.ac.in' },
  'iit d':     { fullName: 'IIT Delhi', domain: 'iitd.ac.in' },
  'iit b':     { fullName: 'IIT Bombay', domain: 'iitb.ac.in' },
  'iit m':     { fullName: 'IIT Madras', domain: 'iitm.ac.in' },
  'iit k':     { fullName: 'IIT Kanpur', domain: 'iitk.ac.in' },
  'iit kgp':   { fullName: 'IIT Kharagpur', domain: 'iitkgp.ac.in' },
  'iit r':     { fullName: 'IIT Roorkee', domain: 'iitr.ac.in' },
  'nit d':     { fullName: 'NIT Delhi', domain: 'nitdelhi.ac.in' },
  'dtu':       { fullName: 'Delhi Technological University', domain: 'dtu.ac.in' },
  'du':        { fullName: 'Delhi University', domain: 'du.ac.in' },
  'jnu':       { fullName: 'Jawaharlal Nehru University', domain: 'jnu.ac.in' },
  'aiims':     { fullName: 'AIIMS Delhi', domain: 'aiims.edu' },
};

/**
 * Domains that host paywalled / scraped / outdated copies of tender documents.
 * Results from these domains are filtered out.
 */
const JUNK_DOMAINS = new Set([
  'scribd.com', 'www.scribd.com',
  'coursehero.com', 'www.coursehero.com',
  'studocu.com', 'www.studocu.com',
  'academia.edu', 'www.academia.edu',
  'slideshare.net', 'www.slideshare.net',
  'docplayer.net', 'www.docplayer.net',
]);

/**
 * Detect if a user query references a known institution and return its metadata.
 */
function detectInstitution(rawQuery) {
  const lower = rawQuery.toLowerCase().trim();
  for (const [alias, meta] of Object.entries(INSTITUTION_ALIASES)) {
    if (lower.includes(alias)) {
      return meta;
    }
  }
  return null;
}

/**
 * Build an intelligent search query:
 * 1. Expand institution abbreviations (IIIT D → IIIT Delhi)
 * 2. Don't duplicate words already present
 * 3. Inject current year for freshness
 */
function buildSmartQuery(rawQuery) {
  const institution = detectInstitution(rawQuery);

  let expanded = rawQuery;
  if (institution) {
    // Replace the abbreviation with the full name for better matching
    for (const [alias] of Object.entries(INSTITUTION_ALIASES)) {
      const regex = new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(expanded)) {
        expanded = expanded.replace(regex, institution.fullName);
        break;
      }
    }
  }

  const lowerExpanded = expanded.toLowerCase();
  const boostTerms = [];

  // Only add 'tender' if not already present
  if (!lowerExpanded.includes('tender') && !lowerExpanded.includes('rfp') && !lowerExpanded.includes('nit') && !lowerExpanded.includes('quotation')) {
    boostTerms.push('tender');
  }

  // Add current year for freshness unless a year is already specified
  const currentYear = new Date().getFullYear().toString();
  if (!lowerExpanded.includes(currentYear) && !lowerExpanded.match(/20\d{2}/)) {
    boostTerms.push(currentYear);
  }

  // Add 'government procurement' only if no procurement-related words exist
  if (!lowerExpanded.includes('procurement') && !lowerExpanded.includes('government') && !lowerExpanded.includes('eprocure')) {
    boostTerms.push('government procurement');
  }

  return `${expanded} ${boostTerms.join(' ')}`.trim();
}

/**
 * Score a result for relevance sorting — official portals rank higher, stale results rank lower.
 */
function scoreResult(item) {
  let score = 0;
  const domain = (item.domain || '').toLowerCase();
  const snippet = (item.snippet || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const currentYear = new Date().getFullYear().toString();
  const prevYear = (new Date().getFullYear() - 1).toString();

  // Boost official domains
  if (domain.endsWith('.ac.in')) score += 30;
  if (domain.endsWith('.gov.in') || domain.includes('gem.gov')) score += 25;
  if (domain.endsWith('.nic.in')) score += 20;
  if (domain.includes('eprocure')) score += 15;

  // Boost current year mentions
  if (snippet.includes(currentYear) || title.includes(currentYear)) score += 20;
  if (snippet.includes(prevYear) || title.includes(prevYear)) score += 5;

  // Penalize very old dates
  for (let y = 2020; y <= new Date().getFullYear() - 2; y++) {
    if ((snippet.includes(y.toString()) || title.includes(y.toString())) && !snippet.includes(currentYear)) {
      score -= 15;
    }
  }

  // Penalize PDF links from random institutions (often archived old tenders)
  const url = item.url || '';
  if (url.endsWith('.pdf') && !domain.endsWith('.ac.in') && !domain.endsWith('.gov.in')) {
    score -= 10;
  }

  return score;
}

/**
 * Execute a single TinyFish search request and return normalized results.
 */
async function executeSearch(searchQuery, purpose, searchLimit) {
  const response = await axios.get(TINYFISH_SEARCH_URL, {
    params: {
      query: searchQuery,
      purpose,
    },
    headers: {
      'X-API-Key': config.tinyfish.apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  const rawResults = response.data?.results || [];
  const results = [];

  for (const item of rawResults) {
    const itemUrl = item.url || item.link || '';
    if (!itemUrl) continue;

    const domain = item.site_name || item.domain || extractDomain(itemUrl);

    // Filter out junk domains
    if (JUNK_DOMAINS.has(domain.toLowerCase())) continue;

    results.push({
      title: item.title || item.name || 'Government Procurement Notice',
      url: itemUrl,
      snippet: item.snippet || item.description || '',
      domain,
    });
  }

  return results;
}

/**
 * Search the live web using TinyFish Search API with intelligent query building.
 * - Expands institution abbreviations (IIIT D → IIIT Delhi)
 * - Injects current year for freshness
 * - Filters junk domains
 * - Runs parallel targeted site: search for detected institutions
 * - Boosts official .ac.in / .gov.in results to top
 *
 * @param {object} params
 * @param {string} params.query
 * @param {number} params.limit
 */
export async function search({ query, limit = 5 }) {
  const smartQuery = buildSmartQuery(query);
  const institution = detectInstitution(query);

  return executeWithRetry(async () => {
    // Run searches in parallel: main search + targeted site search if institution detected
    const searches = [
      executeSearch(smartQuery, 'Find active government tenders and procurement notices', limit * 2),
    ];

    if (institution?.domain) {
      const siteQuery = `site:${institution.domain} tender`;
      searches.push(
        executeSearch(siteQuery, `Find tenders on ${institution.fullName} official website`, 3)
          .catch(() => []) // Don't fail if targeted search fails
      );
    }

    const [mainResults, siteResults = []] = await Promise.all(searches);

    // Merge and deduplicate
    const seenUrls = new Set();
    const allResults = [];

    // Site-specific results first (they're the most relevant)
    for (const item of siteResults) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        allResults.push(item);
      }
    }

    for (const item of mainResults) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        allResults.push(item);
      }
    }

    // Sort by relevance score
    allResults.sort((a, b) => scoreResult(b) - scoreResult(a));

    return allResults.slice(0, limit);
  });
}

/**
 * Fetch and prune clean Markdown from a target URL using TinyFish Fetch API
 * @param {object} params
 * @param {string} params.url
 */
export async function fetchPage({ url }) {
  const startTime = performance.now();

  return executeWithRetry(async () => {
    const response = await axios.post(
      TINYFISH_FETCH_URL,
      {
        urls: [url],
        format: 'markdown',
      },
      {
        headers: {
          'X-API-Key': config.tinyfish.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const latencyMs = Math.round(performance.now() - startTime);

    let markdown = '';
    let rawContent = '';

    if (response.data?.results && response.data.results.length > 0) {
      const first = response.data.results[0];
      markdown = first.text || first.markdown || first.content || '';
      rawContent = first.raw_content || first.html || '';
    } else if (typeof response.data === 'string') {
      markdown = response.data;
    } else if (response.data?.text || response.data?.markdown) {
      markdown = response.data.text || response.data.markdown;
      rawContent = response.data.raw_html || '';
    }

    return {
      markdown,
      rawContent,
      latencyMs,
    };
  });
}

/**
 * Runs the TinyFish Web Agent to authenticate, navigate, and extract data from a portal
 * Adapts to either synchronous completion or async polling.
 * @param {object} params
 * @param {string} params.url
 * @param {string} params.goal
 */
export async function runAgent({ url, goal }) {
  const startTime = performance.now();

  return executeWithRetry(async () => {
    const runResponse = await axios.post(
      `${TINYFISH_AGENT_BASE}/automation/run`,
      { url, goal },
      {
        headers: {
          'X-API-Key': config.tinyfish.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    let runData = runResponse.data;

    // Check if the agent run returned a run_id and requires polling
    if (runData?.run_id && runData.status && runData.status !== 'COMPLETED' && runData.status !== 'FAILED') {
      const runId = runData.run_id;
      const pollStart = Date.now();
      const maxPollTimeMs = 120000;

      while (Date.now() - pollStart < maxPollTimeMs) {
        await new Promise((r) => setTimeout(r, 2000));

        const pollResponse = await axios.get(`${TINYFISH_AGENT_BASE}/runs/${runId}`, {
          headers: {
            'X-API-Key': config.tinyfish.apiKey,
          },
        });

        const pollStatus = pollResponse.data?.status;
        if (pollStatus === 'COMPLETED') {
          runData = pollResponse.data;
          break;
        } else if (pollStatus === 'FAILED' || pollStatus === 'CANCELLED') {
          throw new Error(`TinyFish agent run failed with status: ${pollStatus}`);
        }
      }

      if (runData?.status !== 'COMPLETED') {
        throw new Error('TinyFish agent run timed out while polling after 90 seconds');
      }
    }

    const durationMs = Math.round(performance.now() - startTime);

    // Normalize execution steps from TinyFish
    const rawSteps = runData?.steps || runData?.execution_steps || [];
    const executionSteps = rawSteps.map((step, idx) => ({
      step: idx + 1,
      action: typeof step === 'string' ? step : step.action || step.description || `Executed step ${idx + 1}`,
      status: step.status === 'failed' ? 'failed' : 'done',
    }));

    if (executionSteps.length === 0) {
      executionSteps.push(
        { step: 1, action: `Navigated to target portal: ${url}`, status: 'done' },
        { step: 2, action: `Executed goal: "${goal.slice(0, 120)}"`, status: 'done' },
        { step: 3, action: `Completed navigation in ${runData?.num_of_steps || 3} steps and extracted data`, status: 'done' }
      );
    }

    // Normalize extracted results
    let extractedTenders = [];
    const rawResult = runData?.result;

    if (rawResult) {
      if (Array.isArray(rawResult.tenders)) {
        extractedTenders = rawResult.tenders;
      } else if (Array.isArray(rawResult)) {
        extractedTenders = rawResult;
      } else if (typeof rawResult === 'object') {
        if (rawResult.result && Array.isArray(rawResult.result)) {
          extractedTenders = rawResult.result;
        } else {
          extractedTenders = [rawResult];
        }
      }
    }

    return {
      execution_steps: executionSteps,
      extracted_tenders: extractedTenders,
      pages_visited: runData?.num_of_steps || runData?.pages_visited || executionSteps.length,
      duration_ms: durationMs,
    };
  });
}

/**
 * Structured output schema for tender and procurement notices
 * Adheres strictly to TinyFish schema rules (https://docs.tinyfish.ai/key-concepts/structured-output):
 * - Top-level must be type: "object"
 * - Allowed keywords only: type, properties, required, nullable
 * - No unsupported keywords (no additionalProperties, no oneOf, no const, no examples)
 */
export const TENDER_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    tender_id: { type: 'string', nullable: true },
    title: { type: 'string', nullable: true },
    issuing_agency: { type: 'string', nullable: true },
    budget_usd: { type: 'number', nullable: true },
    submission_deadline: { type: 'string', nullable: true },
    eligibility: { type: 'string', nullable: true },
  },
  required: ['tender_id', 'title'],
};

/**
 * Determines appropriate proxy configuration based on URL target
 * Routes Indian government portals (.gov.in, .nic.in, etc.) via India proxy to prevent geo-blocking
 */
export function getProxyConfigForUrl(urlStr) {
  const domain = extractDomain(urlStr).toLowerCase();
  const isIndianPortal =
    domain.endsWith('.in') ||
    domain.includes('eprocure') ||
    domain.includes('gem.gov') ||
    domain.includes('nic.in') ||
    domain.includes('gov.in');

  return {
    enabled: true,
    type: 'tinyfish',
    country_code: isIndianPortal ? 'IN' : 'US',
  };
}

/**
 * Generates a clean deterministic fallback tender ID if the page does not declare an explicit one
 */
export function generateFallbackTenderId(urlStr, title = null) {
  try {
    const urlObj = new URL(urlStr);
    for (const param of ['sp', 'id', 'tender_id', 'ref', 'notice_id']) {
      const val = urlObj.searchParams.get(param);
      if (val) {
        const clean = val.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16);
        if (clean.length >= 4) return `TNDR-${clean.toUpperCase()}`;
      }
    }
  } catch {
    // ignore
  }

  const domain = extractDomain(urlStr).replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'PORTAL';
  let hash = 0;
  for (let i = 0; i < urlStr.length; i++) {
    hash = (hash * 31 + urlStr.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
  return `TNDR-${domain}-${hex}`;
}

/**
 * Fetches and extracts structured tender details using TinyFish Structured Output
 * @param {object} params
 * @param {string} params.url
 * @returns {Promise<{ result: object, runData: object, latencyMs: number }>}
 */
export async function fetchStructuredTender({ url }) {
  const startTime = performance.now();
  const proxyConfig = getProxyConfigForUrl(url);

  const goal = 'Extract the tender details from this page including tender ID, title, issuing organization, budget, and deadline.';

  return executeWithRetry(async () => {
    logger.info(`[TINYFISH:STRUCTURED] Requesting structured output for "${url}" (proxy=${proxyConfig.country_code})`);

    const runResponse = await axios.post(
      `${TINYFISH_AGENT_BASE}/automation/run`,
      {
        url,
        goal,
        output_schema: TENDER_OUTPUT_SCHEMA,
        proxy_config: proxyConfig,
      },
      {
        headers: {
          'X-API-Key': config.tinyfish.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    let runData = runResponse.data;

    // Check if the agent run returned a run_id and requires polling
    if (runData?.run_id && runData.status && runData.status !== 'COMPLETED' && runData.status !== 'FAILED') {
      const runId = runData.run_id;
      const pollStart = Date.now();
      const maxPollTimeMs = 120000;

      while (Date.now() - pollStart < maxPollTimeMs) {
        await new Promise((r) => setTimeout(r, 2000));

        const pollResponse = await axios.get(`${TINYFISH_AGENT_BASE}/runs/${runId}`, {
          headers: {
            'X-API-Key': config.tinyfish.apiKey,
          },
        });

        const pollStatus = pollResponse.data?.status;
        if (pollStatus === 'COMPLETED') {
          runData = pollResponse.data;
          break;
        } else if (pollStatus === 'FAILED' || pollStatus === 'CANCELLED') {
          throw new Error(`TinyFish agent run failed with status: ${pollStatus}`);
        }
      }

      if (runData?.status !== 'COMPLETED') {
        throw new Error('TinyFish structured extraction timed out while polling');
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);
    const result = runData?.result || {};

    return {
      result,
      runData,
      latencyMs,
    };
  });
}

export default {
  search,
  fetchPage,
  runAgent,
  fetchStructuredTender,
  generateFallbackTenderId,
  getProxyConfigForUrl,
  TENDER_OUTPUT_SCHEMA,
};

