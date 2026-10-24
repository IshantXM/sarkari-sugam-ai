import { Router } from 'express';
import { z } from 'zod';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { validateBody, httpUrlSchema } from '../middleware/validate.js';
import tinyfish from '../services/tinyfish.js';
import extractor from '../services/extractor.js';
import alerts from '../services/alerts.js';
import snapshotStore from '../services/snapshotStore.js';

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

/**
 * 2. POST /api/tenders/search (Discovery)
 * Uses real live TinyFish Search API
 */
router.post('/search', validateBody(searchBodySchema), async (req, res, next) => {
  const { query, limit } = req.validatedBody;
  const requestId = req.id;
  const timestamp = new Date().toISOString();

  try {
    logger.info(`[SEARCH:LIVE] Querying TinyFish Search for "${query}" (limit=${limit})`);
    const liveResults = await tinyfish.search({ query, limit });

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
    logger.error(`[SEARCH:ERROR] Live search failed:`, err);
    return res.status(502).json({
      status: 'error',
      error: 'search_failed',
      message: `TinyFish Search request failed: ${err.message}`,
      request_id: requestId,
      timestamp,
    });
  }
});

/**
 * 3. POST /api/tenders/fetch (Live Context Shrink & Extraction)
 * Uses real live TinyFish Fetch API
 */
router.post('/fetch', validateBody(fetchBodySchema), async (req, res, next) => {
  const { url } = req.validatedBody;
  const requestId = req.id;
  const timestamp = new Date().toISOString();

  try {
    logger.info(`[FETCH:LIVE] Fetching clean markdown via TinyFish for url="${url}"`);
    const { markdown } = await tinyfish.fetchPage({ url });

    if (!markdown || markdown.trim().length === 0) {
      throw new Error('TinyFish Fetch returned empty markdown content for this URL');
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
    logger.error(`[FETCH:ERROR] Live fetch failed:`, err);
    return res.status(502).json({
      status: 'error',
      error: 'fetch_failed',
      message: `TinyFish Fetch failed to retrieve the page: ${err.message}`,
      request_id: requestId,
      timestamp,
    });
  }
});

/**
 * 4. POST /api/tenders/agent (Live Web Agent Automation)
 * Uses real live TinyFish Web Agent API
 */
router.post('/agent', validateBody(agentBodySchema), async (req, res, next) => {
  const { url, task } = req.validatedBody;
  const requestId = req.id;
  const timestamp = new Date().toISOString();

  try {
    let goal =
      task ||
      'Navigate the page, inspect open tenders or RFPs, and extract active contracts with title, ID, budget, and deadlines.';

    // Inject credentials securely into the agent goal if configured
    if (config.portal.isConfigured) {
      goal = `${goal} Authenticate using username "${config.portal.user}" and password "${config.portal.pass}".`;
    }

    logger.info(`[AGENT:LIVE] Launching TinyFish Web Agent on url="${url}"`);
    const agentResult = await tinyfish.runAgent({ url, goal });

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
    logger.error(`[AGENT:ERROR] Live agent run failed:`, err);
    return res.status(502).json({
      status: 'error',
      error: 'agent_failed',
      message: `TinyFish Agent failed to complete execution: ${err.message}`,
      request_id: requestId,
      timestamp,
    });
  }
});

/**
 * 5. POST /api/tenders/diff (Live Corrigendum and Mutation Detection)
 * Re-fetches the actual live page and diffs against baseline snapshot
 */
router.post('/diff', validateBody(diffBodySchema), async (req, res, next) => {
  const { tender_id, url, current } = req.validatedBody;
  const requestId = req.id;
  const timestamp = new Date().toISOString();

  // Baseline selection
  const baseline = current || snapshotStore.get(tender_id);

  if (!baseline) {
    return res.status(404).json({
      status: 'error',
      error: 'no_baseline',
      message: `No baseline snapshot found for tender_id '${tender_id}'. Call /api/tenders/fetch first or provide 'current' baseline in the request body.`,
      request_id: requestId,
      timestamp,
    });
  }

  const targetUrl = url || baseline.source_url;
  if (!targetUrl) {
    return res.status(400).json({
      status: 'error',
      error: 'missing_target_url',
      message: 'No target URL provided or found in snapshot baseline to re-fetch and diff.',
      request_id: requestId,
      timestamp,
    });
  }

  try {
    logger.info(`[DIFF:LIVE] Re-fetching live tender page to check for amendments: "${targetUrl}"`);
    const { markdown } = await tinyfish.fetchPage({ url: targetUrl });
    const latestData = extractor.extractTenderFromMarkdown(markdown, targetUrl);

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
    const addendumNotice = mutationDetected
      ? `Corrigendum detected: ${changes.map((c) => c.field).join(', ')} updated.`
      : null;

    let alert = null;
    if (mutationDetected) {
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

    return res.json({
      status: 'success',
      source: 'tinyfish_live',
      tender_id,
      mutation_detected: mutationDetected,
      changes,
      addendum_notice: addendumNotice,
      alert,
      request_id: requestId,
      timestamp,
    });
  } catch (err) {
    logger.error(`[DIFF:ERROR] Failed to re-fetch live page for diff:`, err);
    return res.status(502).json({
      status: 'error',
      error: 'diff_fetch_failed',
      message: `Failed to re-fetch live page via TinyFish: ${err.message}`,
      request_id: requestId,
      timestamp,
    });
  }
});

export default router;
