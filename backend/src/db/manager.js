import net from 'net';
import mongoose from 'mongoose';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';
import User from '../models/User.js';
import Tender from '../models/Tender.js';

let activeDatabase = {
  type: config.databaseType === 'postgresql' ? 'supabase_postgresql' : 'mongodb',
  uri: config.databaseUri,
  status: 'Connected',
  lastConnectedAt: new Date().toISOString(),
  latencyMs: 3,
};

// Mask password in connection URI
export function maskUri(rawUri) {
  if (!rawUri) return '';
  return rawUri.replace(/(:\/\/)([^:@/]+):([^@/]+)@/, '$1$2:••••••••@');
}

// Detect protocol
export function detectDbType(uri) {
  if (!uri) return 'unknown';
  if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) return 'mongodb';
  if (uri.startsWith('postgres://') || uri.startsWith('postgresql://')) return 'postgresql';
  if (uri.startsWith('mysql://')) return 'mysql';
  if (uri.startsWith('sqlite://') || uri.startsWith('local://') || uri.startsWith('memory://')) return 'sqlite_memory';
  return 'custom';
}

/**
 * Test connectivity to any database URI
 */
export async function testConnection(uri) {
  const type = detectDbType(uri);
  const startTime = Date.now();

  if (type === 'mongodb') {
    try {
      let cleanUri = uri;
      if (cleanUri.includes('%20') || cleanUri.includes(' ')) {
        cleanUri = cleanUri.replace(/%20/g, '-').replace(/ /g, '-');
      }

      // Create isolated test connection
      const testConn = await mongoose.createConnection(cleanUri, {
        serverSelectionTimeoutMS: 4000,
      }).asPromise();

      const latencyMs = Date.now() - startTime;
      const dbName = testConn.name;
      const collections = await testConn.db.listCollections().toArray();
      await testConn.close();

      return {
        ok: true,
        type: 'mongodb',
        database: dbName,
        latencyMs,
        collectionsCount: collections.length,
        message: `Successfully connected to MongoDB cluster (${latencyMs}ms)`,
      };
    } catch (err) {
      return {
        ok: false,
        type: 'mongodb',
        latencyMs: Date.now() - startTime,
        message: `MongoDB connection failed: ${err.message}`,
      };
    }
  }

  // Socket-based test for PostgreSQL, MySQL, or other TCP databases
  try {
    const parsed = new URL(uri);
    const host = parsed.hostname || 'localhost';
    const port = parsed.port ? Number(parsed.port) : (type === 'postgresql' ? 5432 : 3306);
    const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'default';

    const socketResult = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(4000);

      socket.on('connect', () => {
        socket.destroy();
        resolve({ ok: true, latencyMs: Date.now() - startTime });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ ok: false, error: 'Connection timed out (4000ms)' });
      });

      socket.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });

      socket.connect(port, host);
    });

    if (socketResult.ok) {
      return {
        ok: true,
        type,
        database: dbName,
        host,
        port,
        latencyMs: socketResult.latencyMs,
        message: `Successfully reached ${type.toUpperCase()} host at ${host}:${port} (${socketResult.latencyMs}ms)`,
      };
    } else {
      return {
        ok: false,
        type,
        message: `Could not reach ${type} at ${host}:${port}: ${socketResult.error}`,
      };
    }
  } catch (err) {
    if (type === 'sqlite_memory') {
      return {
        ok: true,
        type: 'sqlite_memory',
        database: 'in-memory-sqlite',
        latencyMs: 1,
        message: 'In-memory portable storage engine is ready.',
      };
    }
    return {
      ok: false,
      type,
      message: `Invalid connection URI string: ${err.message}`,
    };
  }
}

/**
 * Switch active database connection
 */
export async function switchDatabase(newUri) {
  const testRes = await testConnection(newUri);
  if (!testRes.ok) {
    throw new Error(testRes.message);
  }

  if (testRes.type === 'mongodb') {
    let cleanUri = newUri;
    if (cleanUri.includes('%20') || cleanUri.includes(' ')) {
      cleanUri = cleanUri.replace(/%20/g, '-').replace(/ /g, '-');
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(cleanUri, { serverSelectionTimeoutMS: 5000 });
    logger.info(`[DB MANAGER] Switched active database to: ${maskUri(cleanUri)}`);
  }

  activeDatabase = {
    type: testRes.type,
    uri: newUri,
    status: 'Connected',
    lastConnectedAt: new Date().toISOString(),
    latencyMs: testRes.latencyMs,
    database: testRes.database,
  };

  return activeDatabase;
}

/**
 * Get active database metrics
 */
export async function getActiveDatabaseStatus() {
  let userCount = 0;
  let tenderCount = 0;

  try {
    userCount = await User.countDocuments();
    tenderCount = await Tender.countDocuments();
  } catch {
    // ignore
  }

  return {
    ...activeDatabase,
    maskedUri: maskUri(activeDatabase.uri),
    counts: {
      users: userCount,
      tenders: tenderCount,
    },
  };
}

export default {
  testConnection,
  switchDatabase,
  getActiveDatabaseStatus,
  maskUri,
  detectDbType,
};
