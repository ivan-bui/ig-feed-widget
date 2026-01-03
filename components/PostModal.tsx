'use client';

import { useState, useEffect } from 'react';
import { InstagramPost } from '@/types/instagram';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Calendar } from 'lucide-react';

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
        <X className="w-6 h-6 text-white" />
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
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={handleNextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6 text-white" />
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
                  <Calendar className="w-3 h-3" />
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
                  <Heart className="w-5 h-5" />
                  <span className="font-medium">{post.like_count.toLocaleString()}</span>
                </div>
              )}
              {post.comments_count !== undefined && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageCircle className="w-5 h-5" />
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
