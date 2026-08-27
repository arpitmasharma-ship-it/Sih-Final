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

const SEED_USERS = [
  {
    name: 'System Administrator',
    email: 'arpita@gmail.com',
    password: 'Arpita123',
    role: 'ADMIN',
    department: 'Legal Metrology HQ',
    state: 'Delhi',
    district: 'New Delhi',
  },
  {
    name: 'Field Inspector',
    email: 'arpiti@gmail.com',
    password: 'Arpiti123',
    role: 'INSPECTOR',
    department: 'Enforcement Wing',
    state: 'Delhi',
    district: 'Central Delhi',
  },
  {
    name: 'Compliance Analyst',
    email: 'arpitaa@gmail.com',
    password: 'Arpita1234',
    role: 'ANALYST',
    department: 'Legal Metrology Intelligence',
    state: 'Delhi',
    district: 'New Delhi',
  },
];

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

  // Upsert seed users
  for (const u of SEED_USERS) {
    let existing = await User.findOne({ email: u.email.toLowerCase() });
    if (!existing) {
      // Check if role exists with old email and update
      existing = await User.findOne({ role: u.role });
    }
    if (!existing) {
      await User.create(u);
      logger.info(`User created [${u.role}]: ${u.email}`);
    } else {
      existing.name = u.name;
      existing.email = u.email;
      existing.password = u.password;
      await existing.save();
      logger.info(`User updated [${u.role}]: ${u.email}`);
    }
  }

  logger.info('');
  logger.info('=== Seed complete ===');
  logger.info('Default logins:');
  logger.info('  Admin:     Arpita@gmail.com  / Arpita123');
  logger.info('  Inspector: Arpiti@gmail.com  / Arpiti123');
  logger.info('  Analyst:   Arpitaa@gmail.com / Arpita1234');
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
