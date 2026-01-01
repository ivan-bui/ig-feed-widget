import { useState, useEffect, useRef, useCallback } from 'react';

export default function InstagramFeed() {
    const [posts, setPosts] = useState([]);
    const [displayedPosts, setDisplayedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const observerTarget = useRef(null);

    // Define 5 different layout patterns
    const layoutStyles = [
        { cssClass: 'masonry-item-1', position: 'left' },
        { cssClass: 'masonry-item-2', position: 'right' },
        { cssClass: 'masonry-item-3', position: 'center' },
        { cssClass: 'masonry-item-4', position: 'right' },
        { cssClass: 'masonry-item-5', position: 'left' },
    ];

    const postsPerPage = 5;

    useEffect(() => {
        fetchPosts();
    }, []);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loadingMore && hasMore()) {
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
    }, [loadingMore, page, posts]);

    const fetchPosts = async () => {
        try {
            const response = await fetch('/api/instagram');

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.data || data.data.length === 0) {
                console.warn('⚠️ No posts returned from API');
                throw new Error('No Instagram posts found');
            }

            setPosts(data.data);
            setDisplayedPosts(data.data.slice(0, postsPerPage));
            setPage(1);
            setLoading(false);

        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const loadMorePosts = useCallback(() => {
        if (loadingMore || !hasMore()) return;

        setLoadingMore(true);

        setTimeout(() => {
            const start = page * postsPerPage;
            const end = start + postsPerPage;
            const newPosts = posts.slice(start, end);

            setDisplayedPosts(prev => [...prev, ...newPosts]);
            setPage(prev => prev + 1);
            setLoadingMore(false);
        }, 300);
    }, [page, posts, loadingMore]);

    const hasMore = () => {
        const stillHasMore = displayedPosts.length < posts.length;
        return stillHasMore;
    };

    const getPositionClass = (position) => {
        switch (position) {
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
            <div className='instagram-feed-container'>
                {displayedPosts.map((post, index) => {
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
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    )}
                                    {post.media_type === 'CAROUSEL_ALBUM' && (
                                        <div className="bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 md:px-3 md:py-1 flex items-center gap-1">
                                            <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                                <rect x="14" y="14" width="7" height="7" rx="1" />
                                                <rect x="3" y="14" width="7" height="7" rx="1" />
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
                                        <p className="text-white text-xs md:text-sm lg:text-base line-clamp-2 md:line-clamp-3">
                                            {post.caption}
                                        </p>
                                    </div>
                                </div>

                                {/* Instagram Icon on Hover */}
                                <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-white/90 backdrop-blur-sm rounded-full p-1.5 md:p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <svg className="w-4 h-4 md:w-5 md:h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
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