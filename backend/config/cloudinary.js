const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const cloudinaryEnvKeys = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
const missingCloudinaryKeys = cloudinaryEnvKeys.filter(
  (key) => !process.env[key]?.trim()
);

if (missingCloudinaryKeys.length) {
  throw new Error(
    `Missing required Cloudinary configuration: ${missingCloudinaryKeys.join(', ')}.`
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'campusbid',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }],
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const redactUploadError = (value) => {
  let message = String(value || 'Unknown upload error');
  for (const key of ['CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    const secret = process.env[key];
    if (secret) message = message.split(secret).join('[REDACTED]');
  }
  return message;
};

const uploadPhotos = (req, res, next) => {
  upload.array('photos', 5)(req, res, (error) => {
    if (!error) return next();

    const isMulterError = error instanceof multer.MulterError;
    const providerError = error.error || error;
    const providerMessage = redactUploadError(
      providerError.message || error.message
    );
    const providerStatus = Number(
      providerError.http_code || providerError.httpCode || error.http_code
    ) || null;

    console.error('[Upload] Auction photo upload failed', JSON.stringify({
      name: error.name,
      code: error.code || null,
      providerStatus,
      providerMessage,
    }));

    if (isMulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        message: status === 413
          ? 'Each photo must be 5 MB or smaller.'
          : 'Photo upload request is invalid.',
        code: error.code,
      });
    }

    return res.status(502).json({
      message: providerStatus
        ? `Cloudinary rejected the photo upload with HTTP ${providerStatus}. See backend logs for the provider response.`
        : 'Cloudinary could not complete the photo upload. See backend logs for the provider response.',
      code: 'CLOUDINARY_UPLOAD_FAILED',
    });
  });
};

module.exports = { upload, uploadPhotos, cloudinary };
