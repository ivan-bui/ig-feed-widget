export default async function handler(req, res) {
  const { limit = '30' } = req.query;
  
  // Set headers
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300'); // 5 min cache
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Fetch Instagram data
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const userId = process.env.INSTAGRAM_USER_ID;
    
    if (!accessToken || !userId) {
      return res.status(500).send('<div>Instagram credentials not configured</div>');
    }
    
    // Fetch posts from Instagram API
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
    const apiUrl = `https://graph.instagram.com/v24.0/${userId}/media?fields=${fields}&access_token=${accessToken}&limit=${limit}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).send(`<div>Error: ${data.error.message}</div>`);
    }
    
    if (!data.data || data.data.length === 0) {
      return res.status(200).send('<div>No Instagram posts found</div>');
    }
    
    // Generate HTML
    const html = generateInstagramHTML(data.data);
    
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('<div>Failed to load Instagram feed</div>');
  }
}

function generateInstagramHTML(posts) {
  const layoutStyles = [
    { width: '85%', aspectRatio: '16/9', position: 'left' },
    { width: '75%', aspectRatio: '4/5', position: 'right' },
    { width: '70%', aspectRatio: '1/1', position: 'center' },
    { width: '90%', aspectRatio: '21/9', position: 'right' },
    { width: '65%', aspectRatio: '3/4', position: 'left' },
  ];
  
  const getPositionClass = (position) => {
    switch(position) {
      case 'left': return 'margin-right: auto;';
      case 'right': return 'margin-left: auto;';
      case 'center': return 'margin: 0 auto;';
      default: return 'margin: 0 auto;';
    }
  };
  
  const postsHTML = posts.map((post, index) => {
    const style = layoutStyles[index % layoutStyles.length];
    const positionStyle = getPositionClass(style.position);
    const mediaUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
    
    return `
      <div style="width: 100%; margin-bottom: 80px;">
        <a href="${post.permalink}" 
           target="_blank" 
           rel="noopener noreferrer"
           style="
             display: block;
             position: relative;
             width: ${style.width};
             aspect-ratio: ${style.aspectRatio};
             ${positionStyle}
             overflow: hidden;
             background: #f3f4f6;
             transition: all 0.3s ease;
             text-decoration: none;
           ">
          <img src="${mediaUrl}" 
               alt="${(post.caption || 'Instagram post').replace(/"/g, '&quot;')}"
               style="
                 width: 100%;
                 height: 100%;
                 object-fit: cover;
                 transition: transform 0.5s ease;
               "
               onmouseover="this.style.transform='scale(1.05)'"
               onmouseout="this.style.transform='scale(1)'">
          
          ${post.media_type === 'VIDEO' ? `
            <div style="
              position: absolute;
              top: 12px;
              right: 12px;
              background: rgba(0, 0, 0, 0.7);
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              backdrop-filter: blur(4px);
            ">
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24" style="display: block;">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          ` : ''}
          
          ${post.media_type === 'CAROUSEL_ALBUM' ? `
            <div style="
              position: absolute;
              top: 12px;
              right: 12px;
              background: rgba(0, 0, 0, 0.7);
              border-radius: 20px;
              padding: 4px 12px;
              backdrop-filter: blur(4px);
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span style="color: white; font-size: 12px; font-weight: 500;">•••</span>
            </div>
          ` : ''}
        </a>
      </div>
    `;
  }).join('');
  
  return `
    <div style="
      width: 100%;
      max-width: 1200px;
      margin: 0;
      padding: 16px 0;
      box-sizing: border-box;
    ">
      ${postsHTML}
    </div>
  `;
}