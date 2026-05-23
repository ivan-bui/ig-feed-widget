import { useState, useEffect, useRef, useCallback } from 'react';
import PostModal from './PostModal';

export default function InstagramFeed({ maxPosts = 50 }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const observerTarget = useRef(null);

  // maxPosts can be:
  // - number (e.g., 30) = hard limit
  // - null or "all" = fetch entire feed
  // - undefined = default to 50
  const maxPostsLimit = maxPosts === 'all' || maxPosts === null ? Infinity : maxPosts;

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

  // Send height updates to parent window for seamless scrolling
  useEffect(() => {
    const sendHeight = () => {
      if (window.parent !== window) {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({ type: 'resize', height }, '*');
      }
    };

    // Send initial height
    sendHeight();

    // Send height after a delay (for images to load)
    const timeouts = [100, 300, 500, 1000, 2000];
    const timeoutIds = timeouts.map(delay => 
      setTimeout(sendHeight, delay)
    );

    // Send height when posts change
    if (!loading && !loadingMore) {
      setTimeout(sendHeight, 100);
    }

    // Send height when images load
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.complete) {
        sendHeight();
      } else {
        img.addEventListener('load', sendHeight);
        img.addEventListener('error', sendHeight);
      }
    });

    // Send height when window resizes
    window.addEventListener('resize', sendHeight);
    
    // Cleanup
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      window.removeEventListener('resize', sendHeight);
      images.forEach(img => {
        img.removeEventListener('load', sendHeight);
        img.removeEventListener('error', sendHeight);
      });
    };
  }, [posts, loading, loadingMore]);

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
    // Check if we've reached the max limit
    if (loadingMore || !hasMore || !nextCursor) return;
    if (posts.length >= maxPostsLimit) {
      setHasMore(false);
      return;
    }
    
    setLoadingMore(true);
    
    try {
      // Calculate how many posts to fetch
      const remainingPosts = maxPostsLimit - posts.length;
      const fetchLimit = Math.min(10, remainingPosts); // Fetch up to 10, but not more than remaining
            
      // Subsequent loads: 10 posts for optimal performance (or less if near limit)
      const response = await fetch(`/api/instagram?limit=${fetchLimit}&after=${nextCursor}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const newPosts = [...posts, ...data.data];
      setPosts(newPosts);
      
      // Check if we've hit the limit or run out of posts
      const reachedLimit = newPosts.length >= maxPostsLimit;
      const noMorePosts = !data.paging?.cursors?.after;
      
      if (reachedLimit) {
        setHasMore(false);
      } else if (noMorePosts) {
        setHasMore(false);
      } else {
        setNextCursor(data.paging.cursors.after);
        setHasMore(true);
      }
      
      setLoadingMore(false);
    } catch (err) {
      setLoadingMore(false);
      setHasMore(false);
    }
  }, [loadingMore, hasMore, nextCursor, posts, maxPostsLimit]);

  const getPositionClass = (position) => {
    switch(position) {
      case 'left': return 'mr-auto';
      case 'right': return 'ml-auto';
      case 'center': return 'mx-auto';
      default: return 'mx-auto';
    }
  };

  // Render skeleton placeholder items
  const renderSkeletonItems = () => {
    const skeletonCount = 6; // Show 6 placeholder items
    return Array.from({ length: skeletonCount }).map((_, index) => {
      const style = layoutStyles[index % layoutStyles.length];
      const positionClass = getPositionClass(style.position);

      return (
        <div key={`skeleton-${index}`} className="w-full inline-block">
          <div
            className={`
              ${style.cssClass}
              ${positionClass}
              relative block overflow-hidden bg-gray-200 animate-pulse
            `}
          >
            {/* Shimmer effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skeleton-shimmer" />
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
        <div className="instagram-feed-container">
          {renderSkeletonItems()}
        </div>
      </div>
    );
  }

  // Fallback profile data - customize these values
  const fallbackProfile = {
    username: process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME || 'theallg.spa',
    displayName: process.env.NEXT_PUBLIC_INSTAGRAM_DISPLAY_NAME || 'The All G Nails & Head Spa',
    avatar: process.env.NEXT_PUBLIC_INSTAGRAM_AVATAR || '/avatar.jpg',
    bio: process.env.NEXT_PUBLIC_INSTAGRAM_BIO || 'Welcome to The All G - your local escape. Famous for our head spa on massage beds',
    // Additional profile fields for dark mode style
    postsCount: process.env.NEXT_PUBLIC_INSTAGRAM_POSTS_COUNT || '241',
    followersCount: process.env.NEXT_PUBLIC_INSTAGRAM_FOLLOWERS_COUNT || '1,464',
    followingCount: process.env.NEXT_PUBLIC_INSTAGRAM_FOLLOWING_COUNT || '167',
    category: process.env.NEXT_PUBLIC_INSTAGRAM_CATEGORY || '',
    location: process.env.NEXT_PUBLIC_INSTAGRAM_LOCATION || '',
    posts: [
      // Add your hardcoded posts here - replace with your actual post data
      // { id: '1', thumbnail: 'https://...', permalink: 'https://instagram.com/p/...', isVideo: false, isCarousel: false },
      { id: '1', thumbnail: '/ig-thumbnail-1.jpg', permalink: 'https://www.instagram.com/theallg.spa/reel/DXsWxbMETqU/', isVideo: false, isCarousel: false },
      { id: '2', thumbnail: '/ig-thumbnail-2.jpg', permalink: 'https://www.instagram.com/theallg.spa/reel/DX53bBOxzJ7/', isVideo: false, isCarousel: false },
      { id: '3', thumbnail: '/ig-thumbnail-3.jpg', permalink: 'https://www.instagram.com/theallg.spa/reel/DV7Sb-YkZrD/', isVideo: false, isCarousel: false },
      { id: '4', thumbnail: '/ig-thumbnail-4.jpg', permalink: 'https://www.instagram.com/theallg.spa/reel/DWXepGLDjni/', isVideo: false, isCarousel: false },
      { id: '5', thumbnail: '/ig-thumbnail-5.jpg', permalink: 'https://www.instagram.com/theallg.spa/reel/DVMxj8dDqN1/', isVideo: false, isCarousel: false },
      { id: '6', thumbnail: '/ig-thumbnail-6.jpg', permalink: 'https://www.instagram.com/theallg.spa/reel/DYQwOunxeSM/', isVideo: false, isCarousel: false }
    ]
  };

  if (error) {
    const profile = fallbackProfile;
    const profileUrl = `https://instagram.com/${profile.username}`;

    // Inline styles for guaranteed rendering
    const styles = {
      container: {
        minHeight: '100vh',
        backgroundColor: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      },
      profileSection: {
        maxWidth: '935px',
        margin: '0 auto',
        padding: '24px 16px',
        width: '100%',
      },
      avatarRing: {
        background: 'linear-gradient(to bottom right, #fbbf24, #ec4899, #9333ea)',
        borderRadius: '50%',
        padding: '3px',
        flexShrink: 0,
      },
      avatarInner: {
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        backgroundColor: '#000',
        padding: '3px',
      },
      avatarImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '50%',
      },
      followBtn: {
        flex: 1,
        padding: '8px 16px',
        backgroundColor: '#0095f6',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'center',
        textDecoration: 'none',
        display: 'block',
      },
      messageBtn: {
        flex: 1,
        padding: '8px 16px',
        backgroundColor: '#363636',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
      },
      iconBtn: {
        padding: '8px 12px',
        backgroundColor: '#363636',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      menuBtn: {
        padding: '4px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer'
      },
      statsRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 0',
        textAlign: 'left'
      },
      header: {
        position: 'sticky',
        top: 0,
        backgroundColor: '#000',
        zIndex: 10,
        borderBottom: '1px solid #262626',
      },
      headerInner: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '935px',
        margin: '0 auto',
        padding: '12px 16px',
      },
      headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      },
      headerBtn: {
        padding: '4px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      headerBackBtn: {
        padding: '4px 4px 4px 0',
        marginLeft: '-4px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      headerTitle: {
        fontSize: '16px',
        fontWeight: 600,
        margin: 0,
      },
    };

    return (
      <div style={styles.container}>

        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div style={styles.headerLeft}>
              <button style={styles.headerBackBtn} onClick={() => window.history.back()}>
                <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 style={styles.headerTitle}>{profile.username}</h1>
            </div>
            <button style={styles.headerBtn}>
              <svg style={{ width: '24px', height: '24px' }} fill="white" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Profile section */}
        <div style={styles.profileSection} className="animate-slide-up">
          {/* Mobile layout */}
          <div className="md:hidden">
            {/* Top row: Avatar + Username */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              {/* Avatar with gradient ring */}
              <div style={{ width: '86px', height: '86px' }}>
                <div style={styles.avatarInner}>
                  <img
                    src={profile.avatar}
                    alt={profile.displayName}
                    style={styles.avatarImg}
                  />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ fontSize: '18px', fontWeight: 400, margin: '5px' }}>{profile.displayName}</h1>
                </div>
                {/* Stats row */}
                <div style={styles.statsRow}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600 }}>{profile.postsCount}</div>
                    <div style={{ color: '#9ca3af', marginLeft: '4px' }}>posts</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600 }}>{profile.followersCount}</div>
                    <div style={{ color: '#9ca3af', marginLeft: '4px' }}>followers</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600 }}>{profile.followingCount}</div>
                    <div style={{ color: '#9ca3af', marginLeft: '4px' }}>following</div>
                  </div>
                </div>
              </div>
              
            </div>

            {/* Display name */}
            {profile.displayName && (
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af', margin: '0 0 4px' }}>{profile.displayName}</p>
            )}

            {/* Category */}
            {profile.category && (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px' }}>{profile.category}</p>
            )}

            {/* Bio */}
            {profile.bio && (
              <p style={{ fontSize: '14px', whiteSpace: 'pre-line', margin: '0 0 8px' }}>{profile.bio}</p>
            )}

            {/* Location */}
            {profile.location && (
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 12px' }}>{profile.location}</p>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.followBtn}
              >
                Follow
              </a>
              <button style={styles.messageBtn}>
                Message
              </button>
              <button style={styles.iconBtn}>
                <svg style={{ width: '16px', height: '16px' }} fill="white" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>
            </div>

          </div>

          {/* Desktop layout */}
          <div className="hidden md:flex" style={{ alignItems: 'flex-start', gap: '32px', marginBottom: '32px' }}>
            {/* Avatar with gradient ring */}
            <div style={{ ...styles.avatarRing, width: '150px', height: '150px', padding: '4px' }}>
              <div style={styles.avatarInner}>
                <img
                  src={profile.avatar}
                  alt={profile.displayName}
                  style={styles.avatarImg}
                />
              </div>
            </div>

            {/* Profile info */}
            <div style={{ flex: 1 }}>
              {/* Username row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 400, margin: 0 }}>{profile.username}</h1>
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...styles.followBtn, flex: 'none', padding: '6px 24px' }}
                >
                  Follow
                </a>
                <button style={{ ...styles.messageBtn, flex: 'none', padding: '6px 24px' }}>
                  Message
                </button>
                <button style={styles.menuBtn}>
                  <svg style={{ width: '24px', height: '24px' }} fill="white" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="2"/>
                    <circle cx="12" cy="12" r="2"/>
                    <circle cx="19" cy="12" r="2"/>
                  </svg>
                </button>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '32px', marginBottom: '16px' }}>
                <span><strong>{profile.postsCount}</strong> posts</span>
                <span><strong>{profile.followersCount}</strong> followers</span>
                <span><strong>{profile.followingCount}</strong> following</span>
              </div>

              {/* Display name */}
              {profile.displayName && (
                <p style={{ fontWeight: 600, fontSize: '14px', color: '#9ca3af', margin: '0 0 4px' }}>{profile.displayName}</p>
              )}

              {/* Category */}
              {profile.category && (
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px' }}>{profile.category}</p>
              )}

              {/* Bio */}
              {profile.bio && (
                <p style={{ fontSize: '14px', whiteSpace: 'pre-line', margin: '0 0 4px' }}>{profile.bio}</p>
              )}

              {/* Location */}
              {profile.location && (
                <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>{profile.location}</p>
              )}
            </div>
          </div>

          {/* Posts grid */}
          {profile.posts.length > 0 && (
            <>
              {/* Tabs */}
              <div style={{ borderTop: '1px solid #262626', display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <div style={{ padding: '16px 0', borderTop: '1px solid #fff', marginTop: '-1px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="9" height="9" rx="1"/>
                    <rect x="13" y="2" width="9" height="9" rx="1"/>
                    <rect x="2" y="13" width="9" height="9" rx="1"/>
                    <rect x="13" y="13" width="9" height="9" rx="1"/>
                  </svg>
                  Posts
                </div>
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {profile.posts.map((post) => (
                  <a
                    key={post.id}
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ aspectRatio: '1', position: 'relative', backgroundColor: '#1a1a1a', display: 'block', overflow: 'hidden' }}
                    className="group"
                  >
                    <img
                      src={post.thumbnail}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg style={{ width: '24px', height: '24px', color: '#fff' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </div>
                    {/* Type indicators */}
                    {(post.isVideo || post.isCarousel) && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                        {post.isVideo && (
                          <svg style={{ width: '20px', height: '20px', color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                        {post.isCarousel && (
                          <svg style={{ width: '20px', height: '20px', color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} fill="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                            <rect x="14" y="14" width="7" height="7" rx="1"/>
                          </svg>
                        )}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </>
          )}

          {/* View more CTA */}
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#0095f6', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}
            >
              View full profile on Instagram
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Notice */}
          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '12px', marginTop: '24px' }}>
            Live feed temporarily unavailable • Showing preview
          </p>
        </div>
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
              <button
                onClick={() => setSelectedPostIndex(index)}
                className={`
                  ${style.cssClass}
                  ${positionClass}
                  group relative block overflow-hidden bg-gray-100 transition-all duration-300 cursor-pointer
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

                {/* Hover Overlay with Caption */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6">
                    <p className="text-white text-xs md:text-sm lg:text-base line-clamp-2 md:line-clamp-3 text-left">
                      {post.caption}
                    </p>
                  </div>
                </div>
              </button>
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

      {/* Post Modal */}
      {selectedPostIndex !== null && (
        <PostModal
          post={posts[selectedPostIndex]}
          posts={posts}
          currentIndex={selectedPostIndex}
          onClose={() => setSelectedPostIndex(null)}
          onNavigate={(newIndex) => setSelectedPostIndex(newIndex)}
        />
      )}
    </div>
  );
}