'use client';

import { useState, useEffect } from 'react';
import { InstagramPost } from '@/types/instagram';
import Image from 'next/image';

// SVG Icons as components
const XIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const ChevronLeftIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
  </svg>
);

const ChevronRightIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
  </svg>
);

const HeartIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

const MessageCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
  </svg>
);

const CalendarIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
  </svg>
);

interface PostModalProps {
  post: InstagramPost;
  onClose: () => void;
}

export default function PostModal({ post, onClose }: PostModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const isCarousel = post.media_type === 'CAROUSEL_ALBUM';
  const carouselItems = post.children?.data || [];
  const totalSlides = isCarousel ? carouselItems.length : 1;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderMedia = () => {
    if (isCarousel && carouselItems.length > 0) {
      const item = carouselItems[currentSlide];
      
      if (item.media_type === 'VIDEO') {
        return (
          <video
            key={item.id}
            src={item.media_url}
            controls
            className="w-full h-full object-contain"
            autoPlay
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        );
      }

      return (
        <Image
          key={item.id}
          src={item.media_url}
          alt={`Slide ${currentSlide + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain"
          priority
        />
      );
    }

    if (post.media_type === 'VIDEO') {
      return (
        <video
          src={post.media_url}
          controls
          className="w-full h-full object-contain"
          autoPlay
          playsInline
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <Image
        src={post.media_url}
        alt={post.caption || 'Instagram post'}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-contain"
        priority
      />
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <XIcon className="w-6 h-6 text-white" />
      </button>

      {/* Main content */}
      <div
        className="relative w-full max-w-6xl h-[90vh] flex flex-col lg:flex-row gap-0 bg-black rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media section */}
        <div className="relative flex-1 bg-black flex items-center justify-center">
          {renderMedia()}

          {/* Carousel navigation */}
          {isCarousel && totalSlides > 1 && (
            <>
              <button
                onClick={handlePrevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeftIcon className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={handleNextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Next slide"
              >
                <ChevronRightIcon className="w-6 h-6 text-white" />
              </button>

              {/* Slide indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {carouselItems.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide
                        ? 'bg-white w-8'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Details sidebar */}
        <div className="w-full lg:w-96 bg-white flex flex-col max-h-[40vh] lg:max-h-none">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {post.username?.[0]?.toUpperCase() || 'IG'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {post.username || 'Instagram'}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <CalendarIcon className="w-3 h-3" />
                  <span>{formatDate(post.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Caption and details */}
          <div className="flex-1 overflow-y-auto p-4">
            {post.caption && (
              <div className="mb-4">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {post.caption}
                </p>
              </div>
            )}

            {/* Engagement stats */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
              {post.like_count !== undefined && (
                <div className="flex items-center gap-2 text-gray-600">
                  <HeartIcon className="w-5 h-5" />
                  <span className="font-medium">{post.like_count.toLocaleString()}</span>
                </div>
              )}
              {post.comments_count !== undefined && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageCircleIcon className="w-5 h-5" />
                  <span className="font-medium">{post.comments_count.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer with view on Instagram link */}
          <div className="p-4 border-t border-gray-200">
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              View on Instagram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
