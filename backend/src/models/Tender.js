import mongoose from 'mongoose';
import config from '../../config/env.js';
import { query } from '../db/postgres.js';
import snapshotStore from '../../services/snapshotStore.js';

// Mongoose Tender Schema for MongoDB
const tenderSchema = new mongoose.Schema(
  {
    tender_id: { type: String, required: true, unique: true, trim: true },
    title: { type: String, default: 'Government Procurement Notice' },
    issuing_agency: { type: String, default: 'Public Authority' },
    budget_usd: { type: Number, default: 0 },
    submission_deadline: { type: String, default: 'Open' },
    eligibility: { type: String, default: 'Standard General Conditions' },
    source_url: { type: String, default: '' },
    extraction_confidence: { type: Number, default: 0.85 },
    status: {
      type: String,
      enum: ['MONITORED', 'MUTATION_DETECTED', 'ARCHIVED'],
      default: 'MONITORED',
    },
    saved_by: { type: String, default: 'ishantmohan045@gmail.com' },
    history: [
      {
        detected_at: { type: Date, default: Date.now },
        change_summary: String,
        previous_budget: Number,
        updated_budget: Number,
        previous_deadline: String,
        updated_deadline: String,
      },
    ],
  },
  { timestamps: true }
);

const MongoTender = mongoose.model('Tender', tenderSchema);

// Postgres Tender Wrapper
function wrapPostgresTender(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    tender_id: row.tender_id,
    title: row.title,
    issuing_agency: row.issuing_agency,
    budget_usd: row.budget_usd ? Number(row.budget_usd) : 0,
    submission_deadline: row.submission_deadline,
    eligibility: row.eligibility,
    source_url: row.source_url,
    extraction_confidence: row.extraction_confidence ? Number(row.extraction_confidence) : 0.85,
    status: row.status,
    saved_by: row.saved_by,
    history: Array.isArray(row.history) ? row.history : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    toJSON() {
      return {
        id: row.id,
        _id: row.id,
        tender_id: row.tender_id,
        title: row.title,
        issuing_agency: row.issuing_agency,
        budget_usd: row.budget_usd ? Number(row.budget_usd) : 0,
        submission_deadline: row.submission_deadline,
        eligibility: row.eligibility,
        source_url: row.source_url,
        extraction_confidence: row.extraction_confidence ? Number(row.extraction_confidence) : 0.85,
        status: row.status,
        saved_by: row.saved_by,
        history: Array.isArray(row.history) ? row.history : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },
    toObject() {
      return this.toJSON();
    },
  };
}

