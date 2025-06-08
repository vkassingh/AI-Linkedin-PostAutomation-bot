const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const cron = require('node-cron');

require('dotenv').config();


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// LinkedIn API Credentials
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN; 
const LINKEDIN_PROFILE_ID = process.env.LINKEDIN_USER_ID; 

let scheduledImages = [];

// --- Step 1: Fetch 4 images from Cloudinary ---
async function fetchImagesFromCloudinary() {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 4,
    });

    console.log('📷 Images found in Cloudinary:', result.resources.map(img => img.public_id));

    scheduledImages = await Promise.all(
      result.resources.map(async (img, index) => ({
        url: img.secure_url,
        buffer: await axios.get(img.secure_url, { responseType: 'arraybuffer' })
                         .then(res => Buffer.from(res.data, 'binary')),
        description: `Daily post ${index + 1}/${result.resources.length} - ${new Date().toLocaleDateString()}`,
      }))
    );

    console.log(`✅ Fetched ${scheduledImages.length} images from Cloudinary.`);
  } catch (error) {
    console.error('❌ Cloudinary fetch error:', error.message);
    process.exit(1); // Exit if we can't fetch images
  }
}

// --- Step 2: Upload to LinkedIn API ---
async function postToLinkedIn(image) {
  try {
    // Register Upload
    const registerResponse = await axios.post(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      {
        registerUploadRequest: {
          owner: `urn:li:person:${LINKEDIN_PROFILE_ID}`,
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          }],
        },
      },
      { headers: { 
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'X-Restli-Protocol-Version': '2.0.0' 
      }}
    );

    const uploadUrl = registerResponse.data.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ].uploadUrl;

    // Upload Image
    await axios.put(uploadUrl, image.buffer, {
      headers: { 'Content-Type': 'image/jpeg' },
    });

    // Create Post
    await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: `urn:li:person:${LINKEDIN_PROFILE_ID}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: image.description },
            shareMediaCategory: 'IMAGE',
            media: [{ 
              status: 'READY', 
              media: registerResponse.data.value.asset 
            }],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      },
      { headers: { 
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }}
    );

    console.log(`🚀 Posted to LinkedIn at ${new Date().toLocaleTimeString()}: ${image.description}`);
  } catch (error) {
    console.error('❌ LinkedIn post failed:', error.response?.data || error.message);
  }
}

// --- Step 3: Schedule Daily Posts at 5:53 PM ---
function scheduleDailyPosts() {
  // Run daily at 5:53 PM
  cron.schedule('* * * * *', async () => {
    if (scheduledImages.length === 0) {
      console.log('ℹ️ No more images to post. Exiting...');
      process.exit(0);
    }

    const image = scheduledImages.shift();
    await postToLinkedIn(image);

    console.log(`⏰ Next post tomorrow at 5:53 PM (${scheduledImages.length} remaining)`);
  }, {
    scheduled: true,
    timezone: "America/New_York" // Set your timezone
  });

  console.log('⏰ Scheduled 1 post/day at 5:53 PM');
}

// --- Initialize ---
(async () => {
  console.log('🔄 Starting LinkedIn automation...');
  await fetchImagesFromCloudinary();
  
  if (scheduledImages.length > 0) {
    console.log(`⏳ First post will run in one minute...`);
    scheduleDailyPosts();
  } else {
    console.log('❌ No images found! Exiting...');
    process.exit(1);
  }
})();