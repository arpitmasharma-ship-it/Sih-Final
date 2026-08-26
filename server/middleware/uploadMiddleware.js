const multer = require('multer');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG and WEBP images are allowed'));
    }
    cb(null, true);
  },
});

const uploadImages = upload.array('images', MAX_FILES);
const uploadSingle = upload.single('image');

function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError || err.message?.includes('images are allowed')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
}

module.exports = { uploadImages, uploadSingle, multerErrorHandler, ALLOWED_MIME, MAX_SIZE };
