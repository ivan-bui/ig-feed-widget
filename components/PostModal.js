import { useState, useEffect, useCallback, useRef } from 'react';

export default function PostModal({ post, posts, currentIndex, onClose, onNavigate }) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState(null); // 'next' or 'prev'

  // Touch/swipe handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  // Get carousel items if it's an album
  const carouselItems = post.media_type === 'CAROUSEL_ALBUM' && post.children?.data
    ? post.children.data
    : [post];

  const totalItems = carouselItems.length;
  const hasMultipleItems = totalItems > 1;
  const hasPrevPost = currentIndex > 0;
  const hasNextPost = currentIndex < posts.length - 1;

  // Reset carousel index when post changes
  useEffect(() => {
    setCarouselIndex(0);
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

  // Handle carousel navigation
  const handleCarouselNav = useCallback((newIndex) => {
    if (newIndex < 0) {
      setCarouselIndex(totalItems - 1);
    } else if (newIndex >= totalItems) {
      setCarouselIndex(0);
    } else {
      setCarouselIndex(newIndex);
    }
  }, [totalItems]);

  // Touch handlers for swipe gestures
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

    // Only handle horizontal swipes (ignore if vertical movement is greater)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swipe left - next
        if (hasMultipleItems && carouselIndex < totalItems - 1) {
          handleCarouselNav(carouselIndex + 1);
        } else if (hasNextPost) {
          handleNavigate(currentIndex + 1);
        }
      } else {
        // Swipe right - prev
        if (hasMultipleItems && carouselIndex > 0) {
          handleCarouselNav(carouselIndex - 1);
        } else if (hasPrevPost) {
          handleNavigate(currentIndex - 1);
        }
      }
    }
  }, [hasMultipleItems, carouselIndex, totalItems, handleCarouselNav, hasNextPost, hasPrevPost, handleNavigate, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowLeft':
          if (hasMultipleItems && carouselIndex > 0) {
            handleCarouselNav(carouselIndex - 1);
          } else if (hasPrevPost) {
            handleNavigate(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (hasMultipleItems && carouselIndex < totalItems - 1) {
            handleCarouselNav(carouselIndex + 1);
          } else if (hasNextPost) {
            handleNavigate(currentIndex + 1);
          }
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
  }, [handleClose, handleNavigate, handleCarouselNav, carouselIndex, totalItems, hasMultipleItems, hasPrevPost, hasNextPost, currentIndex]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Get current media item
  const currentItem = carouselItems[carouselIndex];
  const isVideo = currentItem.media_type === 'VIDEO';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
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
        className={`relative w-full h-full flex flex-col items-center justify-center p-4 md:p-16 transition-all duration-200 ${
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
        {/* Media container */}
        <div className="relative max-w-5xl w-full max-h-[70vh] md:max-h-[75vh] flex items-center justify-center">
          {isVideo ? (
            <video
              key={currentItem.id}
              src={currentItem.media_url}
              poster={currentItem.thumbnail_url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[70vh] md:max-h-[75vh] object-contain rounded-sm"
            />
          ) : (
            <img
              key={currentItem.id}
              src={currentItem.media_url}
              alt={post.caption || 'Instagram post'}
              className="max-w-full max-h-[70vh] md:max-h-[75vh] object-contain rounded-sm animate-fadeIn"
            />
          )}

          {/* Carousel navigation arrows (inside media) */}
          {hasMultipleItems && (
            <>
              <button
                onClick={() => handleCarouselNav(carouselIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white/80 hover:text-white transition-all"
                aria-label="Previous image"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => handleCarouselNav(carouselIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white/80 hover:text-white transition-all"
                aria-label="Next image"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Carousel indicators */}
        {hasMultipleItems && (
          <div className="flex items-center gap-2 mt-4">
            {carouselItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleCarouselNav(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === carouselIndex
                    ? 'bg-white w-6'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        )}

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
    </div>
  );
}
