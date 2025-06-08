const mongoose = require('mongoose');


function createLinkedInPost(owner, asset, type, text) {
    return {
      author: owner,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text
          },
          shareMediaCategory: type.toUpperCase(), // 'IMAGE' or 'VIDEO'
          media: [
            {
              status: 'READY',
              description: {
                text: text
              },
              media: asset,
              title: {
                text: 'Tomcat PVTD Nursery'
              }
            }
          ]
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };
}
  
module.exports = createLinkedInPost;
  