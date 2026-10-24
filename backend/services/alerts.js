import axios from 'axios';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { sendCorrigendumAlertEmail } from '../src/services/mailer.js';

/**
 * Dispatches an alert regarding tender corrigendum/mutations
 * Uses Slack webhook if configured and emails the subscribed officer/bidder.
 * Never throws an error or breaks the response.
 *
 * @param {object} params
 * @param {string} params.tenderId
 * @param {string} params.title
 * @param {Array} params.changes
 * @param {string} params.addendumNotice
 * @param {string} params.recipientEmail
 * @returns {Promise<object>}
 */
export async function dispatchAlert({
  tenderId,
  title = '',
  changes = [],
  addendumNotice = '',
  recipientEmail = null,
}) {
  const channel = '#procurement-alerts';
  let emailAlertRes = null;

  // 1. Dispatch Email Alert
  if (recipientEmail) {
    try {
      emailAlertRes = await sendCorrigendumAlertEmail(recipientEmail, {
        tenderId,
        title,
        changes,
        addendumNotice,
      });
    } catch (err) {
      logger.warn(`[ALERT] Email dispatch error: ${err.message}`);
    }
  }

  // 2. Dispatch Slack Webhook if configured
  if (!config.isSlackConfigured || !config.slackWebhookUrl) {
    logger.info(`[ALERT SIMULATION] Tender ${tenderId} mutation detected. Alert logged for channel ${channel}`);
    return {
      channel,
      dispatched: true,
      mode: 'simulated',
      email: emailAlertRes,
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
      email: emailAlertRes,
      error: null,
    };
  } catch (err) {
    logger.warn(`[ALERT] Failed to deliver Slack webhook for tender ${tenderId}: ${err.message}`);
    return {
      channel,
      dispatched: Boolean(emailAlertRes?.sent),
      mode: 'slack',
      email: emailAlertRes,
      error: 'Slack delivery timed out or failed',
    };
  }
}

export default {
  dispatchAlert,
};
