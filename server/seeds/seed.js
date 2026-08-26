/**
 * Database seeder.
 *   npm run seed            -> upsert admin user + compliance rules
 *   node seeds/seed.js --fresh  -> wipe collections first
 *
 * Creates:
 *  - 1 admin account (only admin that will ever exist)
 *  - 13 official LMPC compliance rules
 *
 * All products, inspections, and other users are created through the application.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { syncRulesFromSeed } = require('../services/compliance/ruleService');
const User = require('../models/User');
const Product = require('../models/Product');
const Inspection = require('../models/Inspection');
const OcrResult = require('../models/OcrResult');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Report = require('../models/Report');
const Counter = require('../models/Counter');
const logger = require('../utils/logger');

const ADMIN = {
  name: 'System Administrator',
  email: 'admin@lmcc.gov.in',
  password: 'Admin@1234',
  role: 'ADMIN',
  department: 'Legal Metrology HQ',
  state: 'Delhi',
  district: 'New Delhi',
};

async function main() {
  const fresh = process.argv.includes('--fresh');
  await connectDB();

  if (fresh) {
    logger.warn('--fresh: dropping all collections...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Inspection.deleteMany({}),
      OcrResult.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      Report.deleteMany({}),
      Counter.deleteMany({}),
    ]);
  }

  // Sync compliance rules from seed data
  const rulesUpserted = await syncRulesFromSeed();
  logger.info(`Rules synced: ${rulesUpserted}`);

  // Upsert admin user (never overwrite password if already exists)
  const existing = await User.findOne({ email: ADMIN.email });
  if (!existing) {
    await User.create(ADMIN);
    logger.info(`Admin created: ${ADMIN.email}`);
  } else {
    logger.info(`Admin already exists: ${ADMIN.email} (skipping)`);
  }

  logger.info('');
  logger.info('=== Seed complete ===');
  logger.info('Admin login:');
  logger.info(`  Email:    ${ADMIN.email}`);
  logger.info(`  Password: ${ADMIN.password}`);
  logger.info('');
  logger.info('Next steps:');
  logger.info('  1. Log in as admin');
  logger.info('  2. Go to User Management to create Inspector/Analyst accounts');
  logger.info('  3. Go to Scanner to perform real product inspections');

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
