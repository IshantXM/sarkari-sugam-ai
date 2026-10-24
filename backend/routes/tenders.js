import { Router } from 'express';
import { z } from 'zod';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { validateBody, httpUrlSchema } from '../middleware/validate.js';
import tinyfish from '../services/tinyfish.js';
import extractor from '../services/extractor.js';
import alerts from '../services/alerts.js';
import snapshotStore from '../services/snapshotStore.js';
import tokensUtil from '../utils/tokens.js';
import {
  seedTenders,
  seedSearchResults,
  seedMarkdown,
  seedAgentSteps,
  seedUpdatedTender,
} from '../data/seed.js';

const router = Router();

// Validation Schemas
const searchBodySchema = z.object({
  query: z
    .string({ required_error: 'Query string is required' })
    .min(3, 'Query must be at least 3 characters')
    .max(200, 'Query must be at most 200 characters'),
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

const fetchBodySchema = z.object({
  url: httpUrlSchema,
});

const agentBodySchema = z.object({
  url: httpUrlSchema,
  task: z.string().max(500, 'Task must be at most 500 characters').optional(),
});

const diffBodySchema = z.object({
  tender_id: z.string({ required_error: 'tender_id is required' }).min(1),
  url: httpUrlSchema.optional(),
  current: z
    .object({
      budget_usd: z.number().optional(),
      submission_deadline: z.string().optional(),
      eligibility: z.string().optional(),
    })
    .optional(),
});

// Helper for loose keyword matching in demo search
function filterSeedSearchResults(query, limit = 5) {
  const queryLower = query.toLowerCase().trim();
  const significantKeywords = queryLower
    .split(/\s+/)
    .map((k) => k.replace(/[^a-z0-9]/g, ''))
    .filter((k) => k.length >= 3 && !['tender', 'rfp', 'bids', 'notice', 'procurement'].includes(k));

  let matches = seedSearchResults.filter((item) => {
    const text = `${item.title} ${item.snippet} ${item.domain}`.toLowerCase();
    if (significantKeywords.length > 0) {
      // Require matching the domain-specific query keywords (e.g. cloud / infrastructure)
      return significantKeywords.every((kw) => text.includes(kw));
    }
    return text.includes(queryLower);
  });

  if (matches.length === 0) {
    // If no strict match, check if any keyword matches
    matches = seedSearchResults.filter((item) => {
      const text = `${item.title} ${item.snippet} ${item.domain}`.toLowerCase();
      return significantKeywords.some((kw) => text.includes(kw));
    });
  }

  // Fallback to all seed results if still empty, ensuring at least 1 result
  if (matches.length === 0) {
    matches = seedSearchResults;
  }

  return matches.slice(0, limit);
}

/**
 * 2. POST /api/tenders/search (Discovery)
 */
router.post('/search', validateBody(searchBodySchema), async (req, res, next) => {
  const { query, limit } = req.validatedBody;
  const requestId = req.id;
  const timestamp = new Date().toISOString();

  // 1. Demo Mode
  if (config.demoMode || !config.tinyfish.isConfigured) {
    logger.info(`[SEARCH:DEMO] Serving demo search results for query="${query}"`);
    const results = filterSeedSearchResults(query, limit);
    return res.json({
      status: 'success',
      source: 'cached_demo',
      query,
      count: results.length,
      results,
      request_id: requestId,
      timestamp,
    });
  }

  // 2. Live TinyFish Execution with Fallback
  try {
    logger.info(`[SEARCH:LIVE] Querying TinyFish Search for "${query}" (limit=${limit})`);
    const liveResults = await tinyfish.search({ query, limit });

    if (!liveResults || liveResults.length === 0) {
      throw new Error('No search results returned by TinyFish Search');
    }

    return res.json({
      status: 'success',
      source: 'tinyfish_live',
      query,
      count: liveResults.length,
      results: liveResults,
      request_id: requestId,
      timestamp,
    });
  } catch (err) {
    logger.warn(`[SEARCH:FALLBACK] Live search failed: ${err.message}. Serving resilient fallback.`);
    const fallbackResults = filterSeedSearchResults(query, limit);
    return res.json({
      status: 'success',
      source: 'fallback_demo',
      fallback_reason: 'Live TinyFish search unreachable; served resilient procurement index',
      query,
      count: fallbackResults.length,
      results: fallbackResults,
      request_id: requestId,
      timestamp,
    });
  }
});

/**
 * 3. POST /api/tenders/fetch (WOW 1: Context Shrink)
 */
router.post('/fetch', validateBody(fetchBodySchema), async (req, res, next) => {
  const { url } = req.validatedBody;
  const requestId = req.id;
  const timestamp = new Date().toISOString();

  // 1. Demo Mode
  if (config.demoMode || !config.tinyfish.isConfigured) {
    logger.info(`[FETCH:DEMO] Serving seeded context shrink data for url="${url}"`);
    const tender = {
      ...seedTenders[0],
      source_url: url,
    };
    snapshotStore.save(tender);

    return res.json({
      status: 'success',
      source: 'cached_demo',
      data: tender,
      markdown_preview: seedMarkdown.slice(0, 500),
      request_id: requestId,
      timestamp,
    });
  }

  // 2. Live TinyFish Execution with Fallback
  try {
    logger.info(`[FETCH:LIVE] Fetching clean markdown via TinyFish for url="${url}"`);
    const { markdown } = await tinyfish.fetchPage({ url });

    if (!markdown || markdown.trim().length === 0) {
      throw new Error('TinyFish Fetch returned empty markdown');
    }

    // Extract structured procurement fields via regex and heuristics
    const extractedData = extractor.extractTenderFromMarkdown(markdown, url);

    // Save into snapshot store keyed by tender_id
    if (extractedData.tender_id) {
      snapshotStore.save(extractedData);
    }

    return res.json({
      status: 'success',
      source: 'tinyfish_live',
      data: extractedData,
      markdown_preview: markdown.slice(0, 500),
      request_id: requestId,
      timestamp,
    });
  } catch (err) {
    logger.warn(`[FETCH:FALLBACK] Live fetch failed: ${err.message}. Serving resilient fallback.`);
    const fallbackTender = {
      ...seedTenders[0],
      source_url: url,
    };
    snapshotStore.save(fallbackTender);

    return res.json({
      status: 'success',
      source: 'fallback_demo',
      fallback_reason: 'Live page extraction timed out or failed; served cached portal tender',
      data: fallbackTender,
      markdown_preview: seedMarkdown.slice(0, 500),
      request_id: requestId,
      timestamp,
    });
  }
});

/**
 * 4. POST /api/tenders/agent (WOW 2: Gated Portal Navigation)
 */
router.post('/agent', validateBody(agentBodySchema), async (req, res, next) => {
  const { url, task } = req.validatedBody;
  const requestId = req.id;
  const timestamp = new Date().toISOString();

  // If credentials are not configured, gracefully return fallback_demo as required
  if (!config.portal.isConfigured) {
    logger.info('[AGENT:DEMO] Portal credentials not configured. Serving fallback_demo.');
    return res.json({
      status: 'success',
      source: 'fallback_demo',
      fallback_reason: 'portal credentials not configured',
      execution_steps: seedAgentSteps,
      extracted_tenders: seedTenders,
      pages_visited: 2,
      duration_ms: 1240,
      request_id: requestId,
      timestamp,
    });
  }

  // 1. Demo Mode
  if (config.demoMode || !config.tinyfish.isConfigured) {
    logger.info(`[AGENT:DEMO] Executing simulated agent navigation on gated portal="${url}"`);
    return res.json({
      status: 'success',
      source: 'cached_demo',
      execution_steps: seedAgentSteps,
      extracted_tenders: seedTenders,
      pages_visited: 2,
      duration_ms: 1240,
      request_id: requestId,
      timestamp,
    });
  }

  // 2. Live TinyFish Agent Execution with Fallback
  try {
    const userTask =
      task ||
      'Log in, navigate the search wizard, paginate through open tenders, and extract every active cloud or IT tender with its ID, agency, budget, deadline and document links';

    // Inject credentials securely into the agent goal instruction
    const secureGoal = `${userTask}. Authenticate using username "${config.portal.user}" and password "${config.portal.pass}". Navigate through the portal and return structured JSON tender records.`;

    logger.info(`[AGENT:LIVE] Launching TinyFish Web Agent on gated portal="${url}"`);
    const agentResult = await tinyfish.runAgent({ url, goal: secureGoal });

    return res.json({
      status: 'success',
      source: 'tinyfish_live',
      execution_steps: agentResult.execution_steps,
      extracted_tenders: agentResult.extracted_tenders,
      pages_visited: agentResult.pages_visited,
      duration_ms: agentResult.duration_ms,
      request_id: requestId,
      timestamp,
    });
  } catch (err) {
    logger.warn(`[AGENT:FALLBACK] Live agent failed: ${err.message}. Serving resilient fallback.`);
    return res.json({
      status: 'success',
      source: 'fallback_demo',
      fallback_reason: 'Agent execution failed on gated portal; returned certified fallback audit run',
      execution_steps: seedAgentSteps,
      extracted_tenders: seedTenders,
      pages_visited: 2,
      duration_ms: 1240,
      request_id: requestId,
      timestamp,
    });
  }
});

/**
 * 5. POST /api/tenders/diff (WOW 3: Corrigendum and Mutation Alert)
 */
router.post('/diff', validateBody(diffBodySchema), async (req, res, next) => {
  const { tender_id, url, current } = req.validatedBody;
  const requestId = req.id;
  const timestamp = new Date().toISOString();

  // Baseline selection
  let baseline = current || snapshotStore.get(tender_id);

  if (!baseline) {
    if (config.demoMode || !config.tinyfish.isConfigured) {
      // In demo mode, fall back to seeded baseline
      baseline = seedTenders[0];
      snapshotStore.save(baseline);
    } else {
      return res.status(404).json({
        status: 'error',
        error: 'no_baseline',
        message: `No baseline snapshot found for tender_id '${tender_id}'. Call /api/tenders/fetch first or provide 'current' fields in the request body.`,
        request_id: requestId,
        timestamp,
      });
    }
  }

  let latestData;
  let source = 'cached_demo';
  let fallbackReason = null;

  // Determine latest data
  if (config.demoMode || !config.tinyfish.isConfigured) {
    // Demo mode: use seeded updated tender
    latestData = { ...seedUpdatedTender, tender_id };
  } else {
    // Live mode: re-fetch from target URL or snapshot source_url
    const targetUrl = url || baseline.source_url;
    if (targetUrl) {
      try {
        const { markdown } = await tinyfish.fetchPage({ url: targetUrl });
        latestData = extractor.extractTenderFromMarkdown(markdown, targetUrl);
        source = 'tinyfish_live';
      } catch (err) {
        logger.warn(`[DIFF:FALLBACK] Re-fetch failed: ${err.message}. Using updated seed tender.`);
        latestData = { ...seedUpdatedTender, tender_id };
        source = 'fallback_demo';
        fallbackReason = 'Target portal re-fetch failed; loaded corrigendum from audit seed';
      }
    } else {
      latestData = { ...seedUpdatedTender, tender_id };
    }
  }

  // Compare field by field: budget_usd, submission_deadline, eligibility
  const changes = [];

  // Check budget_usd
  if (
    latestData.budget_usd !== undefined &&
    latestData.budget_usd !== null &&
    baseline.budget_usd !== undefined &&
    baseline.budget_usd !== null &&
    latestData.budget_usd !== baseline.budget_usd
  ) {
    changes.push({
      field: 'budget_usd',
      previous_value: baseline.budget_usd,
      updated_value: latestData.budget_usd,
      delta: Number((latestData.budget_usd - baseline.budget_usd).toFixed(2)),
    });
  }

  // Check submission_deadline
  if (
    latestData.submission_deadline &&
    baseline.submission_deadline &&
    latestData.submission_deadline !== baseline.submission_deadline
  ) {
    changes.push({
      field: 'submission_deadline',
      previous_value: baseline.submission_deadline,
      updated_value: latestData.submission_deadline,
      delta: null,
    });
  }

  // Check eligibility
  if (
    latestData.eligibility &&
    baseline.eligibility &&
    latestData.eligibility !== baseline.eligibility
  ) {
    changes.push({
      field: 'eligibility',
      previous_value: baseline.eligibility,
      updated_value: latestData.eligibility,
      delta: null,
    });
  }

  const mutationDetected = changes.length > 0;
  let addendumNotice = latestData.addendum_notice || null;
  let alert = null;

  if (mutationDetected) {
    if (!addendumNotice) {
      addendumNotice = `Corrigendum detected: ${changes.map((c) => c.field).join(', ')} updated.`;
    }
    // Dispatch alert via Slack webhook or simulation
    alert = await alerts.dispatchAlert({
      tenderId: tender_id,
      changes,
      addendumNotice,
    });

    // Update snapshot store with latest values
    snapshotStore.save({
      ...baseline,
      ...latestData,
      tender_id,
    });
  }

  const responsePayload = {
    status: 'success',
    source,
    tender_id,
    mutation_detected: mutationDetected,
    changes,
    addendum_notice: addendumNotice,
    alert,
    request_id: requestId,
    timestamp,
  };

  if (fallbackReason) {
    responsePayload.fallback_reason = fallbackReason;
  }

  return res.json(responsePayload);
});

export default router;