export const Tender = {
  find(filter = {}) {
    if (config.databaseType === 'postgresql') {
      let sortField = 'updated_at';
      let sortDirection = 'DESC';
      let limitVal = 50;

      const executor = async () => {
        try {
          const res = await query(
            `SELECT * FROM tenders ORDER BY ${sortField} ${sortDirection} LIMIT ${limitVal}`
          );
          return res.rows.map(wrapPostgresTender);
        } catch {
          return [];
        }
      };

      const chain = {
        sort(sortObj) {
          if (sortObj && sortObj.updatedAt === 1) sortDirection = 'ASC';
          return chain;
        },
        limit(num) {
          limitVal = num;
          return chain;
        },
        then(resolve, reject) {
          return executor().then(resolve, reject);
        },
        catch(reject) {
          return executor().catch(reject);
        },
      };

      return chain;
    }

    if (mongoose.connection.readyState !== 1) {
      let sortDirection = -1;
      let limitVal = 50;
      const executor = async () => {
        let list = [...snapshotStore.list()];
        if (sortDirection === -1) {
          list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        } else {
          list.sort((a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0));
        }
        return list.slice(0, limitVal);
      };

      const chain = {
        sort(sortObj) {
          if (sortObj && sortObj.updatedAt === 1) sortDirection = 1;
          return chain;
        },
        limit(num) {
          limitVal = num;
          return chain;
        },
        then(resolve, reject) {
          return executor().then(resolve, reject);
        },
        catch(reject) {
          return executor().catch(reject);
        },
      };

      return chain;
    }

    return MongoTender.find(filter);
  },

  async findOne(filter) {
    if (config.databaseType === 'postgresql') {
      if (filter.tender_id) {
        const res = await query('SELECT * FROM tenders WHERE tender_id = $1 LIMIT 1', [filter.tender_id]);
        return res.rows.length ? wrapPostgresTender(res.rows[0]) : null;
      }
      return null;
    }

    if (mongoose.connection.readyState !== 1) {
      if (filter.tender_id) {
        return snapshotStore.get(filter.tender_id) || null;
      }
      const list = snapshotStore.list();
      return list.length ? list[0] : null;
    }

    return MongoTender.findOne(filter);
  },

  async create(data) {
    if (config.databaseType === 'postgresql') {
      const res = await query(
        `INSERT INTO tenders (
          tender_id, title, issuing_agency, budget_usd, submission_deadline,
          eligibility, source_url, extraction_confidence, status, saved_by, history
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          data.tender_id,
          data.title || 'Government Procurement Notice',
          data.issuing_agency || 'Public Authority',
          data.budget_usd || 0,
          data.submission_deadline || 'Open',
          data.eligibility || 'Standard General Conditions',
          data.source_url || '',
          data.extraction_confidence || 0.85,
          data.status || 'MONITORED',
          data.saved_by || 'ishantmohan045@gmail.com',
          JSON.stringify(data.history || []),
        ]
      );
      return wrapPostgresTender(res.rows[0]);
    }

    if (mongoose.connection.readyState !== 1) {
      return snapshotStore.save(data);
    }

    return MongoTender.create(data);
  },

  async findOneAndUpdate(filter, update, options = {}) {
    if (config.databaseType === 'postgresql') {
      const tenderId = filter.tender_id;
      if (!tenderId) return null;

      const existingRes = await query('SELECT * FROM tenders WHERE tender_id = $1 LIMIT 1', [tenderId]);
      const existing = existingRes.rows[0];

      const setData = update.$set || update;
      const pushHistory = update.$push && update.$push.history ? update.$push.history : null;

      if (existing) {
        let history = Array.isArray(existing.history) ? existing.history : [];
        if (pushHistory) {
          history = [...history, { ...pushHistory, detected_at: new Date().toISOString() }];
        }

        const title = setData.title !== undefined ? setData.title : existing.title;
        const issuing_agency = setData.issuing_agency !== undefined ? setData.issuing_agency : existing.issuing_agency;
        const budget_usd = setData.budget_usd !== undefined ? setData.budget_usd : existing.budget_usd;
        const submission_deadline =
          setData.submission_deadline !== undefined ? setData.submission_deadline : existing.submission_deadline;
        const eligibility = setData.eligibility !== undefined ? setData.eligibility : existing.eligibility;
        const source_url = setData.source_url !== undefined ? setData.source_url : existing.source_url;
        const extraction_confidence =
          setData.extraction_confidence !== undefined ? setData.extraction_confidence : existing.extraction_confidence;
        const status = setData.status !== undefined ? setData.status : existing.status;
        const saved_by = setData.saved_by !== undefined ? setData.saved_by : existing.saved_by;

        const updateRes = await query(
          `UPDATE tenders SET
            title = $1, issuing_agency = $2, budget_usd = $3,
            submission_deadline = $4, eligibility = $5, source_url = $6,
            extraction_confidence = $7, status = $8, saved_by = $9,
            history = $10, updated_at = NOW()
           WHERE tender_id = $11
           RETURNING *`,
          [
            title,
            issuing_agency,
            budget_usd,
            submission_deadline,
            eligibility,
            source_url,
            extraction_confidence,
            status,
            saved_by,
            JSON.stringify(history),
            tenderId,
          ]
        );
        return wrapPostgresTender(updateRes.rows[0]);
      } else if (options.upsert) {
        const history = pushHistory ? [{ ...pushHistory, detected_at: new Date().toISOString() }] : [];
        return this.create({
          tender_id: tenderId,
          ...setData,
          history,
        });
      }
      return null;
    }

    if (mongoose.connection.readyState !== 1) {
      const tenderId = filter.tender_id;
      if (!tenderId) return null;
      const existing = snapshotStore.get(tenderId) || {};
      const setData = update.$set || update;
      const updated = snapshotStore.save({
        ...existing,
        ...setData,
        tender_id: tenderId,
      });
      return updated;
    }

    return MongoTender.findOneAndUpdate(filter, update, options);
  },

  async countDocuments() {
    if (config.databaseType === 'postgresql') {
      try {
        const res = await query('SELECT COUNT(*) FROM tenders');
        return parseInt(res.rows[0].count, 10);
      } catch {
        return 0;
      }
    }

    if (mongoose.connection.readyState !== 1) {
      return snapshotStore.list().length;
    }

    return MongoTender.countDocuments();
  },
};

export default Tender;
