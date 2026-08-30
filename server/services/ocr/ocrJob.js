const OcrJob = require('../../models/OcrJob');
const scanService = require('../scan.service');

/**
 * Asynchronous OCR job registry (durable).
 *
 * POST /scan/ocr returns immediately with a jobId; the background OCR pipeline
 * (upload + recognition + field extraction + persistence) runs afterwards. The
 * client polls GET /scan/ocr/:jobId until the job is `completed`.
 *
 * Jobs are persisted to Mongo (OcrJob) so they survive server restarts and
 * ephemeral hosts (Render free tier). A tiny in-memory cache keeps polling fast
 * for hot jobs while falling back to Mongo after restarts.
 *
 * Stale (completed/failed) jobs are cleaned from Mongo after a TTL.
 */

const TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;

// jobId -> { doc, ts }
const cache = new Map();

function cacheSet(doc) {
  const id = doc.jobId || String(doc._id);
  cache.set(id, { doc, ts: Date.now() });
  // Keep cache bounded
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.ts > CACHE_TTL_MS) cache.delete(k);
    }
  }
}

function cacheGet(jobId) {
  const hit = cache.get(jobId);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.doc;
  if (hit) cache.delete(jobId);
  return null;
}

function scheduleCleanup() {
  setInterval(async () => {
    const cutoff = new Date(Date.now() - TTL_MS);
    try {
      await OcrJob.deleteMany({ updatedAt: { $lt: cutoff } });
    } catch (e) {
      /* ignore cleanup errors */
    }
  }, CLEANUP_INTERVAL_MS).unref();
}
scheduleCleanup();

/**
 * Create and start an asynchronous OCR job (persisted to Mongo).
 * @param {Array} files  multer image files
 * @param {object} options { labels, variant, provider }
 * @returns {Promise<{ jobId: string }>}
 */
async function createJob(files, options = {}) {
  const jobId = require('crypto').randomBytes(9).toString('hex');
  const doc = await OcrJob.create({
    jobId,
    status: 'processing',
    progress: 0,
    imagesCount: files.length,
  });
  cacheSet(doc);

  // Fire-and-forget background processing; update the durable record on settle
  scanService
    .processImages(files, options)
    .then((result) =>
      OcrJob.findOneAndUpdate({ jobId }, { status: 'completed', progress: 1, result, error: null }, { new: true })
    )
    .then((updated) => updated && cacheSet(updated))
    .catch(async (err) => {
      const error = err?.message || 'OCR processing failed';
      try {
        const updated = await OcrJob.findOneAndUpdate(
          { jobId },
          { status: 'failed', error },
          { new: true }
        );
        if (updated) cacheSet(updated);
      } catch (e) {
        /* already deleted */
      }
    });

  return { jobId };
}

/**
 * Fetch a job by id (from cache, falling back to Mongo). Returns null if unknown.
 */
async function getJob(jobId) {
  const cached = cacheGet(jobId);
  if (cached) return cached;
  const doc = await OcrJob.findOne({ jobId }).lean();
  if (doc) cacheSet(doc);
  return doc;
}

/**
 * Server stats helper (for /dashboard/system or debugging).
 */
async function stats() {
  try {
    const total = await OcrJob.countDocuments();
    const pending = await OcrJob.countDocuments({
      status: { $in: ['pending', 'processing'] },
    });
    const completed = await OcrJob.countDocuments({ status: 'completed' });
    return { total, pending, completed, ttlMs: TTL_MS, durable: true };
  } catch (e) {
    return { total: 0, pending: 0, completed: 0, ttlMs: TTL_MS, durable: true, error: e.message };
  }
}

module.exports = { createJob, getJob, stats };
