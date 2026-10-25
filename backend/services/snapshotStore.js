const defaultTenders = [
  {
    tender_id: 'NHAI/2026/HW-782',
    title: 'Construction of 6-Lane Access Controlled Highway Section of NH-44',
    issuing_agency: 'National Highways Authority of India (NHAI)',
    budget_usd: 1250000,
    submission_deadline: '15-Dec-2026',
    eligibility: 'Class-1 EPC Highway Contractors with min INR 500 Cr turnover',
    source_url: 'https://eprocure.gov.in/eprocure/app?page=FrontEndTenderDetails&service=page&tn=NHAI-2026-HW-782',
    extraction_confidence: 0.98,
    status: 'MONITORED',
    saved_by: 'ishantmohan045@gmail.com',
    history: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    tender_id: 'CPWD/2026/CIVIL-104',
    title: 'Modernization of Integrated Central Data Center & AI Infrastructure',
    issuing_agency: 'Central Public Works Department (CPWD)',
    budget_usd: 850000,
    submission_deadline: '20-Nov-2026',
    eligibility: 'Certified Tier-3 Data Center System Integrators',
    source_url: 'https://etenders.gov.in/eprocure/app?page=FrontEndTenderDetails&service=page&tn=CPWD-CIVIL-104',
    extraction_confidence: 0.94,
    status: 'MONITORED',
    saved_by: 'ishantmohan045@gmail.com',
    history: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

class SnapshotStore {
  constructor() {
    this.store = new Map();
    for (const t of defaultTenders) {
      this.store.set(t.tender_id, t);
    }
  }

  save(tender) {
    if (!tender || !tender.tender_id) return null;
    const existing = this.store.get(tender.tender_id) || {};
    const updated = {
      ...existing,
      ...tender,
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(tender.tender_id, updated);
    return updated;
  }

  get(tenderId) {
    if (!tenderId) return null;
    return this.store.get(tenderId) || null;
  }

  has(tenderId) {
    return this.store.has(tenderId);
  }

  list() {
    return Array.from(this.store.values());
  }

  getAll() {
    return Array.from(this.store.values());
  }

  reset() {
    this.store.clear();
    for (const t of defaultTenders) {
      this.store.set(t.tender_id, t);
    }
  }
}

export const snapshotStore = new SnapshotStore();
export default snapshotStore;
