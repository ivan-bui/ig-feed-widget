export default async function handler(req, res) {
  const { limit = '15', after } = req.query;
  
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const userId = process.env.INSTAGRAM_USER_ID;
    
    if (!accessToken || !userId) {
      return res.status(500).json({ error: 'Instagram credentials not configured' });
    }
    
    // Build URL with optional cursor
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_url,media_type,thumbnail_url}';
    let apiUrl = `https://graph.instagram.com/v24.0/${userId}/media?fields=${fields}&access_token=${accessToken}&limit=${limit}`;
    
    if (after) {
      apiUrl += `&after=${after}`;
    }
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    
    if (!data.data || data.data.length === 0) {
      return res.status(200).json({ posts: [], hasMore: false });
    }
    
    // Return JSON with posts and pagination info
    res.status(200).json({
      posts: data.data,
      hasMore: !!data.paging?.cursors?.after,
      nextCursor: data.paging?.cursors?.after || null
    });
  } catch (error) {
    console.error('Error fetching Instagram:', error);
    res.status(500).json({ error: 'Failed to load Instagram feed' });
  }
}