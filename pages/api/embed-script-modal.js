export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scriptContent = `
(function() {
  'use strict';
  
9  const API_BASE = 'https://ig-feed-widget-git-main-ivan-buis-projects-de7fae49.vercel.app';
    
  const containers = document.querySelectorAll('[data-ig-feed]');
  
  if (containers.length === 0) {
    console.warn('Instagram Widget: No containers found');
    return;
  }
  
  containers.forEach(function(container, containerIndex) {
    const initialLimit = container.getAttribute('data-max-posts') || '15';
    
    // State
    let isLoading = false;
    let hasMore = true;
    let nextCursor = null;
    let postsContainer = null;
    let loadingIndicator = null;
    let observer = null;
    let allPosts = []; // Store all loaded posts for modal
    
    // Layout styles for masonry
    const layoutStyles = [
      { width: '85%', aspectRatio: '16/9', position: 'left' },
      { width: '75%', aspectRatio: '4/5', position: 'right' },
      { width: '70%', aspectRatio: '1/1', position: 'center' },
      { width: '90%', aspectRatio: '21/9', position: 'right' },
      { width: '65%', aspectRatio: '3/4', position: 'left' },
    ];
    
    // Initialize
    init();
    
    function init() {
      // Inject modal styles
      injectStyles();
      
      // Create main container
      const mainContainer = document.createElement('div');
      mainContainer.style.cssText = 'width: 100%; max-width: 1200px; margin: 0 auto; padding: 0; box-sizing: border-box;';
      
      // Create posts container
      postsContainer = document.createElement('div');
      postsContainer.style.cssText = 'width: 100%;';
      mainContainer.appendChild(postsContainer);
      
      // Create loading indicator
      loadingIndicator = createLoadingIndicator();
      mainContainer.appendChild(loadingIndicator);
      
      // Create scroll trigger
      const scrollTrigger = document.createElement('div');
      scrollTrigger.id = 'ig-scroll-trigger-' + containerIndex;
      scrollTrigger.style.cssText = 'height: 1px; width: 100%;';
      mainContainer.appendChild(scrollTrigger);
      
      container.innerHTML = '';
      container.appendChild(mainContainer);
      
      // Setup intersection observer
      observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMorePosts();
        }
      }, { rootMargin: '200px' });
      
      observer.observe(scrollTrigger);
      
      // Load initial posts
      loadMorePosts(true);
    }
    
    function injectStyles() {
      if (document.getElementById('ig-modal-styles-' + containerIndex)) return;
      
      const style = document.createElement('style');
      style.id = 'ig-modal-styles-' + containerIndex;
      style.textContent = \`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .ig-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .ig-modal-overlay.active {
          opacity: 1;
        }
        
        .ig-modal-content {
          position: relative;
          width: 100%;
          max-width: 1200px;
          max-height: 90vh;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transform: scale(0.95);
          transition: transform 0.3s ease;
        }
        
        .ig-modal-overlay.active .ig-modal-content {
          transform: scale(1);
        }
        
        @media (min-width: 1024px) {
          .ig-modal-content {
            flex-direction: row;
          }
        }
        
        .ig-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        
        .ig-modal-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .ig-modal-media {
          flex: 1;
          background: #000;
          display: flex;
          align-items: center;
          justify-center;
          position: relative;
          min-height: 300px;
        }
        
        .ig-modal-media img,
        .ig-modal-media video {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        
        .ig-modal-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        
        .ig-modal-nav:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .ig-modal-nav.prev {
          left: 16px;
        }
        
        .ig-modal-nav.next {
          right: 16px;
        }
        
        .ig-modal-indicators {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }
        
        .ig-modal-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
          padding: 0;
          transition: all 0.3s;
        }
        
        .ig-modal-indicator.active {
          width: 32px;
          background: white;
        }
        
        .ig-modal-sidebar {
          width: 100%;
          max-height: 40vh;
          overflow-y: auto;
          background: white;
        }
        
        @media (min-width: 1024px) {
          .ig-modal-sidebar {
            width: 384px;
            max-height: none;
          }
        }
        
        .ig-modal-header {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .ig-modal-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }
        
        .ig-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        
        .ig-modal-caption {
          color: #1f2937;
          line-height: 1.6;
          white-space: pre-wrap;
          margin-bottom: 16px;
        }
        
        .ig-modal-stats {
          display: flex;
          gap: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
        }
        
        .ig-modal-stat {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .ig-modal-footer {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
        }
        
        .ig-modal-link {
          display: block;
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          color: white;
          text-align: center;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 500;
          transition: opacity 0.2s;
        }
        
        .ig-modal-link:hover {
          opacity: 0.9;
        }
      \`;
      document.head.appendChild(style);
    }
    
    function createLoadingIndicator() {
      const indicator = document.createElement('div');
      indicator.style.cssText = 'display: none; text-align: center; padding: 40px; color: #999;';
      indicator.innerHTML = \`
        <div style="display: inline-block; width: 32px; height: 32px; border: 3px solid #f3f3f3; border-top: 3px solid #595959; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 12px; font-size: 14px;">Loading...</p>
      \`;
      return indicator;
    }
    
    function loadMorePosts(isInitial) {
      if (isLoading) return;
      
      isLoading = true;
      loadingIndicator.style.display = 'block';
      
      const limit = isInitial ? initialLimit : '10';
      let url = API_BASE + '/api/embed-html?limit=' + limit;
      
      if (nextCursor) {
        url += '&after=' + encodeURIComponent(nextCursor);
      }
            
      fetch(url)
        .then(function(response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .then(function(data) {
          if (!data.posts || data.posts.length === 0) {
            hasMore = false;
            loadingIndicator.style.display = 'none';
            return;
          }
          
          // Store posts for modal
          allPosts = allPosts.concat(data.posts);
          
          // Render posts
          data.posts.forEach(function(post, index) {
            const postIndex = allPosts.indexOf(post);
            const postEl = createPostElement(post, postsContainer.children.length + index, postIndex);
            postsContainer.appendChild(postEl);
          });
          
          // Update state
          hasMore = data.hasMore;
          nextCursor = data.nextCursor;
          
          isLoading = false;
          loadingIndicator.style.display = hasMore ? 'none' : 'none';
        })
        .catch(function(error) {
          console.error('Instagram Widget: Failed to load posts', error);
          loadingIndicator.innerHTML = '<p style="color: #e53e3e; text-align: center; padding: 20px;">Failed to load posts. Please try refreshing.</p>';
          isLoading = false;
          hasMore = false;
        });
    }
    
    function getPositionClass(position) {
      switch(position) {
        case 'left': return 'margin-right: auto;';
        case 'right': return 'margin-left: auto;';
        case 'center': return 'margin: 0 auto;';
        default: return 'margin: 0 auto;';
      }
    }

    function createPostElement(post, index, postIndex) {
      const style = layoutStyles[index % layoutStyles.length];
      const mediaUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
      let positionStyle = getPositionClass(style.position);

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'width: 100%; margin-bottom: 80px;';
      
      const link = document.createElement('a');
      link.href = '#';
      link.style.cssText = positionStyle + ' display: block; position: relative; width: ' + style.width + '; aspect-ratio: ' + style.aspectRatio + '; overflow: hidden; background: #f3f4f6; transition: all 0.3s ease; text-decoration: none; cursor: pointer;';
      
      // Open modal instead of redirecting
      link.onclick = function(e) {
        e.preventDefault();
        openPostModal(post, postIndex);
      };
      
      const img = document.createElement('img');
      img.src = mediaUrl;
      img.alt = post.caption || 'Instagram post';
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;';
      img.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
      img.onmouseout = function() { this.style.transform = 'scale(1)'; };
      
      link.appendChild(img);
      
      // Add media badges
      if (post.media_type === 'VIDEO') {
        const badge = document.createElement('div');
        badge.style.cssText = 'position: absolute; top: 12px; right: 12px; background: rgba(0, 0, 0, 0.7); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';
        badge.innerHTML = '<svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        link.appendChild(badge);
      }
      
      if (post.media_type === 'CAROUSEL_ALBUM') {
        const badge = document.createElement('div');
        badge.style.cssText = 'position: absolute; top: 12px; right: 12px; background: rgba(0, 0, 0, 0.7); border-radius: 20px; padding: 4px 12px; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(4px);';
        badge.innerHTML = '<svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg><span style="color: white; font-size: 12px; font-weight: 500;">•••</span>';
        link.appendChild(badge);
      }

      wrapper.appendChild(link);
      return wrapper;
    }
    
    function openPostModal(post, postIndex) {
      const modal = createModal(post, postIndex);
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';
      
      // Trigger animation
      setTimeout(function() {
        modal.classList.add('active');
      }, 10);
      
      // Close on escape
      function handleEscape(e) {
        if (e.key === 'Escape') {
          closeModal(modal);
        }
      }
      document.addEventListener('keydown', handleEscape);
      modal._handleEscape = handleEscape;
    }
    
    function closeModal(modal) {
      modal.classList.remove('active');
      document.removeEventListener('keydown', modal._handleEscape);
      setTimeout(function() {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
      }, 300);
    }
    
    function createModal(post, postIndex) {
      const overlay = document.createElement('div');
      overlay.className = 'ig-modal-overlay';
      overlay.onclick = function(e) {
        if (e.target === overlay) {
          closeModal(overlay);
        }
      };
      
      const content = document.createElement('div');
      content.className = 'ig-modal-content';
      content.onclick = function(e) {
        e.stopPropagation();
      };
      
      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'ig-modal-close';
      closeBtn.innerHTML = '<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
      closeBtn.onclick = function() {
        closeModal(overlay);
      };
      content.appendChild(closeBtn);
      
      // Media section
      const mediaSection = createMediaSection(post);
      content.appendChild(mediaSection);
      
      // Sidebar
      const sidebar = createSidebar(post);
      content.appendChild(sidebar);
      
      overlay.appendChild(content);
      return overlay;
    }
    
    function createMediaSection(post) {
      const section = document.createElement('div');
      section.className = 'ig-modal-media';
      
      if (post.media_type === 'CAROUSEL_ALBUM' && post.children && post.children.data) {
        let currentSlide = 0;
        const slides = post.children.data;
        
        function renderSlide() {
          section.innerHTML = '';
          const slide = slides[currentSlide];
          
          if (slide.media_type === 'VIDEO') {
            const video = document.createElement('video');
            video.src = slide.media_url;
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            section.appendChild(video);
          } else {
            const img = document.createElement('img');
            img.src = slide.media_url;
            img.alt = 'Slide ' + (currentSlide + 1);
            section.appendChild(img);
          }
          
          // Navigation
          if (slides.length > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'ig-modal-nav prev';
            prevBtn.innerHTML = '<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
            prevBtn.onclick = function() {
              currentSlide = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
              renderSlide();
            };
            section.appendChild(prevBtn);
            
            const nextBtn = document.createElement('button');
            nextBtn.className = 'ig-modal-nav next';
            nextBtn.innerHTML = '<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
            nextBtn.onclick = function() {
              currentSlide = currentSlide === slides.length - 1 ? 0 : currentSlide + 1;
              renderSlide();
            };
            section.appendChild(nextBtn);
            
            // Indicators
            const indicators = document.createElement('div');
            indicators.className = 'ig-modal-indicators';
            slides.forEach(function(_, index) {
              const dot = document.createElement('button');
              dot.className = 'ig-modal-indicator' + (index === currentSlide ? ' active' : '');
              dot.onclick = function() {
                currentSlide = index;
                renderSlide();
              };
              indicators.appendChild(dot);
            });
            section.appendChild(indicators);
          }
        }
        
        renderSlide();
      } else if (post.media_type === 'VIDEO') {
        const video = document.createElement('video');
        video.src = post.media_url;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        section.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = post.media_url;
        img.alt = post.caption || 'Instagram post';
        section.appendChild(img);
      }
      
      return section;
    }
    
    function createSidebar(post) {
      const sidebar = document.createElement('div');
      sidebar.className = 'ig-modal-sidebar';
      
      // Header
      const header = document.createElement('div');
      header.className = 'ig-modal-header';
      
      const avatar = document.createElement('div');
      avatar.className = 'ig-modal-avatar';
      avatar.textContent = (post.username || 'IG').charAt(0).toUpperCase();
      header.appendChild(avatar);
      
      const userInfo = document.createElement('div');
      userInfo.innerHTML = '<div style="font-weight: 600; color: #1f2937;">' + (post.username || 'Instagram') + '</div><div style="font-size: 12px; color: #6b7280;">' + formatDate(post.timestamp) + '</div>';
      header.appendChild(userInfo);
      
      sidebar.appendChild(header);
      
      // Body
      const body = document.createElement('div');
      body.className = 'ig-modal-body';
      
      if (post.caption) {
        const caption = document.createElement('div');
        caption.className = 'ig-modal-caption';
        caption.textContent = post.caption;
        body.appendChild(caption);
      }
      
      // Stats
      if (post.like_count !== undefined || post.comments_count !== undefined) {
        const stats = document.createElement('div');
        stats.className = 'ig-modal-stats';
        
        if (post.like_count !== undefined) {
          const likes = document.createElement('div');
          likes.className = 'ig-modal-stat';
          likes.innerHTML = '<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span style="font-weight: 500;">' + post.like_count.toLocaleString() + '</span>';
          stats.appendChild(likes);
        }
        
        if (post.comments_count !== undefined) {
          const comments = document.createElement('div');
          comments.className = 'ig-modal-stat';
          comments.innerHTML = '<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/></svg><span style="font-weight: 500;">' + post.comments_count.toLocaleString() + '</span>';
          stats.appendChild(comments);
        }
        
        body.appendChild(stats);
      }
      
      sidebar.appendChild(body);
      
      // Footer
      const footer = document.createElement('div');
      footer.className = 'ig-modal-footer';
      
      const link = document.createElement('a');
      link.className = 'ig-modal-link';
      link.href = post.permalink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'View on Instagram';
      footer.appendChild(link);
      
      sidebar.appendChild(footer);
      
      return sidebar;
    }
    
    function formatDate(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  });
})();
  `;

  res.status(200).send(scriptContent);
}