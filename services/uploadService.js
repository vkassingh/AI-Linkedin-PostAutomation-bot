const axios = require('axios');
const FormData = require('form-data');

const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_USER_ID = process.env.LINKEDIN_USER_ID;

async function registerUpload(type) {
  const owner = `urn:li:person:${LINKEDIN_USER_ID}`;

  const recipe = type === 'video'
    ? 'urn:li:digitalmediaRecipe:feedshare-video'
    : 'urn:li:digitalmediaRecipe:feedshare-image';

  const registerBody = {
    registerUploadRequest: {
      owner,
      recipes: [recipe],
      serviceRelationships: [{
        identifier: 'urn:li:userGeneratedContent',
        relationshipType: 'OWNER'
      }],
      supportedUploadMechanism: ['SYNCHRONOUS_UPLOAD']
    }
  };

  const response = await axios.post(
    `${LINKEDIN_API_URL}/assets?action=registerUpload`,
    registerBody,
    {
      headers: {
        Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const value = response.data.value;
  const uploadMechanism = value.uploadMechanism;
  const asset = value.asset;

  return { uploadMechanism, asset };
}

async function uploadMedia(uploadUrl, mediaBuffer, contentType) {
  const res = await axios.put(uploadUrl, mediaBuffer, {
    headers: {
      'Authorization': undefined, // Must be omitted for LinkedIn upload
      'Content-Type': contentType,
      'Content-Length': mediaBuffer.length
    }
  });

  return res.status === 201 || res.status === 200;
}

async function createPost(type, text, assetUrn) {
  const owner = `urn:li:person:${LINKEDIN_USER_ID}`;

  const postBody = {
    author: owner,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: text
        },
        shareMediaCategory: type.toUpperCase(),
        media: [
          {
            status: 'READY',
            media: assetUrn,
            mediaType: type.toUpperCase()
          }
        ]
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  };

  const response = await axios.post(
    `${LINKEDIN_API_URL}/ugcPosts`,
    postBody,
    {
      headers: {
        Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

async function handleMediaPost({ url, type, text }) {
  // Step 1: Download media (image/video) from Cloudinary
  const mediaRes = await axios.get(url, {
    responseType: 'arraybuffer'
  });

  const mediaBuffer = Buffer.from(mediaRes.data);
  const contentType = mediaRes.headers['content-type']; // dynamic detection

  // Step 2: Register LinkedIn upload
  const { uploadMechanism, asset } = await registerUpload(type);
  const uploadUrl = uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;

  // Step 3: Upload media to LinkedIn
  await uploadMedia(uploadUrl, mediaBuffer, contentType);

  // Step 4: Create LinkedIn post using uploaded asset URN
  const post = await createPost(type, text, asset);
  return post;
}

module.exports = {
  handleMediaPost
};
