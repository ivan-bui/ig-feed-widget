import { useState, useEffect, useCallback, useRef } from 'react';

// Video player with auto-hiding controls
function VideoPlayer({ src, poster, className }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimeoutRef = useRef(null);

  const hideControlsAfterDelay = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => setShowControls(false), 400);
    }
  }, [isPlaying]);

  const handleVideoClick = useCallback((e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      setShowControls(true);
      hideControlsAfterDelay();
    } else {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  }, [hideControlsAfterDelay]);

  const handleInteraction = useCallback(() => {
    setShowControls(true);
    hideControlsAfterDelay();
  }, [hideControlsAfterDelay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('ended', onEnded);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative cursor-pointer"
      onClick={handleVideoClick}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        className={className}
      />
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        style={{ pointerEvents: 'none' }}
      >
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/50 flex items-center justify-center">
          {isPlaying ? (
            <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

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
    const minSwipeDistance = 70; // Reduced for easier navigation
    const swipeRatio = 2.5; // Horizontal distance must be 2.5x vertical distance

    // Require more intentional horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) * swipeRatio && Math.abs(deltaX) > minSwipeDistance) {
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

  // Lock body scroll and prevent touch scroll on body
  useEffect(() => {
    // Store current scroll position
    const scrollY = window.scrollY;

    // Lock body in place to prevent background scrolling
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    // Prevent touchmove on body to stop page scrolling behind modal
    const preventBodyScroll = (e) => {
      // Allow scrolling inside the scroll container for carousel posts
      if (scrollContainerRef.current && scrollContainerRef.current.contains(e.target)) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventBodyScroll, { passive: false });

    return () => {
      // Restore body styles and scroll position
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
      document.removeEventListener('touchmove', preventBodyScroll);
    };
  }, []);

  // Render media item
  const renderMediaItem = (item, index) => {
    const isVideo = item.media_type === 'VIDEO';

    if (isVideo) {
      return (
        <VideoPlayer
          key={item.id || index}
          src={item.media_url}
          poster={item.thumbnail_url}
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


      {/* Main content with slide animation */}
      <div
        className={`relative w-full h-full transition-all duration-250 ease-out ${getSlideClasses()}`}
        onClick={(e) => e.stopPropagation()}
      >
        {hasMultipleItems ? (
          /* Vertical scrolling layout for carousel posts */
          <>
            <div
              ref={scrollContainerRef}
              className="h-full overflow-y-auto scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', overscrollBehavior: 'contain' }}
            >
              <div className="max-w-4xl mx-auto px-4 md:px-16 pt-16 md:pt-20 pb-40 md:pb-48">
                <div className="space-y-4 md:space-y-6">
                  {carouselItems.map((item, index) => (
                    <div key={item.id || index} className="w-full">
                      {renderMediaItem(item, index)}
                    </div>
                  ))}
                </div>

                <div className="py-8 md:py-12 flex items-center justify-center gap-4 text-white/40 text-xs md:text-sm">
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

            {/* Fixed caption at bottom with gradient */}
            {displayedPost.caption && (
              <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
                <div
                  className="pt-24 pb-6 md:pb-8 px-4 md:px-16"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0) 100%)' }}
                >
                  <div className="max-w-2xl mx-auto">
                    <p className="text-white/90 text-sm md:text-base font-light leading-relaxed line-clamp-3 md:line-clamp-4">
                      {displayedPost.caption}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Centered layout for single image/video posts */
          <>
            <div className="h-full flex flex-col items-center justify-center pt-40 px-4 pb-40 md:pt-28 md:px-16 md:pb-48">
              <div className="relative max-w-5xl w-full max-h-[70vh] md:max-h-[75vh] flex items-center justify-center">
                {renderMediaItem(carouselItems[0], 0)}
              </div>

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

            {/* Fixed caption at bottom with gradient */}
            {displayedPost.caption && (
              <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
                <div
                  className="pt-24 pb-6 md:pb-8 px-4 md:px-16"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0) 100%)' }}
                >
                  <div className="max-w-2xl mx-auto">
                    <p className="text-white/90 text-sm md:text-base font-light leading-relaxed line-clamp-3 md:line-clamp-4">
                      {displayedPost.caption}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
