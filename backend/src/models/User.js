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
      enum: ['PROCUREMENT_OFFICER', 'BIDDER_VENDOR', 'AUDITOR'],
      default: 'PROCUREMENT_OFFICER',
    },
    department: { type: String, default: 'MoRTH National Highways Division' },
    organization: { type: String, default: 'Ministry of Road Transport and Highways' },
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
          data.role || 'PROCUREMENT_OFFICER',
          data.department || 'MoRTH National Highways Division',
          data.organization || 'Ministry of Road Transport and Highways',
        ]
      );
      return wrapPostgresUser(res.rows[0]);
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
    const mongoUser = await MongoUser.findOne({ email: email.toLowerCase().trim() });
    if (!mongoUser) return null;
    mongoUser.password = newPassword;
    await mongoUser.save();
    return mongoUser;
  },
};

export default User;
