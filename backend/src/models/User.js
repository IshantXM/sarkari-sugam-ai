import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../../config/env.js';
import { query } from '../db/postgres.js';

// Mongoose User Schema for MongoDB
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      default: 'USER',
    },
    department: { type: String, default: 'General' },
    organization: { type: String, default: 'Government of India' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const MongoUser = mongoose.model('User', userSchema);

// Postgres User Wrapper
function wrapPostgresUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    department: row.department,
    organization: row.organization,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    async comparePassword(candidatePassword) {
      return bcrypt.compare(candidatePassword, row.password);
    },
    toJSON() {
      return {
        id: row.id,
        _id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        department: row.department,
        organization: row.organization,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },
    toObject() {
      return this.toJSON();
    },
  };
}

// In-Memory Fallback Users Store for Offline / Hackathon Demo Execution
const inMemoryUsers = new Map([
  [
    'ishantmohan045@gmail.com',
    {
      id: 'usr_officer_ishant',
      _id: 'usr_officer_ishant',
      name: 'Ishant Mohan',
      email: 'ishantmohan045@gmail.com',
      role: 'PROCUREMENT_OFFICER',
      department: 'MoRTH National Highways Division',
      organization: 'Ministry of Road Transport and Highways',
      passwordHash: null,
      async comparePassword(candidatePassword) {
        if (candidatePassword === 'sugam123') return true;
        if (this.passwordHash) return bcrypt.compare(candidatePassword, this.passwordHash);
        return false;
      },
      toJSON() {
        return {
          id: this.id,
          _id: this._id,
          name: this.name,
          email: this.email,
          role: this.role,
          department: this.department,
          organization: this.organization,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
      toObject() {
        return this.toJSON();
      },
    },
  ],
  [
    'vendor@infra-bidder.in',
    {
      id: 'usr_vendor_epc',
      _id: 'usr_vendor_epc',
      name: 'EPC Consortium Infrastructure',
      email: 'vendor@infra-bidder.in',
      role: 'BIDDER_VENDOR',
      department: 'National Highway Bidders Guild',
      organization: 'L&T - Dilip Buildcon Consortium',
      passwordHash: null,
      async comparePassword(candidatePassword) {
        if (candidatePassword === 'sugam123') return true;
        if (this.passwordHash) return bcrypt.compare(candidatePassword, this.passwordHash);
        return false;
      },
      toJSON() {
        return {
          id: this.id,
          _id: this._id,
          name: this.name,
          email: this.email,
          role: this.role,
          department: this.department,
          organization: this.organization,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
      toObject() {
        return this.toJSON();
      },
    },
  ],
  [
    'auditor@cag.gov.in',
    {
      id: 'usr_auditor_cag',
      _id: 'usr_auditor_cag',
      name: 'Public Auditor CAG',
      email: 'auditor@cag.gov.in',
      role: 'AUDITOR',
      department: 'Comptroller and Auditor General',
      organization: 'Supreme Audit Institution of India',
      passwordHash: null,
      async comparePassword(candidatePassword) {
        if (candidatePassword === 'sugam123') return true;
        if (this.passwordHash) return bcrypt.compare(candidatePassword, this.passwordHash);
        return false;
      },
      toJSON() {
        return {
          id: this.id,
          _id: this._id,
          name: this.name,
          email: this.email,
          role: this.role,
          department: this.department,
          organization: this.organization,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
      toObject() {
        return this.toJSON();
      },
    },
  ],
]);

export const User = {
  async findOne(filter) {
    if (config.databaseType === 'postgresql') {
      if (filter.email) {
        const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [filter.email.trim()]);
        return res.rows.length ? wrapPostgresUser(res.rows[0]) : null;
      }
      if (filter.id || filter._id) {
        return this.findById(filter.id || filter._id);
      }
      return null;
    }

    if (mongoose.connection.readyState !== 1) {
      if (filter.email) {
        return inMemoryUsers.get(filter.email.toLowerCase().trim()) || null;
      }
      if (filter.id || filter._id) {
        const targetId = filter.id || filter._id;
        for (const u of inMemoryUsers.values()) {
          if (u.id === targetId || u._id === targetId) return u;
        }
      }
      return null;
    }

    return MongoUser.findOne(filter);
  },

  async findById(id) {
    if (config.databaseType === 'postgresql') {
      try {
        const res = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
        return res.rows.length ? wrapPostgresUser(res.rows[0]) : null;
      } catch {
        return null;
      }
    }

    if (mongoose.connection.readyState !== 1) {
      for (const u of inMemoryUsers.values()) {
        if (u.id === id || u._id === id) return u;
      }
      return null;
    }

    return MongoUser.findById(id);
  },

  async create(data) {
    if (config.databaseType === 'postgresql') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password, salt);
      const res = await query(
        `INSERT INTO users (name, email, password, role, department, organization)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.name,
          data.email.toLowerCase().trim(),
          hashedPassword,
          data.role || 'USER',
          data.department || 'General',
          data.organization || 'Government of India',
        ]
      );
      return wrapPostgresUser(res.rows[0]);
    }

    if (mongoose.connection.readyState !== 1) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password, salt);
      const newUser = {
        id: `usr_${Date.now()}`,
        _id: `usr_${Date.now()}`,
        name: data.name,
        email: data.email.toLowerCase().trim(),
        role: data.role || 'PROCUREMENT_OFFICER',
        department: data.department || 'MoRTH National Highways Division',
        organization: data.organization || 'Ministry of Road Transport and Highways',
        passwordHash: hashedPassword,
        async comparePassword(candidatePassword) {
          return bcrypt.compare(candidatePassword, this.passwordHash);
        },
        toJSON() {
          return {
            id: this.id,
            _id: this._id,
            name: this.name,
            email: this.email,
            role: this.role,
            department: this.department,
            organization: this.organization,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        },
        toObject() {
          return this.toJSON();
        },
      };
      inMemoryUsers.set(newUser.email, newUser);
      return newUser;
    }

    return MongoUser.create(data);
  },

  async countDocuments() {
    if (config.databaseType === 'postgresql') {
      try {
        const res = await query('SELECT COUNT(*) FROM users');
        return parseInt(res.rows[0].count, 10);
      } catch {
        return 0;
      }
    }

    if (mongoose.connection.readyState !== 1) {
      return inMemoryUsers.size;
    }

    return MongoUser.countDocuments();
  },

  async updatePassword(email, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    if (config.databaseType === 'postgresql') {
      const res = await query(
        `UPDATE users SET password = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2) RETURNING *`,
        [hashedPassword, email.trim()]
      );
      return res.rows.length ? wrapPostgresUser(res.rows[0]) : null;
    }

    if (mongoose.connection.readyState !== 1) {
      const u = inMemoryUsers.get(email.toLowerCase().trim());
      if (!u) return null;
      u.passwordHash = hashedPassword;
      return u;
    }

    const mongoUser = await MongoUser.findOne({ email: email.toLowerCase().trim() });
    if (!mongoUser) return null;
    mongoUser.password = newPassword;
    await mongoUser.save();
    return mongoUser;
  },
};

export default User;
