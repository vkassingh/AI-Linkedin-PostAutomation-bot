const uploadService = require('../services/uploadService');
const cloudinaryService = require('../services/cloudinaryService');

// POST /api/upload/media
exports.uploadMedia = async (req, res) => {
  try {
    const { type, text } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    // Validate file type
    if (!['image', 'video'].includes(type)) {
      return res.status(400).json({ success: false, error: "Invalid file type. Expected 'image' or 'video'." });
    }

    // Validate file size (Example: 50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, error: "File size exceeds the 50MB limit." });
    }

    // Upload to Cloudinary
    const cloudinaryUrl = await cloudinaryService.uploadToCloudinary(
      file.buffer,
      file.originalname, 
      type // use the passed type, or auto-detected type
    );

    // Create LinkedIn post
    const result = await uploadService.handleMediaPost({
      url: cloudinaryUrl,
      type,
      text
    });

    res.status(200).json({
      success: true,
      message: 'Posted to LinkedIn!',
      data: result
    });

  } catch (error) {
    console.error("Error in uploadMedia:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Something went wrong"
    });
  }
};
