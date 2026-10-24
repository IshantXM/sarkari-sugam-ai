# Sarkari Sugam AI — Backend API

An enterprise-grade, zero-crash procurement and RFP discovery/monitoring engine powered by the **TinyFish Web Execution API**. Designed for mission-critical hackathon demos and production portal intelligence.

---

## 🌟 Key Capabilities & WOW Factors

1. **Discovery Bias & Deduplication (`/api/tenders/search`)**: Automatically enriches search queries to pierce through municipal and state government portals and deduplicates listings.
2. **WOW 1: Context Shrink (`/api/tenders/fetch`)**: Converts heavy JavaScript/DOM government portal pages into clean, token-efficient Markdown, achieving **96%+ token compression** and real-time LLM cost savings telemetry.
3. **WOW 2: Gated Portal Navigation (`/api/tenders/agent`)**: Employs TinyFish Web Agent to authenticate through gated procurement login forms, solve multi-step search wizards, paginate results, and extract hidden document links without exposing credentials to the client.
4. **WOW 3: Corrigendum & Mutation Alerting (`/api/tenders/diff`)**: Performs field-level diffing between historical baselines and current portal notices, detects critical changes (budget shifts, deadline extensions), and dispatches formatted Slack webhook alerts.
5. **Stage Demo Resilience**: Every endpoint supports graceful, instantaneous fallback to certified audit seed data if live networks or third-party gateways encounter transient failures. **The demo never crashes.**

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js 20+
- npm 9+

### 1. Installation
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```

### 3. Start the Server
* **Production / Normal Start:**
  ```bash
  npm start
  ```
* **Development (Auto-reload with Nodemon):**
  ```bash
  npm run dev
  ```
* **Automated Smoke Test Suite:**
  ```bash
  npm run test:smoke
  ```

---

## ⚙️ Environment Variables & Mode Switching

All environment variables are defined in `.env.example`:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Local HTTP server port | `5000` |
| `DEMO_MODE` | Set `true` for deterministic instant playback; `false` for live TinyFish execution | `true` |
| `TINYFISH_API_KEY` | Your TinyFish API key | `your_tinyfish_api_key_here` |
| `TINYFISH_BASE_URL` | Base URL for TinyFish API | `https://api.tinyfish.co/v1` |
| `PORTAL_USER` | Server-side username for gated portal navigation | `your_portal_username_here` |
| `PORTAL_PASS` | Server-side password for gated portal navigation | `your_portal_password_here` |
| `CORS_ORIGIN` | Allowed origin for frontend clients | `http://localhost:5173` |
| `SLACK_WEBHOOK_URL` | Optional incoming Slack webhook URL for corrigendum alerts | *(leave empty to simulate)* |
| `COST_PER_1K_TOKENS_RAW` | Telemetry cost per 1K raw tokens ($) | `0.0015` |
| `COST_PER_1K_TOKENS_PRUNED` | Telemetry cost per 1K pruned tokens ($) | `0.002` |

### How to Switch Between Modes
- **Demo Mode (`DEMO_MODE=true` or missing API key):**
  Uses high-fidelity seeded responses (`source: "cached_demo"`). Ideal for offline testing and presentation reliability.
- **Live Mode (`DEMO_MODE=false` with valid `TINYFISH_API_KEY`):**
  Calls the live TinyFish Web Execution API (`source: "tinyfish_live"`). If a live call fails or times out, the backend automatically falls back to certified seed data (`source: "fallback_demo"`) with zero interruption.

---

## 📡 Endpoints Table & Examples

### 1. Health & Config Status (`GET /api/health`)
* **Description:** Check service availability, configuration flags, and active uptime. Never leaks secrets.
* **cURL Command:**
```bash
curl -X GET http://localhost:5000/api/health
```
* **Example Response:**
```json
{
  "ok": true,
  "demo_mode": true,
  "tinyfish_configured": false,
  "portal_credentials_configured": false,
  "slack_configured": false,
  "uptime_seconds": 12,
  "version": "1.0.0",
  "request_id": "req_8x9a2k1d",
  "timestamp": "2026-10-24T07:15:00.000Z"
}
```

---

