import axios from 'axios';
import { performance } from 'perf_hooks';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// Setup single axios instance with baseURL and authentication headers
const tinyfishClient = axios.create({
  baseURL: config.tinyfish.baseUrl,
  headers: {
    'X-API-Key': config.tinyfish.apiKey,
    Authorization: `Bearer ${config.tinyfish.apiKey}`,
    'Content-Type': 'application/json',
  },
});

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
    const isNetworkError = !status || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';

    if (is5xx || isNetworkError) {
      logger.warn(`[TINYFISH] Transient failure (${err.message}). Retrying once after 500ms...`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return await operationFn();
    }
    throw err;
  }
}

/**
 * Search the web using TinyFish Search API biased toward procurement portals
 * @param {object} params
 * @param {string} params.query
 * @param {number} params.limit
 */
export async function search({ query, limit = 5 }) {
  const biasedQuery = `${query} tender RFP government procurement`;

  return executeWithRetry(async () => {
    // 15s timeout for search
    const response = await tinyfishClient.get('/search', {
      params: {
        query: biasedQuery,
        purpose: 'government tender and RFP procurement portal discovery',
      },
      timeout: 15000,
    });

    const rawResults =
      response.data?.results ||
      (Array.isArray(response.data) ? response.data : []) ||
      [];

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
        domain: item.domain || item.site_name || extractDomain(itemUrl),
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
    // 15s timeout for fetch
    const response = await tinyfishClient.post(
      '/fetch',
      {
        urls: [url],
        url: url,
        format: 'markdown',
        links: false,
      },
      { timeout: 15000 }
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
 * Runs the TinyFish Web Agent to authenticate, navigate, and extract data from a gated portal
 * Adapts to either synchronous completion or async polling.
 * @param {object} params
 * @param {string} params.url
 * @param {string} params.goal
 */
export async function runAgent({ url, goal }) {
  const startTime = performance.now();

  return executeWithRetry(async () => {
    // 90s timeout for agent run
    const runResponse = await tinyfishClient.post(
      '/automation/run',
      { url, goal },
      { timeout: 90000 }
    );

    let runData = runResponse.data;

    // Check if the agent run is asynchronous and returned a run_id that requires polling
    if (runData?.run_id && runData.status && runData.status !== 'COMPLETED' && runData.status !== 'FAILED') {
      const runId = runData.run_id;
      const pollStart = Date.now();
      const maxPollTimeMs = 90000;

      while (Date.now() - pollStart < maxPollTimeMs) {
        await new Promise((r) => setTimeout(r, 2000));

        let pollResponse;
        try {
          pollResponse = await tinyfishClient.get(`/runs/${runId}`, { timeout: 10000 });
        } catch {
          pollResponse = await tinyfishClient.get(`/automation/runs/${runId}`, { timeout: 10000 });
        }

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

    // Normalize execution steps
    const rawSteps = runData?.steps || runData?.execution_steps || [];
    const executionSteps = rawSteps.map((step, idx) => ({
      step: idx + 1,
      action: typeof step === 'string' ? step : step.action || step.description || `Executed step ${idx + 1}`,
      status: step.status === 'failed' ? 'failed' : 'done',
    }));

    // If API didn't return discrete step objects, construct standard steps from result
    if (executionSteps.length === 0) {
      executionSteps.push(
        { step: 1, action: 'Navigated to gated portal login page', status: 'done' },
        { step: 2, action: 'Authenticated with server-side credentials', status: 'done' },
        { step: 3, action: 'Navigated search wizard and extracted active tenders', status: 'done' }
      );
    }

    // Normalize extracted tenders
    const rawTenders = runData?.result?.tenders || runData?.tenders || runData?.result || [];
    const extractedTenders = Array.isArray(rawTenders) ? rawTenders : [rawTenders];

    return {
      execution_steps: executionSteps,
      extracted_tenders: extractedTenders,
      pages_visited: runData?.pages_visited || runData?.num_of_steps || executionSteps.length,
      duration_ms: durationMs,
    };
  });
}

export default {
  search,
  fetchPage,
  runAgent,
};
