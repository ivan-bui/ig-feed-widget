'use client';

import { InstagramPost } from '@/types/instagram';
import Image from 'next/image';

// SVG Icons as components
const PlayIcon = () => (
  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const PlayIconSmall = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const GridIcon = () => (
  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

const GridIconSmall = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

interface PostGridProps {
  posts: InstagramPost[];
  loading: boolean;
  onPostClick: (post: InstagramPost) => void;
}

const PostGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(9)].map((_, i) => (
        <div
          key={i}
          className="aspect-square bg-gray-200 rounded-lg animate-pulse relative overflow-hidden"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      ))}
    </div>
  );
};

const PostCard = ({ 
  post, 
  onClick 
}: { 
  post: InstagramPost; 
  onClick: () => void;
}) => {
  const isVideo = post.media_type === 'VIDEO';
  const isCarousel = post.media_type === 'CAROUSEL_ALBUM';
  const thumbnailUrl = post.thumbnail_url || post.media_url;

  return (
    <div
      onClick={onClick}
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100 transition-transform hover:scale-[1.02]"
    >
      <Image
        src={thumbnailUrl}
        alt={post.caption || 'Instagram post'}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-opacity group-hover:opacity-75"
        loading="lazy"
      />
      
      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {isVideo && (
            <div className="flex items-center gap-2 text-white">
              <PlayIcon />
            </div>
          )}
          {isCarousel && (
            <div className="flex items-center gap-2 text-white">
              <GridIcon />
            </div>
          )}
        </div>
      </div>

      {/* Media type indicator */}
      <div className="absolute top-3 right-3">
        {isVideo && (
          <div className="bg-black/60 rounded-full p-1.5">
            <PlayIconSmall />
          </div>
        )}
        {isCarousel && (
          <div className="bg-black/60 rounded-full p-1.5">
            <GridIconSmall />
          </div>
        )}
      </div>
    </div>
  );
};

export default function PostGrid({ posts, loading, onPostClick }: PostGridProps) {
  if (loading) {
    return <PostGridSkeleton />;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No posts found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onClick={() => onPostClick(post)}
        />
      ))}
    </div>
  );
}