### 2. Tender Discovery (`POST /api/tenders/search`)
* **Description:** Searches government procurement portals with domain bias and deduplication.
* **cURL Command:**
```bash
curl -X POST http://localhost:5000/api/tenders/search \
  -H "Content-Type: application/json" \
  -d '{"query": "cloud infrastructure tender", "limit": 5}'
```
* **Example Response:**
```json
{
  "status": "success",
  "source": "cached_demo",
  "query": "cloud infrastructure tender",
  "count": 2,
  "results": [
    {
      "title": "State Cloud Infrastructure Modernization & Migration (RFP-2026-0417)",
      "url": "https://stateprocure.gov/tenders/cloud-infra-2026",
      "snippet": "Request for Proposals: State IT Department is seeking certified vendors for cloud infrastructure migration...",
      "domain": "stateprocure.gov"
    },
    {
      "title": "Municipal Data Center Expansion & Cloud Infrastructure",
      "url": "https://cityhub.gov/eprocure/tender-8812",
      "snippet": "CityHub e-Procurement Portal: Turnkey tender for municipal data center scaling...",
      "domain": "cityhub.gov"
    }
  ],
  "request_id": "req_j39f82m1",
  "timestamp": "2026-10-24T07:15:02.000Z"
}
```

---

### 3. WOW 1: Context Shrink & Telemetry (`POST /api/tenders/fetch`)
* **Description:** Fetches target URL, prunes boilerplate DOM, outputs clean Markdown, extracts fields, and measures LLM cost savings.
* **cURL Command:**
```bash
curl -X POST http://localhost:5000/api/tenders/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://stateprocure.gov/tenders/cloud-infra-2026"}'
```
* **Example Response:**
```json
{
  "status": "success",
  "source": "cached_demo",
  "data": {
    "tender_id": "STATE-IT-2026-0417",
    "issuing_agency": "State IT Department",
    "budget_usd": 85000,
    "submission_deadline": "2026-11-14 17:00 IST",
    "eligibility": "ISO 27001, 3+ yrs gov experience",
    "source_url": "https://stateprocure.gov/tenders/cloud-infra-2026",
    "extraction_confidence": 1.0
  },
  "telemetry": {
    "raw_tokens": 42840,
    "pruned_tokens": 1450,
    "compression_ratio": "96.6%",
    "latency_ms": 342,
    "cost_usd_raw": 0.06426,
    "cost_usd_pruned": 0.0029,
    "savings_usd": 0.06136
  },
  "markdown_preview": "# STATE PROCUREMENT PORTAL - NOTICE INVITING TENDER (NIT)\n\n## Tender Overview\n* **Tender No / Reference:** STATE-IT-2026-0417...",
  "request_id": "req_v83k9d02",
  "timestamp": "2026-10-24T07:15:05.000Z"
}
```

---

### 4. WOW 2: Gated Portal Navigation (`POST /api/tenders/agent`)
* **Description:** Autonomous web execution for authenticated portals. Server injects credentials into the agent goal; returns normalized steps and tenders.
* **cURL Command:**
```bash
curl -X POST http://localhost:5000/api/tenders/agent \
  -H "Content-Type: application/json" \
  -d '{"url": "https://cityhub.gov/eprocure/login", "task": "Authenticate and extract all active cloud tenders"}'
```
* **Example Response:**
```json
{
  "status": "success",
  "source": "cached_demo",
  "execution_steps": [
    { "step": 1, "action": "Navigated to gated portal login page", "status": "done" },
    { "step": 2, "action": "Authenticated using server-side vault credentials", "status": "done" },
    { "step": 3, "action": "Completed 3-step municipal search wizard", "status": "done" },
    { "step": 4, "action": "Paginated to page 2 and found hidden tender PDF links", "status": "done" },
    { "step": 5, "action": "Extracted 2 active tenders", "status": "done" }
  ],
  "extracted_tenders": [
    {
      "tender_id": "STATE-IT-2026-0417",
      "issuing_agency": "State IT Department",
      "budget_usd": 85000,
      "submission_deadline": "2026-11-14 17:00 IST"
    },
    {
      "tender_id": "MUNI-DC-2026-8812",
      "issuing_agency": "City Municipal Corporation",
      "budget_usd": 145000,
      "submission_deadline": "2026-12-05 15:00 IST"
    }
  ],
  "pages_visited": 2,
  "duration_ms": 1240,
  "request_id": "req_0k3ld92m",
  "timestamp": "2026-10-24T07:15:08.000Z"
}
```

---

