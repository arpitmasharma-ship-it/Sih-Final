const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config/env');
const { cloudinary } = require('../../config/cloudinary');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

function ensureUploadDir() {
  const dir = path.join(UPLOAD_ROOT, new Date().toISOString().slice(0, 7));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Upload an image buffer.
 * - Cloudinary when configured
 * - local disk under server/uploads otherwise (served statically at /uploads)
 * Returns { url, publicId, provider }
 */
async function uploadImage(buffer, { folder = 'lmcc', filename = 'image.png' } = {}) {
  if (config.cloudinary.enabled) {
    try {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (err, result) => {
            if (err) return reject(err);
            resolve({ url: result.secure_url, publicId: result.public_id, provider: 'cloudinary' });
          }
        );
        stream.end(buffer);
      });
    } catch (err) {
      const detail = err?.http_code ? ` (HTTP ${err.http_code})` : '';
      console.warn(
        '[STORAGE] Cloudinary upload failed, falling back to local disk storage:',
        err?.message + detail || err
      );
    }
  }

  // Local disk + Data URI fallback (guarantees cross-origin visibility even on ephemeral hosts)
  const ext = path.extname(filename) || '.png';
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const dir = ensureUploadDir();
  const filePath = path.join(dir, name);
  await fs.promises.writeFile(filePath, buffer);
  const relUrl = `/uploads/${path.relative(UPLOAD_ROOT, filePath).split(path.sep).join('/')}`;

  const mime = ext.toLowerCase() === '.png' ? 'image/png' : ext.toLowerCase() === '.webp' ? 'image/webp' : 'image/jpeg';
  // If buffer is under 1.8MB, use inline data URL so it displays anywhere without cross-host 404s
  const finalUrl = buffer.length <= 1800000 ? `data:${mime};base64,${buffer.toString('base64')}` : relUrl;

  return { url: finalUrl, publicId: null, provider: 'local' };
}

async function deleteAsset(publicId) {
  if (!publicId || !config.cloudinary.enabled) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.error('Cloudinary destroy failed:', e.message);
  }
}

/** Resolve a stored url to something externally reachable */
function absolutize(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${config.serverBaseUrl.replace(/\/$/, '')}${url}`;
}

module.exports = { uploadImage, deleteAsset, absolutize, UPLOAD_ROOT };
