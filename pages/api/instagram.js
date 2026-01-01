export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  
  if (!accessToken || !userId) {
    return res.status(500).json({ error: 'Missing Instagram credentials' });
  }

  try {
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
    const url = `https://graph.instagram.com/v24.0/${userId}/media?fields=${fields}&access_token=${accessToken}&limit=15`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Instagram posts' });
  }
}