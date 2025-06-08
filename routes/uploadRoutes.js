// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const { uploadMedia } = require('../controllers/uploadController');

router.post('/media', upload.single('file'), uploadMedia);
module.exports = router;
