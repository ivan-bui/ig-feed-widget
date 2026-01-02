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
    const apiUrl = `https://graph.facebook.com/v21.0/${userId}/media?fields=${fields}&access_token=${accessToken}&limit=${limit}`;
    
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
             border-radius: 16px;
             background: #f3f4f6;
             box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
             transition: all 0.3s ease;
             text-decoration: none;
           "
           onmouseover="this.style.boxShadow='0 20px 25px rgba(0, 0, 0, 0.15)'"
           onmouseout="this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)'">
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
              padding: 6px;
              backdrop-filter: blur(4px);
            ">
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
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
      margin: 0 auto;
      padding: 16px;
      box-sizing: border-box;
    ">
      <div style="
        margin-bottom: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        <svg width="32" height="32" fill="#e1306c" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
        <h2 style="
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
          margin: 0;
        ">Instagram Feed</h2>
      </div>
      
      ${postsHTML}
    </div>
  `;
}