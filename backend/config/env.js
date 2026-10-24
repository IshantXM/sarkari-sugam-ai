import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DEMO_MODE: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true' || val === '1';
      }
      return val;
    }, z.boolean())
    .default(true),
  TINYFISH_API_KEY: z.string().optional().default(''),
  TINYFISH_BASE_URL: z.string().url().default('https://api.tinyfish.co/v1'),
  PORTAL_USER: z.string().optional().default(''),
  PORTAL_PASS: z.string().optional().default(''),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SLACK_WEBHOOK_URL: z.string().optional().default(''),
  COST_PER_1K_TOKENS_RAW: z.coerce.number().default(0.0015),
  COST_PER_1K_TOKENS_PRUNED: z.coerce.number().default(0.002),
  POSTGRES_URI: z.string().optional().default(''),
  DATABASE_URL: z.string().optional().default(''),
  MONGODB_URI: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default(''),
  JWT_SECRET: z.string().default('sarkari_sugam_ai_hackiiitd_secret_token_2026'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  GEMINI_API_KEY: z.string().optional().default(''),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('[FATAL] Invalid environment configuration:');
  console.error(parsedEnv.error.format());
  process.exit(1);
}

const rawConfig = parsedEnv.data;

// If TINYFISH_API_KEY is missing or empty, force demo mode and warn
const tinyfishConfigured = Boolean(
  rawConfig.TINYFISH_API_KEY && rawConfig.TINYFISH_API_KEY !== 'your_tinyfish_api_key_here'
);

let activeDemoMode = rawConfig.DEMO_MODE;
if (!tinyfishConfigured) {
  activeDemoMode = true;
  console.warn('[CONFIG WARN] TINYFISH_API_KEY is not configured or placeholder detected.');
  console.warn('[CONFIG WARN] Operating in DEMO_MODE (seeded responses enabled).');
}

export const config = Object.freeze({
  port: rawConfig.PORT,
  demoMode: activeDemoMode,
  tinyfish: {
    apiKey: rawConfig.TINYFISH_API_KEY,
    baseUrl: rawConfig.TINYFISH_BASE_URL.replace(/\/+$/, ''), // strip trailing slash
    isConfigured: tinyfishConfigured,
  },
  portal: {
    user: rawConfig.PORTAL_USER && rawConfig.PORTAL_USER !== 'your_portal_username_here' ? rawConfig.PORTAL_USER : '',
    pass: rawConfig.PORTAL_PASS && rawConfig.PORTAL_PASS !== 'your_portal_password_here' ? rawConfig.PORTAL_PASS : '',
    get isConfigured() {
      return Boolean(this.user && this.pass);
    },
  },
  corsOrigin: rawConfig.CORS_ORIGIN,
  slackWebhookUrl: rawConfig.SLACK_WEBHOOK_URL,
  isSlackConfigured: Boolean(rawConfig.SLACK_WEBHOOK_URL && rawConfig.SLACK_WEBHOOK_URL.startsWith('http')),
  costs: {
    rawPer1k: rawConfig.COST_PER_1K_TOKENS_RAW,
    prunedPer1k: rawConfig.COST_PER_1K_TOKENS_PRUNED,
  },
  postgresUri: rawConfig.POSTGRES_URI || rawConfig.DATABASE_URL || '',
  mongodbUri: rawConfig.MONGODB_URI,
  databaseUri: rawConfig.POSTGRES_URI || rawConfig.DATABASE_URL || rawConfig.MONGODB_URI || 'mongodb://localhost:27017/Sarkari%20Sugam-AI',
  databaseType: (rawConfig.POSTGRES_URI || rawConfig.DATABASE_URL || '').startsWith('postgres') ? 'postgresql' : 'mongodb',
  jwt: {
    secret: rawConfig.JWT_SECRET,
    expiresIn: rawConfig.JWT_EXPIRES_IN,
  },
  smtp: {
    host: rawConfig.SMTP_HOST,
    port: rawConfig.SMTP_PORT,
    user: rawConfig.SMTP_USER,
    pass: rawConfig.SMTP_PASS,
    from: rawConfig.SMTP_FROM,
    isConfigured: Boolean(rawConfig.SMTP_USER && rawConfig.SMTP_PASS),
  },
  gemini: {
    apiKey: rawConfig.GEMINI_API_KEY,
    isConfigured: Boolean(rawConfig.GEMINI_API_KEY && rawConfig.GEMINI_API_KEY.length > 5),
  },
});

export default config;