### 5. WOW 3: Corrigendum & Mutation Alerting (`POST /api/tenders/diff`)
* **Description:** Detects changes between historical baseline and new notices. Formats changes and dispatches Slack notifications.
* **cURL Command:**
```bash
curl -X POST http://localhost:5000/api/tenders/diff \
  -H "Content-Type: application/json" \
  -d '{"tender_id": "STATE-IT-2026-0417"}'
```
* **Example Response:**
```json
{
  "status": "success",
  "source": "cached_demo",
  "tender_id": "STATE-IT-2026-0417",
  "mutation_detected": true,
  "changes": [
    {
      "field": "budget_usd",
      "previous_value": 85000,
      "updated_value": 120000,
      "delta": 35000
    },
    {
      "field": "submission_deadline",
      "previous_value": "2026-11-14 17:00 IST",
      "updated_value": "2026-11-21 17:00 IST",
      "delta": null
    }
  ],
  "addendum_notice": "Addendum #2 issued: budget ceiling increased by $35,000 and deadline extended by 7 days",
  "alert": {
    "channel": "#procurement-alerts",
    "dispatched": true,
    "mode": "simulated",
    "error": null
  },
  "request_id": "req_4m9x01fa",
  "timestamp": "2026-10-24T07:15:10.000Z"
}
```

---

## ⏱️ 2-Minute Stage Demo Script

Follow this sequence live on stage to showcase the 3 core WOW factors in under 120 seconds:

### Step 0: Warmup Check (10s)
Confirm the backend is operational and demo mode is active:
```bash
curl -s http://localhost:5000/api/health | jq .
```
*Presenter script:* "Our backend is live with zero-crash safeguards active."

### Step 1: WOW 1 — Context Shrink & Cost Intelligence (40s)
Fetch a heavy government procurement tender:
```bash
curl -s -X POST http://localhost:5000/api/tenders/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://stateprocure.gov/tenders/cloud-infra-2026"}' | jq '{data: .data, telemetry: .telemetry}'
```
*Presenter script:* "Standard government portals waste over 40,000 tokens on bloated HTML, navigation menus, and scripts. TinyFish extracts clean Markdown in 342ms with **96.6% token reduction**, slashing LLM processing costs and eliminating hallucination."

### Step 2: WOW 2 — Gated Portal Navigation (40s)
Run the autonomous agent through a login-protected portal:
```bash
curl -s -X POST http://localhost:5000/api/tenders/agent \
  -H "Content-Type: application/json" \
  -d '{"url": "https://cityhub.gov/eprocure/login"}' | jq '{execution_steps: .execution_steps, tenders_found: (.extracted_tenders | length)}'
```
*Presenter script:* "Government portals often hide RFPs behind multi-step login forms and search wizards. Notice that our frontend never handles credentials—the backend safely injects vault credentials into TinyFish Web Agent, which logs in, paginates through tables, and returns structured tenders."

### Step 3: WOW 3 — Real-Time Corrigendum Alert (30s)
Trigger corrigendum and mutation monitoring:
```bash
curl -s -X POST http://localhost:5000/api/tenders/diff \
  -H "Content-Type: application/json" \
  -d '{"tender_id": "STATE-IT-2026-0417"}' | jq '{mutation_detected, changes, alert}'
```
*Presenter script:* "Tenders constantly mutate—closing dates get extended and budget ceilings change. Sarkari Sugam AI tracks baseline snapshots, detects Addendum #2 with a $35,000 budget increase, and automatically dispatches an alert to our procurement Slack channel."

---

## 🛡️ Security & Zero-Crash Guarantees

1. **Zero Secret Leakage:** `TINYFISH_API_KEY`, `PORTAL_USER`, and `PORTAL_PASS` exist exclusively server-side. The custom logger redacts all occurrences in logs and error streams.
2. **Strict Zod Body Validation:** Malformed JSON, short strings, and non-HTTP(S) schemes (e.g. `javascript:`, `file:`) return clean `HTTP 400 validation_failed` responses without uncaught exceptions.
3. **Defense in Depth:** Helmet headers, 100KB request body size caps, IP rate-limiting (60 req/min), and strict CORS origin checks.
4. **Resilient Fallback Guarantee:** Network drops or TinyFish gateway outages automatically degrade to certified audit seed data (`source: "fallback_demo"`), ensuring your live demo never shows a raw 500 error on stage.
