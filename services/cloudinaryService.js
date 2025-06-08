const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - File buffer (from multer).
 * @param {String} originalName - Original file name for extension detection.
 * @param {String} resourceType - Optional override ('image' or 'video').
 * @returns {Promise<String>} - Secure URL of the uploaded media.
 */
async function uploadToCloudinary(fileBuffer, originalName, resourceType = null) {
  const timestamp = Math.floor(Date.now() / 1000);

  // Auto-detect type if not provided
  const extension = originalName.split('.').pop().toLowerCase();
  if (!resourceType) {
    resourceType = ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension) ? 'video' : 'image';
  }

  const signature = crypto
    .createHash('sha1')
    .update(`timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest('hex');

  const formData = new FormData();
  formData.append('file', fileBuffer, { filename: originalName });
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const response = await axios.post(uploadUrl, formData, {
    headers: formData.getHeaders()
  });

  return response.data.secure_url;
}

module.exports = {
  uploadToCloudinary
};
