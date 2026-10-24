# Sarkari Sugam AI — Demo Mode Endpoint cURL Verification

**Test Timestamp:** 2026-10-24T09:00:49.315Z
**Environment:** DEMO_MODE=true

---

### 1. GET /api/health

**Command:**
```bash
curl.exe -s http://localhost:5000/api/health
```

**Response Output:**
```json
{
  "ok": true,
  "demo_mode": true,
  "tinyfish_configured": true,
  "portal_credentials_configured": false,
  "slack_configured": false,
  "uptime_seconds": 20,
  "version": "1.0.0",
  "request_id": "req_4q0c67fp",
  "timestamp": "2026-10-24T09:00:49.413Z"
}
```

---

### 2. POST /api/tenders/search

**Command:**
```bash
curl.exe -s -X POST http://localhost:5000/api/tenders/search -H "Content-Type: application/json" -d "{\"query\": \"cloud infrastructure tender\", \"limit\": 5}"
```

**Response Output:**
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
      "snippet": "Request for Proposals: State IT Department is seeking certified vendors for cloud infrastructure migration, hybrid cloud setup, and managed security services.",
      "domain": "stateprocure.gov"
    },
    {
      "title": "Municipal Data Center Expansion & Cloud Infrastructure",
      "url": "https://cityhub.gov/eprocure/tender-8812",
      "snippet": "CityHub e-Procurement Portal: Turnkey tender for municipal data center scaling, hyper-converged cloud infrastructure, and backup disaster recovery.",
      "domain": "cityhub.gov"
    }
  ],
  "request_id": "req_9ugfvdho",
  "timestamp": "2026-10-24T09:00:49.511Z"
}
```

---

### 3. POST /api/tenders/fetch (WOW 1: Context Shrink)

**Command:**
```bash
curl.exe -s -X POST http://localhost:5000/api/tenders/fetch -H "Content-Type: application/json" -d "{\"url\": \"https://stateprocure.gov/tenders/cloud-infra-2026\"}"
```

**Response Output:**
```json
{
  "status": "success",
  "source": "cached_demo",
  "data": {
    "tender_id": "STATE-IT-2026-0417",
    "issuing_agency": "State IT Department",
    "title": "State Cloud Infrastructure Modernization & Migration",
    "budget_usd": 85000,
    "submission_deadline": "2026-11-14 17:00 IST",
    "eligibility": "ISO 27001, 3+ yrs gov experience",
    "source_url": "https://stateprocure.gov/tenders/cloud-infra-2026",
    "extraction_confidence": 1
  },
  "markdown_preview": "# STATE PROCUREMENT PORTAL - NOTICE INVITING TENDER (NIT)\n\n## Tender Overview\n* **Tender No / Reference:** STATE-IT-2026-0417\n* **Issuing Agency / Department:** State IT Department\n* **Project Name:** State Cloud Infrastructure Modernization & Hybrid Cloud Deployment\n* **Estimated Cost / Budget:** $85,000 USD (INR 70.8 Lakhs Approx)\n* **Closing Date / Last Date of Submission:** 2026-11-14 17:00 IST\n* **Bid Opening Date:** 2026-11-15 11:00 IST\n\n## Minimum Eligibility Criteria\n1. The bidder must p",
  "request_id": "req_6fdu2ubv",
  "timestamp": "2026-10-24T09:00:49.605Z"
}
```

---

### 4. POST /api/tenders/agent (WOW 2: Gated Portal Navigation)

**Command:**
```bash
curl.exe -s -X POST http://localhost:5000/api/tenders/agent -H "Content-Type: application/json" -d "{\"url\": \"https://cityhub.gov/eprocure/login\", \"task\": \"Extract active cloud tenders\"}"
```

**Response Output:**
```json
{
  "status": "success",
  "source": "fallback_demo",
  "fallback_reason": "portal credentials not configured",
  "execution_steps": [
    {
      "step": 1,
      "action": "Navigated to gated portal login page",
      "status": "done"
    },
    {
      "step": 2,
      "action": "Authenticated using server-side vault credentials",
      "status": "done"
    },
    {
      "step": 3,
      "action": "Completed 3-step municipal search wizard",
      "status": "done"
    },
    {
      "step": 4,
      "action": "Paginated to page 2 and found hidden tender PDF links",
      "status": "done"
    },
    {
      "step": 5,
      "action": "Extracted 2 active tenders",
      "status": "done"
    }
  ],
  "extracted_tenders": [
    {
      "tender_id": "STATE-IT-2026-0417",
      "issuing_agency": "State IT Department",
      "title": "State Cloud Infrastructure Modernization & Migration",
      "budget_usd": 85000,
      "submission_deadline": "2026-11-14 17:00 IST",
      "eligibility": "ISO 27001, 3+ yrs gov experience",
      "source_url": "https://stateprocure.gov/tenders/cloud-infra-2026",
      "extraction_confidence": 1
    },
    {
      "tender_id": "MUNI-DC-2026-8812",
      "issuing_agency": "City Municipal Corporation",
      "title": "Municipal Data Center Expansion & Cloud Infrastructure",
      "budget_usd": 145000,
      "submission_deadline": "2026-12-05 15:00 IST",
      "eligibility": "Tier III Data Center certification, 5+ yrs public sector deployments",
      "source_url": "https://cityhub.gov/eprocure/tender-8812",
      "extraction_confidence": 1
    }
  ],
  "pages_visited": 2,
  "duration_ms": 1240,
  "request_id": "req_05zf12wb",
  "timestamp": "2026-10-24T09:00:49.679Z"
}
```

---

### 5. POST /api/tenders/diff (WOW 3: Corrigendum / Mutation Alert)

**Command:**
```bash
curl.exe -s -X POST http://localhost:5000/api/tenders/diff -H "Content-Type: application/json" -d "{\"tender_id\": \"STATE-IT-2026-0417\"}"
```

**Response Output:**
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
  "request_id": "req_zlrbjp7k",
  "timestamp": "2026-10-24T09:00:49.756Z"
}
```

---

