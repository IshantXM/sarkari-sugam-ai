import axios from 'axios';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Dispatches an alert regarding tender corrigendum/mutations
 * Uses Slack webhook if configured (with a 5s timeout) or simulates dispatch.
 * Never throws an error or breaks the response.
 *
 * @param {object} params
 * @param {string} params.tenderId
 * @param {Array} params.changes
 * @param {string} params.addendumNotice
 * @returns {Promise<{ channel: string, dispatched: boolean, mode: 'slack'|'simulated', error: string|null }>}
 */
export async function dispatchAlert({ tenderId, changes = [], addendumNotice = '' }) {
  const channel = '#procurement-alerts';

  // If Slack webhook is not configured or in demo mode without URL, simulate
  if (!config.isSlackConfigured || !config.slackWebhookUrl) {
    logger.info(`[ALERT SIMULATION] Tender ${tenderId} mutation detected. Alert simulated for channel ${channel}`);
    return {
      channel,
      dispatched: true,
      mode: 'simulated',
      error: null,
    };
  }

  // Format Slack message payload
  const changesSummary = changes
    .map(
      (c) =>
        `• *${c.field}*: \`${c.previous_value ?? 'N/A'}\` -> \`${c.updated_value ?? 'N/A'}\`${
          c.delta !== null && c.delta !== undefined ? ` (Delta: ${c.delta > 0 ? '+' : ''}${c.delta})` : ''
        }`
    )
    .join('\n');

  const slackPayload = {
    text: `[ALERT] *Corrigendum Alert: Tender Mutation Detected* (${tenderId})`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `[ALERT] Tender Corrigendum Alert: ${tenderId}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Notice:* ${addendumNotice || 'New addendum/corrigendum detected on the portal.'}\n\n*Field-Level Modifications:*\n${changesSummary}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Dispatched by:* Sarkari Sugam AI Monitoring Engine | *Timestamp:* ${new Date().toISOString()}`,
          },
        ],
      },
    ],
  };

  try {
    await axios.post(config.slackWebhookUrl, slackPayload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });

    logger.info(`[ALERT] Slack webhook successfully dispatched for tender ${tenderId}`);
    return {
      channel,
      dispatched: true,
      mode: 'slack',
      error: null,
    };
  } catch (err) {
    logger.warn(`[ALERT] Failed to deliver Slack webhook for tender ${tenderId}: ${err.message}`);
    return {
      channel,
      dispatched: false,
      mode: 'slack',
      error: 'Slack delivery timed out or failed',
    };
  }
}

export default {
  dispatchAlert,
};
