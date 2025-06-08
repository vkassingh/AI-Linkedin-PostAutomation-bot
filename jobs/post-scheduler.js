// services/postScheduler.js
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const cron = require('node-cron');

class PostScheduler {
  constructor() {
    this.scheduledImages = [];
    this.initializeCloudinary();
  }

  initializeCloudinary() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }

  async fetchImagesFromCloudinary(maxResults = 4) {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        max_results: maxResults,
      });

      console.log('📷 Images found in Cloudinary:', result.resources.map(img => img.public_id));

      this.scheduledImages = await Promise.all(
        result.resources.map(async (img, index) => ({
          url: img.secure_url,
          buffer: await axios.get(img.secure_url, { responseType: 'arraybuffer' })
                           .then(res => Buffer.from(res.data, 'binary')),
          description: `Daily post ${index + 1}/${result.resources.length} - ${new Date().toLocaleDateString()}`,
        }))
      );

      console.log(`✅ Fetched ${this.scheduledImages.length} images from Cloudinary.`);
      return this.scheduledImages;
    } catch (error) {
      console.error('❌ Cloudinary fetch error:', error.message);
      throw error;
    }
  }

  async postToLinkedIn(image) {
    try {
      // Register Upload
      const registerResponse = await axios.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        {
          registerUploadRequest: {
            owner: `urn:li:person:${process.env.LINKEDIN_USER_ID}`,
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            }],
          },
        },
        { headers: { 
          'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
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
          author: `urn:li:person:${process.env.LINKEDIN_USER_ID}`,
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
          'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }}
      );

      console.log(`🚀 Posted to LinkedIn at ${new Date().toLocaleTimeString()}: ${image.description}`);
      return true;
    } catch (error) {
      console.error('❌ LinkedIn post failed:', error.response?.data || error.message);
      return false;
    }
  }

  scheduleDailyPosts(cronTime = '* * * * *', timezone = 'America/New_York') {
    cron.schedule(cronTime, async () => {
      if (this.scheduledImages.length === 0) {
        console.log('ℹ️ No more images to post. Exiting...');
        process.exit(0);
      }

      const image = this.scheduledImages.shift();
      await this.postToLinkedIn(image);

      console.log(`⏰ Next post at scheduled time (${this.scheduledImages.length} remaining)`);
    }, {
      scheduled: true,
      timezone: timezone
    });

    console.log(`⏰ Scheduled posts to run at ${cronTime}`);
  }

  async start() {
    console.log('🔄 Starting LinkedIn automation...');
    try {
      await this.fetchImagesFromCloudinary();
      
      if (this.scheduledImages.length > 0) {
        console.log('⏳ Scheduling posts...');
        this.scheduleDailyPosts();
      } else {
        console.log('❌ No images found! Exiting...');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    }
  }
}

module.exports = new PostScheduler();