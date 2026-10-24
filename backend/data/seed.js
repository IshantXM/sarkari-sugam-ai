/**
 * High-fidelity seed and demo data for Sarkari Sugam AI
 * Used during DEMO_MODE or as instant fallback if live APIs fail.
 */

export const seedTenders = [
  {
    tender_id: 'STATE-IT-2026-0417',
    issuing_agency: 'State IT Department',
    title: 'State Cloud Infrastructure Modernization & Migration',
    budget_usd: 85000,
    submission_deadline: '2026-11-14 17:00 IST',
    eligibility: 'ISO 27001, 3+ yrs gov experience',
    source_url: 'https://stateprocure.gov/tenders/cloud-infra-2026',
    extraction_confidence: 1.0,
  },
  {
    tender_id: 'MUNI-DC-2026-8812',
    issuing_agency: 'City Municipal Corporation',
    title: 'Municipal Data Center Expansion & Cloud Infrastructure',
    budget_usd: 145000,
    submission_deadline: '2026-12-05 15:00 IST',
    eligibility: 'Tier III Data Center certification, 5+ yrs public sector deployments',
    source_url: 'https://cityhub.gov/eprocure/tender-8812',
    extraction_confidence: 1.0,
  },
];

export const seedSearchResults = [
  {
    title: 'State Cloud Infrastructure Modernization & Migration (RFP-2026-0417)',
    url: 'https://stateprocure.gov/tenders/cloud-infra-2026',
    snippet:
      'Request for Proposals: State IT Department is seeking certified vendors for cloud infrastructure migration, hybrid cloud setup, and managed security services.',
    domain: 'stateprocure.gov',
  },
  {
    title: 'Municipal Data Center Expansion & Cloud Infrastructure',
    url: 'https://cityhub.gov/eprocure/tender-8812',
    snippet:
      'CityHub e-Procurement Portal: Turnkey tender for municipal data center scaling, hyper-converged cloud infrastructure, and backup disaster recovery.',
    domain: 'cityhub.gov',
  },
  {
    title: 'National Highway Surveillance & Traffic AI Automation System',
    url: 'https://nhai.gov.in/tenders/rfp-2026-904',
    snippet:
      'National Highways Authority invites competitive sealed bids for implementation of smart city traffic management and edge computing clusters.',
    domain: 'nhai.gov.in',
  },
];

export const seedTelemetry = {
  raw_tokens: 42840,
  pruned_tokens: 1450,
  compression_ratio: '96.6%',
  latency_ms: 342,
  cost_usd_raw: 0.06426,
  cost_usd_pruned: 0.0029,
  savings_usd: 0.06136,
};

export const seedMarkdown = `# STATE PROCUREMENT PORTAL - NOTICE INVITING TENDER (NIT)

## Tender Overview
* **Tender No / Reference:** STATE-IT-2026-0417
* **Issuing Agency / Department:** State IT Department
* **Project Name:** State Cloud Infrastructure Modernization & Hybrid Cloud Deployment
* **Estimated Cost / Budget:** $85,000 USD (INR 70.8 Lakhs Approx)
* **Closing Date / Last Date of Submission:** 2026-11-14 17:00 IST
* **Bid Opening Date:** 2026-11-15 11:00 IST

## Minimum Eligibility Criteria
1. The bidder must possess active ISO 27001 and ISO 9001 certifications.
2. Minimum 3+ yrs gov experience in deploying enterprise hybrid cloud architectures.
3. Annual turnover not less than $250,000 for the last two financial years.

## Scope of Work
The selected agency will provision virtual compute instances, configure zero-trust network access, establish encrypted automated failover pipelines, and support continuous regulatory compliance.
`;

export const seedAgentSteps = [
  { step: 1, action: 'Navigated to gated portal login page', status: 'done' },
  { step: 2, action: 'Authenticated using server-side vault credentials', status: 'done' },
  { step: 3, action: 'Completed 3-step municipal search wizard', status: 'done' },
  { step: 4, action: 'Paginated to page 2 and found hidden tender PDF links', status: 'done' },
  { step: 5, action: 'Extracted 2 active tenders', status: 'done' },
];

export const seedUpdatedTender = {
  tender_id: 'STATE-IT-2026-0417',
  issuing_agency: 'State IT Department',
  budget_usd: 120000,
  submission_deadline: '2026-11-21 17:00 IST',
  eligibility: 'ISO 27001, 3+ yrs gov experience',
  source_url: 'https://stateprocure.gov/tenders/cloud-infra-2026',
  addendum_notice:
    'Addendum #2 issued: budget ceiling increased by $35,000 and deadline extended by 7 days',
};

export default {
  seedTenders,
  seedSearchResults,
  seedTelemetry,
  seedMarkdown,
  seedAgentSteps,
  seedUpdatedTender,
};
