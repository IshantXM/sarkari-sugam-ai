import nodemailer from 'nodemailer';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

let transporter = null;
let testAccount = null;

async function getTransporter() {
  if (config.smtp.isConfigured) {
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  // Fallback to auto-created Ethereal virtual test inbox
  if (!testAccount) {
    testAccount = await nodemailer.createTestAccount();
    logger.info(`[MAILER] Created virtual test inbox account: ${testAccount.user}`);
  }

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

/**
 * Send password verification code email
 */
export async function sendResetCodeEmail(toEmail, code) {
  try {
    const transport = await getTransporter();
    const fromAddress = config.smtp.isConfigured
      ? (config.smtp.from || config.smtp.user)
      : '"Sarkari Sugam AI Portal" <support@sarkarisugam.gov.in>';

    const info = await transport.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `Verification Code [${code}] - Sarkari Sugam AI Password Reset`,
      text: `Your Sarkari Sugam AI password reset verification code is: ${code}\n\nThis verification code expires in 15 minutes.\n\nIf you did not request this, please disregard this email.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px;">
            <div style="display: inline-block; background: #fff7ed; border: 1px solid #fed7aa; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
              Official Procurement Security
            </div>
            <h1 style="color: #0f172a; margin: 6px 0 2px 0; font-size: 22px; font-weight: 800;">Sarkari Sugam AI</h1>
            <p style="color: #64748b; font-size: 13px; margin: 0;">National Tender Intelligence & RFP Monitoring Portal</p>
          </div>

          <p style="color: #334155; font-size: 15px; margin: 0 0 16px 0;">Hello,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            A password reset request was initiated for your portal account (<strong>${toEmail}</strong>). Please use the secure 6-digit verification code below to authorize this change:
          </p>

          <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 1.5px dashed #f97316; border-radius: 10px; padding: 22px; text-align: center; margin: 24px 0;">
            <span style="display: block; font-size: 11px; font-weight: 700; color: #9a3412; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
              Verification OTP Code
            </span>
            <span style="display: inline-block; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #c2410c; background: #ffffff; padding: 8px 24px; border-radius: 8px; border: 1px solid #fdba74; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.1);">
              ${code}
            </span>
            <span style="display: block; font-size: 12px; color: #9a3412; margin-top: 10px; font-weight: 500;">
              ⏳ This code is valid for 15 minutes
            </span>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0 0 24px 0;">
            Security Notice: If you did not request this code, no action is required. Your password has not been altered, and your session remains secure.
          </p>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">
              Govt Procurement Portal &bull; Sarkari Sugam AI &bull; Ministry of Road Transport & Highways
            </p>
          </div>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info(`[MAILER] Verification email sent to ${toEmail}. Message ID: ${info.messageId}`);
    if (previewUrl) {
      logger.info(`[MAILER] View test email at: ${previewUrl}`);
    }

    return {
      sent: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      isRealSmtp: config.smtp.isConfigured,
    };
  } catch (err) {
    logger.error(`[MAILER] Failed to deliver email to ${toEmail}: ${err.message}`);
    return {
      sent: false,
      error: err.message,
      isRealSmtp: config.smtp.isConfigured,
    };
  }
}

export default {
  sendResetCodeEmail,
};
