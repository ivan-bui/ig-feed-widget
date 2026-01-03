import { useState, useEffect, useCallback, useRef } from 'react';

export default function PostModal({ post, posts, currentIndex, onClose, onNavigate }) {
  const [isClosing, setIsClosing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState(null);
  const scrollContainerRef = useRef(null);

  // Touch/swipe handling for post navigation (horizontal swipes only)
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  // Get carousel items if it's an album
  const carouselItems = post.media_type === 'CAROUSEL_ALBUM' && post.children?.data
    ? post.children.data
    : [post];

  const hasMultipleItems = carouselItems.length > 1;
  const hasPrevPost = currentIndex > 0;
  const hasNextPost = currentIndex < posts.length - 1;

  // Reset scroll position when post changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [post.id]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  // Handle post navigation with animation
  const handleNavigate = useCallback((newIndex) => {
    if (newIndex < 0 || newIndex >= posts.length) return;

    setDirection(newIndex > currentIndex ? 'next' : 'prev');
    setIsTransitioning(true);

    setTimeout(() => {
      onNavigate(newIndex);
      setIsTransitioning(false);
    }, 200);
  }, [currentIndex, posts.length, onNavigate]);

  // Touch handlers for horizontal swipe gestures (post navigation only)
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

    // Only handle horizontal swipes for post navigation
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
        case 'ArrowUp':
          if (hasPrevPost) handleNavigate(currentIndex - 1);
          break;
        case 'ArrowDown':
          if (hasNextPost) handleNavigate(currentIndex + 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, handleNavigate, hasPrevPost, hasNextPost, currentIndex]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Render media item (image or video)
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
        alt={post.caption || `Image ${index + 1}`}
        className="w-full h-auto object-contain"
      />
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" />

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 z-50 p-2 text-white/70 hover:text-white transition-colors"
        aria-label="Close"
      >
        <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Post counter */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50 text-white/50 text-sm md:text-base font-light">
        {currentIndex + 1} / {posts.length}
      </div>

      {/* Previous post navigation */}
      {hasPrevPost && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate(currentIndex - 1);
          }}
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
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate(currentIndex + 1);
          }}
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-50 p-3 text-white/50 hover:text-white transition-all hover:scale-110"
          aria-label="Next post"
        >
          <svg className="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main content area */}
      <div
        className={`relative w-full h-full transition-all duration-200 ${
          isTransitioning
            ? direction === 'next'
              ? 'opacity-0 translate-x-8'
              : 'opacity-0 -translate-x-8'
            : 'opacity-100 translate-x-0'
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {hasMultipleItems ? (
          /* Vertical scrolling layout for carousel posts */
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div className="max-w-4xl mx-auto px-4 md:px-16 pt-20 md:pt-24">
              {/* Caption at top */}
              {post.caption && (
                <div className="mb-8 md:mb-12 max-w-2xl mx-auto">
                  <p className="text-white/80 text-sm md:text-base font-light leading-relaxed">
                    {post.caption}
                  </p>
                </div>
              )}

              {/* Carousel images stacked vertically */}
              <div className="space-y-4 md:space-y-6">
                {carouselItems.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="w-full animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {renderMediaItem(item, index)}
                  </div>
                ))}
              </div>

              {/* Footer info */}
              <div className="py-12 md:py-16 flex items-center justify-center gap-4 text-white/40 text-xs md:text-sm">
                <span>
                  {new Date(post.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span>•</span>
                <span>{carouselItems.length} images</span>
                <span>•</span>
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white/70 transition-colors underline underline-offset-2"
                >
                  View on Instagram
                </a>
              </div>
            </div>

            {/* Scroll indicator - shows at bottom when there's more content */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-white/30 animate-bounce">
                <span className="text-xs font-light tracking-wider uppercase">Scroll</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          /* Centered layout for single image/video posts */
          <div className="h-full flex flex-col items-center justify-center p-4 md:p-16">
            {/* Media container */}
            <div className="relative max-w-5xl w-full max-h-[70vh] md:max-h-[75vh] flex items-center justify-center">
              {renderMediaItem(carouselItems[0], 0)}
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="mt-6 md:mt-8 max-w-2xl text-center px-4">
                <p className="text-white/80 text-sm md:text-base font-light leading-relaxed line-clamp-4 md:line-clamp-none">
                  {post.caption}
                </p>
              </div>
            )}

            {/* Post date and link */}
            <div className="mt-4 flex items-center gap-4 text-white/40 text-xs md:text-sm">
              <span>
                {new Date(post.timestamp).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <a
                href={post.permalink}
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
    </div>
  );
}
