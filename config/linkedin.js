require('dotenv').config();
// const LINKEDIN_API_URL = process.env.LINKEDIN_API_URL;

module.exports = {
  linkedin: {
    // clientId: process.env.LINKEDIN_CLIENT_ID,
    // clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    // redirectUri: process.env.LINKEDIN_REDIRECT_URI,
    apiUrl: process.env.LINKEDIN_API_URL,
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
    companyId: process.env.LINKEDIN_COMPANY_ID,
    userId: process.env.LINKEDIN_USER_ID,
    apiUrl: 'https://api.linkedin.com/v2',
    // personUrn: process.env.LINKEDIN_URN,
  },

  // openaiApiKey: process.env.OPENAI_API_KEY,

};