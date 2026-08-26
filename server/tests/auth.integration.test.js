/**
 * Authentication API integration tests.
 * Requires mongodb-memory-server (downloads a throwaway mongod binary on first
 * run). Run with: npm run test:integration
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(hasMemoryServer ? describe : describe.skip)('Auth API', () => {
  let app;
  let mongo;

  beforeAll(async () => {
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lmcc_test_tmp';
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_secret';
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('lmcc_test');
    await require('../config/db')();
    app = require('../app')();
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  test('register -> login -> current-user roundtrip with httpOnly cookie', async () => {
    const email = `t${Date.now()}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email, password: 'Test@12345' });
    expect(reg.status).toBe(201);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Test@12345' });
    expect(login.status).toBe(200);
    const setCookie = login.headers['set-cookie'][0];
    expect(setCookie).toContain('lmcc_token=');
    expect(setCookie.toLowerCase()).toContain('httponly');

    const me = await request(app)
      .get('/api/auth/current-user')
      .set('Cookie', setCookie);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);
  });

  test('protected route rejects without cookie', async () => {
    const res = await request(app).get('/api/auth/current-user');
    expect(res.status).toBe(401);
  });

  test('role authorization enforced on backend', async () => {
    const email = `a${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({ name: 'A', email, password: 'Test@12345' });
    const login = await request(app).post('/api/auth/login').send({ email, password: 'Test@12345' });
    const cookie = login.headers['set-cookie'];

    // Registered public users are ANALYST - creating rules must be forbidden
    const res = await request(app)
      .post('/api/rules')
      .set('Cookie', cookie)
      .send({
        ruleCode: 'LM-TEST-001',
        title: 'x',
        description: 'x',
        category: 'OTHER',
        validationType: 'MANDATORY_FIELD',
        severity: 'LOW',
        sourceReference: 'test',
        version: '1.0.0',
      });
    expect(res.status).toBe(403);
  });

  test('invalid login returns 401 and no cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});
