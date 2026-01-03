'use client';

import { useState, useEffect } from 'react';
import { InstagramPost } from '@/types/instagram';
import PostGrid from '@/components/PostGrid';
import PostModal from '@/components/PostModal';

export default function Home() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Replace with your actual API endpoint
      const response = await fetch('/api/instagram');
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const data = await response.json();
      setPosts(data.posts || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (post: InstagramPost) => {
    setSelectedPost(post);
    // Update URL without navigation
    window.history.pushState({}, '', `/#post/${post.id}`);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
    // Reset URL
    window.history.pushState({}, '', '/');
  };

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setSelectedPost(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Instagram Feed
          </h1>
          <p className="text-gray-600">
            Latest posts from our Instagram
          </p>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-medium">Error loading posts</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchPosts}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        <PostGrid
          posts={posts}
          loading={loading}
          onPostClick={handlePostClick}
        />

        {selectedPost && (
          <PostModal
            post={selectedPost}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </main>
  );
}
