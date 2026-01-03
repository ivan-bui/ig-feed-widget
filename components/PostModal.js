import { useState, useEffect, useCallback, useRef } from 'react';

export default function PostModal({ post, posts, currentIndex, onClose, onNavigate }) {
  const [isClosing, setIsClosing] = useState(false);
  const [displayedPost, setDisplayedPost] = useState(post);
  const [displayedIndex, setDisplayedIndex] = useState(currentIndex);
  const [slideState, setSlideState] = useState('center'); // 'center', 'slide-left', 'slide-right', 'enter-from-left', 'enter-from-right'
  const [preloadedPosts, setPreloadedPosts] = useState(new Set());
  const scrollContainerRef = useRef(null);
  const isAnimating = useRef(false);

  // Touch handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  const hasPrevPost = currentIndex > 0;
  const hasNextPost = currentIndex < posts.length - 1;

  // Get carousel items for a post
  const getCarouselItems = useCallback((targetPost) => {
    if (!targetPost) return [];
    return targetPost.media_type === 'CAROUSEL_ALBUM' && targetPost.children?.data
      ? targetPost.children.data
      : [targetPost];
  }, []);

  // Preload images for a post
  const preloadPost = useCallback((targetPost) => {
    if (!targetPost || preloadedPosts.has(targetPost.id)) return Promise.resolve();

    const items = getCarouselItems(targetPost);
    const promises = items.map(item => {
      return new Promise((resolve) => {
        if (item.media_type === 'VIDEO') {
          resolve(); // Videos don't need preloading
        } else {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = item.media_url;
        }
      });
    });

    return Promise.all(promises).then(() => {
      setPreloadedPosts(prev => new Set([...prev, targetPost.id]));
    });
  }, [getCarouselItems, preloadedPosts]);

  // Preload adjacent posts on mount and when index changes
  useEffect(() => {
    const preloadAdjacent = async () => {
      // Preload current post first
      await preloadPost(post);

      // Then preload adjacent
      if (currentIndex > 0) {
        preloadPost(posts[currentIndex - 1]);
      }
      if (currentIndex < posts.length - 1) {
        preloadPost(posts[currentIndex + 1]);
      }
    };
    preloadAdjacent();
  }, [currentIndex, post, posts, preloadPost]);

  // Sync displayed post with current post after animation
  useEffect(() => {
    if (slideState === 'center' && displayedPost.id !== post.id) {
      setDisplayedPost(post);
      setDisplayedIndex(currentIndex);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [slideState, post, currentIndex, displayedPost.id]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  // Handle navigation with smooth slide
  const handleNavigate = useCallback(async (newIndex) => {
    if (newIndex < 0 || newIndex >= posts.length || isAnimating.current) return;

    isAnimating.current = true;
    const targetPost = posts[newIndex];
    const direction = newIndex > currentIndex ? 'next' : 'prev';

    // Ensure target post is preloaded
    await preloadPost(targetPost);

    // Start exit animation
    setSlideState(direction === 'next' ? 'slide-left' : 'slide-right');

    // After exit animation, update post and start enter animation
    setTimeout(() => {
      onNavigate(newIndex);
      setDisplayedPost(targetPost);
      setDisplayedIndex(newIndex);
      setSlideState(direction === 'next' ? 'enter-from-right' : 'enter-from-left');

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      // Complete animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideState('center');
          isAnimating.current = false;

          // Preload the new adjacent post
          if (direction === 'next' && newIndex + 1 < posts.length) {
            preloadPost(posts[newIndex + 1]);
          } else if (direction === 'prev' && newIndex - 1 >= 0) {
            preloadPost(posts[newIndex - 1]);
          }
        });
      });
    }, 250);
  }, [currentIndex, posts, onNavigate, preloadPost]);

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0 && hasNextPost) {
        handleNavigate(currentIndex + 1);
      } else if (deltaX < 0 && hasPrevPost) {
        handleNavigate(currentIndex - 1);
      }
    }
  }, [hasNextPost, hasPrevPost, handleNavigate, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isAnimating.current) return;

      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowLeft':
          if (hasPrevPost) handleNavigate(currentIndex - 1);
          break;
        case 'ArrowRight':
          if (hasNextPost) handleNavigate(currentIndex + 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, handleNavigate, hasPrevPost, hasNextPost, currentIndex]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Render media item
  const renderMediaItem = (item, index) => {
    const isVideo = item.media_type === 'VIDEO';

    if (isVideo) {
      return (
        <video
          key={item.id || index}
          src={item.media_url}
          poster={item.thumbnail_url}
          controls
          playsInline
          className="w-full h-auto object-contain"
        />
      );
    }

    return (
      <img
        key={item.id || index}
        src={item.media_url}
        alt={displayedPost?.caption || `Image ${index + 1}`}
        className="w-full h-auto object-contain"
      />
    );
  };

  const carouselItems = getCarouselItems(displayedPost);
  const hasMultipleItems = carouselItems.length > 1;

  // Get slide animation classes
  const getSlideClasses = () => {
    switch (slideState) {
      case 'slide-left':
        return 'translate-x-[-100%] opacity-0';
      case 'slide-right':
        return 'translate-x-[100%] opacity-0';
      case 'enter-from-left':
        return 'translate-x-[-100%] opacity-0 transition-none';
      case 'enter-from-right':
        return 'translate-x-[100%] opacity-0 transition-none';
      default:
        return 'translate-x-0 opacity-100';
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 pointer-events-none" />

      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        className="absolute top-4 right-4 md:top-8 md:right-8 z-50 p-2 text-white/70 hover:text-white transition-colors"
        aria-label="Close"
      >
        <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Post counter */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50 text-white/50 text-sm md:text-base font-light">
        {displayedIndex + 1} / {posts.length}
      </div>

      {/* Previous post navigation */}
      {hasPrevPost && (
        <button
          onClick={(e) => { e.stopPropagation(); handleNavigate(currentIndex - 1); }}
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-50 p-3 text-white/50 hover:text-white transition-all hover:scale-110"
          aria-label="Previous post"
        >
          <svg className="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next post navigation */}
      {hasNextPost && (
        <button
          onClick={(e) => { e.stopPropagation(); handleNavigate(currentIndex + 1); }}
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-50 p-3 text-white/50 hover:text-white transition-all hover:scale-110"
          aria-label="Next post"
        >
          <svg className="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main content with slide animation */}
      <div
        className={`relative w-full h-full transition-all duration-250 ease-out ${getSlideClasses()}`}
        onClick={(e) => e.stopPropagation()}
      >
        {hasMultipleItems ? (
          /* Vertical scrolling layout for carousel posts */
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="max-w-4xl mx-auto px-4 md:px-16 pt-20 md:pt-24">
              {displayedPost.caption && (
                <div className="mb-8 md:mb-12 max-w-2xl mx-auto">
                  <p className="text-white/80 text-sm md:text-base font-light leading-relaxed">
                    {displayedPost.caption}
                  </p>
                </div>
              )}

              <div className="space-y-4 md:space-y-6">
                {carouselItems.map((item, index) => (
                  <div key={item.id || index} className="w-full">
                    {renderMediaItem(item, index)}
                  </div>
                ))}
              </div>

              <div className="py-12 md:py-16 flex items-center justify-center gap-4 text-white/40 text-xs md:text-sm">
                <span>
                  {new Date(displayedPost.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span>•</span>
                <span>{carouselItems.length} images</span>
                <span>•</span>
                <a
                  href={displayedPost.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white/70 transition-colors underline underline-offset-2"
                >
                  View on Instagram
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* Centered layout for single image/video posts */
          <div className="h-full flex flex-col items-center justify-center p-4 md:p-16">
            <div className="relative max-w-5xl w-full max-h-[70vh] md:max-h-[75vh] flex items-center justify-center">
              {renderMediaItem(carouselItems[0], 0)}
            </div>

            {displayedPost.caption && (
              <div className="mt-6 md:mt-8 max-w-2xl text-center px-4">
                <p className="text-white/80 text-sm md:text-base font-light leading-relaxed line-clamp-4 md:line-clamp-none">
                  {displayedPost.caption}
                </p>
              </div>
            )}

            <div className="mt-4 flex items-center gap-4 text-white/40 text-xs md:text-sm">
              <span>
                {new Date(displayedPost.timestamp).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <a
                href={displayedPost.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/70 transition-colors underline underline-offset-2"
              >
                View on Instagram
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator for carousel posts */}
      {hasMultipleItems && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-white/30 animate-bounce">
            <span className="text-xs font-light tracking-wider uppercase">Scroll</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
