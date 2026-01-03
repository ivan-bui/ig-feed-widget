import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '15';
  const after = searchParams.get('after');
  
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60, s-maxage=60',
    'Access-Control-Allow-Origin': '*',
  };
  
  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const userId = process.env.INSTAGRAM_USER_ID;
    
    if (!accessToken || !userId) {
      return NextResponse.json(
        { error: 'Instagram credentials not configured' },
        { status: 500, headers }
      );
    }
    
    // Build URL with optional cursor - includes children for carousel support
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}';
    let apiUrl = `https://graph.instagram.com/v24.0/${userId}/media?fields=${fields}&access_token=${accessToken}&limit=${limit}`;
    
    if (after) {
      apiUrl += `&after=${after}`;
    }
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json(
        { error: data.error.message },
        { status: 400, headers }
      );
    }
    
    if (!data.data || data.data.length === 0) {
      return NextResponse.json(
        { posts: [], hasMore: false },
        { status: 200, headers }
      );
    }
    
    // Return JSON with posts and pagination info
    return NextResponse.json(
      {
        posts: data.data,
        hasMore: !!data.paging?.cursors?.after,
        nextCursor: data.paging?.cursors?.after || null
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error fetching Instagram:', error);
    return NextResponse.json(
      { error: 'Failed to load Instagram feed' },
      { status: 500, headers }
    );
  }
}