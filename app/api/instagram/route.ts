import { NextResponse } from 'next/server';
import { InstagramPost } from '@/types/instagram';

// This is a sample API route. Replace with your actual Instagram API implementation
export async function GET() {
  try {
    // Replace these with your actual Instagram Graph API credentials
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const userId = process.env.INSTAGRAM_USER_ID;

    if (!accessToken || !userId) {
      throw new Error('Instagram credentials not configured');
    }

    // Instagram Graph API endpoint - matches your existing embed-html.js format
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}';
    const url = `https://graph.instagram.com/v21.0/${userId}/media?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      posts: data.data as InstagramPost[],
      paging: data.paging
    });

  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    
    // Return mock data for development
    return NextResponse.json({
      posts: getMockPosts()
    });
  }
}

// Mock data for development/testing
function getMockPosts(): InstagramPost[] {
  return [
    {
      id: '1',
      media_type: 'IMAGE',
      media_url: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba',
      permalink: 'https://instagram.com/p/example1',
      caption: 'Beautiful sunset view from the mountains 🌄 #nature #photography',
      timestamp: '2024-01-15T10:30:00Z',
      username: 'your_account',
      like_count: 1234,
      comments_count: 56
    },
    {
      id: '2',
      media_type: 'VIDEO',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnail_url: 'https://images.unsplash.com/photo-1682687221038-404cb8830901',
      permalink: 'https://instagram.com/p/example2',
      caption: 'Check out this amazing video! 🎥',
      timestamp: '2024-01-14T15:20:00Z',
      username: 'your_account',
      like_count: 2345,
      comments_count: 89
    },
    {
      id: '3',
      media_type: 'CAROUSEL_ALBUM',
      media_url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538',
      permalink: 'https://instagram.com/p/example3',
      caption: 'Swipe through for more amazing shots! 📸✨',
      timestamp: '2024-01-13T09:15:00Z',
      username: 'your_account',
      like_count: 3456,
      comments_count: 123,
      children: {
        data: [
          {
            id: '3-1',
            media_type: 'IMAGE',
            media_url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538'
          },
          {
            id: '3-2',
            media_type: 'IMAGE',
            media_url: 'https://images.unsplash.com/photo-1682687221038-404cb8830901'
          },
          {
            id: '3-3',
            media_type: 'VIDEO',
            media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail_url: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba'
          }
        ]
      }
    },
    {
      id: '4',
      media_type: 'IMAGE',
      media_url: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714',
      permalink: 'https://instagram.com/p/example4',
      caption: 'Urban exploration 🏙️',
      timestamp: '2024-01-12T18:45:00Z',
      username: 'your_account',
      like_count: 987,
      comments_count: 34
    },
    {
      id: '5',
      media_type: 'IMAGE',
      media_url: 'https://images.unsplash.com/photo-1682687982107-14492010e05e',
      permalink: 'https://instagram.com/p/example5',
      caption: 'Golden hour magic ✨',
      timestamp: '2024-01-11T17:30:00Z',
      username: 'your_account',
      like_count: 1567,
      comments_count: 67
    },
    {
      id: '6',
      media_type: 'IMAGE',
      media_url: 'https://images.unsplash.com/photo-1682687220795-796d3f6f7000',
      permalink: 'https://instagram.com/p/example6',
      caption: 'Weekend vibes 🌊',
      timestamp: '2024-01-10T12:00:00Z',
      username: 'your_account',
      like_count: 2109,
      comments_count: 78
    }
  ];
}
