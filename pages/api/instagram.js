export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  const after = req.query.after; // Pagination cursor
  const limit = req.query.limit || 15; // Default to 15
  
  if (!accessToken || !userId) {
    return res.status(500).json({ error: 'Missing Instagram credentials' });
  }

  try {
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_url,media_type,thumbnail_url}';
    
    // Build URL with pagination support
    let url = `https://graph.instagram.com/v24.0/${userId}/media?fields=${fields}&access_token=${accessToken}&limit=${limit}`;
    
    // Add cursor for pagination
    if (after) {
      url += `&after=${after}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    
    // Return data with pagination info
    res.status(200).json({
      data: data.data,
      paging: data.paging || {} // Includes "next" and "previous" cursors
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Instagram posts' });
  }
}