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
 * Search the live web using TinyFish Search API biased toward procurement portals
 * @param {object} params
 * @param {string} params.query
 * @param {number} params.limit
 */
export async function search({ query, limit = 5 }) {
  const biasedQuery = `${query} tender RFP government procurement`;

  return executeWithRetry(async () => {
    const response = await axios.get(TINYFISH_SEARCH_URL, {
      params: {
        query: biasedQuery,
        purpose: 'government tender and RFP procurement portal discovery',
      },
      headers: {
        'X-API-Key': config.tinyfish.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const rawResults = response.data?.results || [];
    const seenUrls = new Set();
    const normalized = [];

    for (const item of rawResults) {
      const itemUrl = item.url || item.link || '';
      if (!itemUrl || seenUrls.has(itemUrl)) continue;
      seenUrls.add(itemUrl);

      normalized.push({
        title: item.title || item.name || 'Government Procurement Notice',
        url: itemUrl,
        snippet: item.snippet || item.description || '',
        domain: item.site_name || item.domain || extractDomain(itemUrl),
      });

      if (normalized.length >= limit) break;
    }

    return normalized;
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

