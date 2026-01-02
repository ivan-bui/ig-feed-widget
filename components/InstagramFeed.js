import { useState, useEffect, useRef, useCallback } from 'react';

export default function InstagramFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const observerTarget = useRef(null);

  // Define 5 different layout patterns
  const layoutStyles = [
    { cssClass: 'masonry-item-1', position: 'left' },
    { cssClass: 'masonry-item-2', position: 'right' },
    { cssClass: 'masonry-item-3', position: 'center' },
    { cssClass: 'masonry-item-4', position: 'right' },
    { cssClass: 'masonry-item-5', position: 'left' },
  ];

  useEffect(() => {
    fetchInitialPosts();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadingMore, hasMore, nextCursor]);

  const fetchInitialPosts = async () => {
    try {
      // Initial load: 15 posts for fast first paint
      const response = await fetch('/api/instagram?limit=15');
      
      const data = await response.json();
     
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No Instagram posts found');
      }
      
      setPosts(data.data);
      
      // Check if there are more posts
      if (data.paging?.cursors?.after) {
        setNextCursor(data.paging.cursors.after);
        setHasMore(true);
      } else {
        setHasMore(false);
      }
      setLoading(false);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    
    setLoadingMore(true);
    
    try {
      // Subsequent loads: 10 posts for optimal performance
      const response = await fetch(`/api/instagram?limit=10&after=${nextCursor}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setPosts(prev => [...prev, ...data.data]);
      
      // Update pagination info
      if (data.paging?.cursors?.after) {
        setNextCursor(data.paging.cursors.after);
        setHasMore(true);
      } else {
        setHasMore(false);
      }
      
      setLoadingMore(false);

    } catch (err) {
      setLoadingMore(false);
      setHasMore(false);
    }
  }, [loadingMore, hasMore, nextCursor]);

  const getPositionClass = (position) => {
    switch(position) {
      case 'left': return 'mr-auto';
      case 'right': return 'ml-auto';
      case 'center': return 'mx-auto';
      default: return 'mx-auto';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto my-8">
        <p className="text-red-600 font-semibold mb-2">Error loading Instagram feed</p>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
      <div className="instagram-feed-container">
        {posts.map((post, index) => {
          const style = layoutStyles[index % layoutStyles.length];
          const positionClass = getPositionClass(style.position);
          
          return (
            <div key={post.id} className="w-full inline-block">
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  ${style.cssClass}
                  ${positionClass}
                  group relative block overflow-hidden rounded-xl md:rounded-2xl 
                  bg-gray-100 shadow-md md:shadow-lg hover:shadow-xl md:hover:shadow-2xl 
                  transition-all duration-300
                `}
              >
                {/* Media Content */}
                <img
                  src={post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url}
                  alt={post.caption || 'Instagram post'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Media Type Badges */}
                <div className="absolute top-3 right-3 md:top-4 md:right-4">
                  {post.media_type === 'VIDEO' && (
                    <div className="bg-black/70 backdrop-blur-sm rounded-full p-1.5 md:p-2">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  )}
                  {post.media_type === 'CAROUSEL_ALBUM' && (
                    <div className="bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 md:px-3 md:py-1 flex items-center gap-1">
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="14" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                      </svg>
                      <span className="text-white text-xs font-medium">
                        {post.children?.data?.length || '•••'}
                      </span>
                    </div>
                  )}
                </div>
              </a>
            </div>
          );
        })}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-20 flex items-center justify-center mt-8">
        {loadingMore && (
          <div className="flex items-center gap-3 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-pink-500"></div>
            <span className="text-xs md:text-sm">Loading more posts...</span>
          </div>
        )}
      </div>
    </div>
  );
}