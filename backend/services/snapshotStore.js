import { seedTenders } from '../data/seed.js';

class SnapshotStore {
  constructor() {
    this.store = new Map();
    // Seed the store with initial mock baselines
    for (const tender of seedTenders) {
      if (tender.tender_id) {
        this.store.set(tender.tender_id, { ...tender, updated_at: new Date().toISOString() });
      }
    }
  }

  save(tender) {
    if (!tender || !tender.tender_id) return null;
    const existing = this.store.get(tender.tender_id) || {};
    const updated = {
      ...existing,
      ...tender,
      updated_at: new Date().toISOString(),
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

  reset() {
    this.store.clear();
    for (const tender of seedTenders) {
      if (tender.tender_id) {
        this.store.set(tender.tender_id, { ...tender, updated_at: new Date().toISOString() });
      }
    }
  }
}

export const snapshotStore = new SnapshotStore();
export default snapshotStore;
