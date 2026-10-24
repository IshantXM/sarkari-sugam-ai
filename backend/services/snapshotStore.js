class SnapshotStore {
  constructor() {
    this.store = new Map();
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
  }
}

export const snapshotStore = new SnapshotStore();
export default snapshotStore;
