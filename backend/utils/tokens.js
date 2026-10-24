import config from '../config/env.js';

/**
 * Estimate token count based on string length (approx. 4 chars per token)
 * @param {string|number} contentOrLength
 * @returns {number} estimated tokens
 */
export function estimateTokens(contentOrLength) {
  if (typeof contentOrLength === 'number') {
    return Math.max(1, Math.round(contentOrLength / 4));
  }
  if (typeof contentOrLength === 'string') {
    return Math.max(1, Math.round(contentOrLength.length / 4));
  }
  return 0;
}

/**
 * Calculate token telemetry and cost savings
 *
 * Note on raw content size:
 * Modern government and procurement portal pages contain heavy DOM trees, JavaScript bundles,
 * stylesheets, and boilerplate HTML. Typical raw pages range between 150KB to 300KB (approx 40,000+ tokens).
 * If TinyFish does not return the raw HTML body (e.g. only clean markdown),
 * we estimate raw characters using content length or standard procurement portal multipliers (approx 25x-30x of markdown).
 *
 * @param {number} rawChars
 * @param {number} prunedChars
 * @param {number} latencyMs
 */
export function calculateTelemetry(rawChars, prunedChars, latencyMs = 340) {
  const rawTokens = estimateTokens(rawChars);
  const prunedTokens = estimateTokens(prunedChars);

  // Compression ratio: percentage reduction rounded to 1 decimal
  let ratioNumber = 0;
  if (rawTokens > 0) {
    ratioNumber = Math.max(0, ((rawTokens - prunedTokens) / rawTokens) * 100);
  }
  const compressionRatio = `${ratioNumber.toFixed(1)}%`;

  // Cost calculations in USD
  const costRaw = (rawTokens / 1000) * config.costs.rawPer1k;
  const costPruned = (prunedTokens / 1000) * config.costs.prunedPer1k;
  const savings = Math.max(0, costRaw - costPruned);

  return {
    raw_tokens: rawTokens,
    pruned_tokens: prunedTokens,
    compression_ratio: compressionRatio,
    latency_ms: Math.round(latencyMs),
    cost_usd_raw: Number(costRaw.toFixed(5)),
    cost_usd_pruned: Number(costPruned.toFixed(5)),
    savings_usd: Number(savings.toFixed(5)),
  };
}

export default {
  estimateTokens,
  calculateTelemetry,
};
