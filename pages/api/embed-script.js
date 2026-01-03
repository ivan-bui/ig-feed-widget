export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scriptContent = `
(function() {
  'use strict';

  const API_BASE = 'https://ig-feed-widget-six.vercel.app';

  const containers = document.querySelectorAll('[data-ig-feed]');

  if (containers.length === 0) {
    console.warn('Instagram Widget: No containers found');
    return;
  }

  // Inject global styles for modal
  const styleSheet = document.createElement('style');
  styleSheet.textContent = \`
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes igModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes igModalFadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes igModalSlideIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    @keyframes igImageFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes igBounce { 0%, 100% { transform: translateY(0) translateX(-50%); } 50% { transform: translateY(-10px) translateX(-50%); } }
    .ig-modal-overlay { animation: igModalFadeIn 0.3s ease-out forwards; }
    .ig-modal-overlay.closing { animation: igModalFadeOut 0.3s ease-out forwards; }
    .ig-modal-content { animation: igModalSlideIn 0.3s ease-out forwards; }
    .ig-modal-transitioning-next { opacity: 0; transform: translateX(20px); }
    .ig-modal-transitioning-prev { opacity: 0; transform: translateX(-20px); }
    .ig-carousel-image { animation: igImageFadeIn 0.4s ease-out forwards; opacity: 0; }
    .ig-scroll-indicator { animation: igBounce 2s ease-in-out infinite; }
    .ig-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .ig-scrollbar-hide::-webkit-scrollbar { display: none; }
  \`;
  document.head.appendChild(styleSheet);

  containers.forEach(function(container, containerIndex) {
    const initialLimit = container.getAttribute('data-max-posts') || '15';

    // State
    let isLoading = false;
    let hasMore = true;
    let nextCursor = null;
    let postsContainer = null;
    let loadingIndicator = null;
    let observer = null;
    let allPosts = [];
    let selectedPostIndex = null;
    let modalElement = null;

    // Touch handling
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

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

      // Setup keyboard listener
      document.addEventListener('keydown', handleKeyDown);

      // Load initial posts
      loadMorePosts(true);
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

          // Render posts
          data.posts.forEach(function(post, index) {
            const postIndex = allPosts.length;
            allPosts.push(post);
            const postEl = createPostElement(post, postIndex);
            postsContainer.appendChild(postEl);
          });

          // Update state
          hasMore = data.hasMore;
          nextCursor = data.nextCursor;

          isLoading = false;
          loadingIndicator.style.display = 'none';
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

    function createPostElement(post, index) {
      const style = layoutStyles[index % layoutStyles.length];
      const mediaUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
      let positionStyle = getPositionClass(style.position);

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'width: 100%; margin-bottom: 80px;';

      const button = document.createElement('button');
      button.style.cssText = positionStyle + ' display: block; position: relative; width: ' + style.width + '; aspect-ratio: ' + style.aspectRatio + '; overflow: hidden; background: #f3f4f6; transition: all 0.3s ease; text-decoration: none; border: none; padding: 0; cursor: pointer;';
      button.onclick = function() { openModal(index); };

      const img = document.createElement('img');
      img.src = mediaUrl;
      img.alt = post.caption || 'Instagram post';
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;';
      img.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
      img.onmouseout = function() { this.style.transform = 'scale(1)'; };

      button.appendChild(img);

      // Add media badges
      if (post.media_type === 'VIDEO') {
        const badge = document.createElement('div');
        badge.style.cssText = 'position: absolute; top: 12px; right: 12px; background: rgba(0, 0, 0, 0.7); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';
        badge.innerHTML = '<svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        button.appendChild(badge);
      }

      if (post.media_type === 'CAROUSEL_ALBUM') {
        const badge = document.createElement('div');
        badge.style.cssText = 'position: absolute; top: 12px; right: 12px; background: rgba(0, 0, 0, 0.7); border-radius: 20px; padding: 4px 12px; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(4px);';
        const childCount = post.children && post.children.data ? post.children.data.length : '•••';
        badge.innerHTML = '<svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg><span style="color: white; font-size: 12px; font-weight: 500;">' + childCount + '</span>';
        button.appendChild(badge);
      }

      // Hover overlay with caption
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent, transparent); opacity: 0; transition: opacity 0.3s ease; display: flex; align-items: flex-end; padding: 16px;';
      overlay.innerHTML = '<p style="color: white; font-size: 14px; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-align: left;">' + (post.caption || '') + '</p>';
      button.onmouseover = function() { overlay.style.opacity = '1'; img.style.transform = 'scale(1.05)'; };
      button.onmouseout = function() { overlay.style.opacity = '0'; img.style.transform = 'scale(1)'; };
      button.appendChild(overlay);

      wrapper.appendChild(button);
      return wrapper;
    }

    // Modal functions
    function openModal(index) {
      selectedPostIndex = index;
      document.body.style.overflow = 'hidden';
      renderModal();
    }

    function closeModal() {
      if (modalElement) {
        modalElement.classList.add('closing');
        setTimeout(function() {
          if (modalElement && modalElement.parentNode) {
            modalElement.parentNode.removeChild(modalElement);
          }
          modalElement = null;
          selectedPostIndex = null;
          document.body.style.overflow = '';
        }, 300);
      }
    }

    function navigatePost(newIndex) {
      if (newIndex < 0 || newIndex >= allPosts.length) return;

      const content = modalElement.querySelector('.ig-modal-content');
      const direction = newIndex > selectedPostIndex ? 'next' : 'prev';
      content.classList.add('ig-modal-transitioning-' + direction);

      setTimeout(function() {
        selectedPostIndex = newIndex;
        renderModalContent();
        content.classList.remove('ig-modal-transitioning-next', 'ig-modal-transitioning-prev');
      }, 200);
    }

    function getCarouselItems(post) {
      if (post.media_type === 'CAROUSEL_ALBUM' && post.children && post.children.data) {
        return post.children.data;
      }
      return [post];
    }

    function renderModal() {
      if (modalElement) {
        modalElement.parentNode.removeChild(modalElement);
      }

      modalElement = document.createElement('div');
      modalElement.className = 'ig-modal-overlay';
      modalElement.style.cssText = 'position: fixed; inset: 0; z-index: 99999; background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(4px);';
      modalElement.onclick = function(e) { if (e.target === modalElement) closeModal(); };

      // Touch events for horizontal swipe (post navigation)
      modalElement.ontouchstart = function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      };
      modalElement.ontouchmove = function(e) {
        touchEndX = e.touches[0].clientX;
        touchEndY = e.touches[0].clientY;
      };
      modalElement.ontouchend = handleTouchEnd;

      renderModalContent();
      document.body.appendChild(modalElement);
    }

    function renderModalContent() {
      const post = allPosts[selectedPostIndex];
      const items = getCarouselItems(post);
      const hasMultipleItems = items.length > 1;
      const hasPrevPost = selectedPostIndex > 0;
      const hasNextPost = selectedPostIndex < allPosts.length - 1;

      const content = document.createElement('div');
      content.className = 'ig-modal-content';
      content.style.cssText = 'position: relative; width: 100%; height: 100%; transition: all 0.2s ease;';
      content.onclick = function(e) { e.stopPropagation(); };

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.style.cssText = 'position: absolute; top: 16px; right: 16px; z-index: 10; background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; padding: 8px; transition: color 0.2s;';
      closeBtn.innerHTML = '<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"/></svg>';
      closeBtn.onmouseover = function() { this.style.color = 'white'; };
      closeBtn.onmouseout = function() { this.style.color = 'rgba(255,255,255,0.7)'; };
      closeBtn.onclick = closeModal;
      content.appendChild(closeBtn);

      // Post counter
      const counter = document.createElement('div');
      counter.style.cssText = 'position: absolute; top: 20px; left: 20px; z-index: 10; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 300;';
      counter.textContent = (selectedPostIndex + 1) + ' / ' + allPosts.length;
      content.appendChild(counter);

      // Prev post button
      if (hasPrevPost) {
        const prevBtn = document.createElement('button');
        prevBtn.style.cssText = 'position: absolute; left: 8px; top: 50%; transform: translateY(-50%); z-index: 10; background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 12px; transition: all 0.2s;';
        prevBtn.innerHTML = '<svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 19l-7-7 7-7"/></svg>';
        prevBtn.onmouseover = function() { this.style.color = 'white'; this.style.transform = 'translateY(-50%) scale(1.1)'; };
        prevBtn.onmouseout = function() { this.style.color = 'rgba(255,255,255,0.5)'; this.style.transform = 'translateY(-50%)'; };
        prevBtn.onclick = function(e) { e.stopPropagation(); navigatePost(selectedPostIndex - 1); };
        content.appendChild(prevBtn);
      }

      // Next post button
      if (hasNextPost) {
        const nextBtn = document.createElement('button');
        nextBtn.style.cssText = 'position: absolute; right: 8px; top: 50%; transform: translateY(-50%); z-index: 10; background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 12px; transition: all 0.2s;';
        nextBtn.innerHTML = '<svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5l7 7-7 7"/></svg>';
        nextBtn.onmouseover = function() { this.style.color = 'white'; this.style.transform = 'translateY(-50%) scale(1.1)'; };
        nextBtn.onmouseout = function() { this.style.color = 'rgba(255,255,255,0.5)'; this.style.transform = 'translateY(-50%)'; };
        nextBtn.onclick = function(e) { e.stopPropagation(); navigatePost(selectedPostIndex + 1); };
        content.appendChild(nextBtn);
      }

      if (hasMultipleItems) {
        // Vertical scrolling layout for carousel posts
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'ig-scrollbar-hide';
        scrollContainer.style.cssText = 'height: 100%; overflow-y: auto; -ms-overflow-style: none; scrollbar-width: none;';

        const innerContainer = document.createElement('div');
        innerContainer.style.cssText = 'max-width: 900px; margin: 0 auto; padding: 80px 16px 48px;';

        // Caption at top
        if (post.caption) {
          const caption = document.createElement('div');
          caption.style.cssText = 'margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;';
          caption.innerHTML = '<p style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 300; line-height: 1.6; margin: 0;">' + post.caption + '</p>';
          innerContainer.appendChild(caption);
        }

        // Images stacked vertically
        const imagesContainer = document.createElement('div');
        imagesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

        items.forEach(function(item, idx) {
          const imageWrapper = document.createElement('div');
          imageWrapper.className = 'ig-carousel-image';
          imageWrapper.style.cssText = 'width: 100%; animation-delay: ' + (idx * 100) + 'ms;';

          if (item.media_type === 'VIDEO') {
            const video = document.createElement('video');
            video.src = item.media_url;
            video.poster = item.thumbnail_url;
            video.controls = true;
            video.playsInline = true;
            video.style.cssText = 'width: 100%; height: auto; display: block;';
            imageWrapper.appendChild(video);
          } else {
            const img = document.createElement('img');
            img.src = item.media_url;
            img.alt = post.caption || 'Image ' + (idx + 1);
            img.style.cssText = 'width: 100%; height: auto; display: block;';
            imageWrapper.appendChild(img);
          }

          imagesContainer.appendChild(imageWrapper);
        });

        innerContainer.appendChild(imagesContainer);

        // Footer info
        const footer = document.createElement('div');
        footer.style.cssText = 'padding: 48px 0; display: flex; align-items: center; justify-content: center; gap: 16px; color: rgba(255,255,255,0.4); font-size: 13px;';

        const date = new Date(post.timestamp);
        const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        footer.innerHTML = '<span>' + dateStr + '</span><span>•</span><span>' + items.length + ' images</span><span>•</span><a href="' + post.permalink + '" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; text-underline-offset: 2px;">View on Instagram</a>';
        innerContainer.appendChild(footer);

        scrollContainer.appendChild(innerContainer);
        content.appendChild(scrollContainer);

        // Scroll indicator
        const scrollIndicator = document.createElement('div');
        scrollIndicator.className = 'ig-scroll-indicator';
        scrollIndicator.style.cssText = 'position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); z-index: 40; pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 8px; color: rgba(255,255,255,0.3);';
        scrollIndicator.innerHTML = '<span style="font-size: 11px; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase;">Scroll</span><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>';
        content.appendChild(scrollIndicator);

      } else {
        // Centered layout for single image/video
        const centerContainer = document.createElement('div');
        centerContainer.style.cssText = 'height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px;';

        // Media container
        const mediaContainer = document.createElement('div');
        mediaContainer.style.cssText = 'position: relative; max-width: 900px; width: 100%; max-height: 70vh; display: flex; align-items: center; justify-content: center;';

        const item = items[0];
        if (item.media_type === 'VIDEO') {
          const video = document.createElement('video');
          video.src = item.media_url;
          video.poster = item.thumbnail_url;
          video.controls = true;
          video.autoplay = true;
          video.playsInline = true;
          video.style.cssText = 'max-width: 100%; max-height: 70vh; object-fit: contain;';
          mediaContainer.appendChild(video);
        } else {
          const img = document.createElement('img');
          img.src = item.media_url;
          img.alt = post.caption || 'Instagram post';
          img.style.cssText = 'max-width: 100%; max-height: 70vh; object-fit: contain;';
          mediaContainer.appendChild(img);
        }

        centerContainer.appendChild(mediaContainer);

        // Caption
        if (post.caption) {
          const caption = document.createElement('div');
          caption.style.cssText = 'margin-top: 24px; max-width: 600px; text-align: center; padding: 0 16px;';
          caption.innerHTML = '<p style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 300; line-height: 1.6; margin: 0; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;">' + post.caption + '</p>';
          centerContainer.appendChild(caption);
        }

        // Date and Instagram link
        const meta = document.createElement('div');
        meta.style.cssText = 'margin-top: 16px; display: flex; align-items: center; gap: 16px; color: rgba(255,255,255,0.4); font-size: 13px;';

        const date = new Date(post.timestamp);
        const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        meta.innerHTML = '<span>' + dateStr + '</span><a href="' + post.permalink + '" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; text-underline-offset: 2px;">View on Instagram</a>';
        centerContainer.appendChild(meta);

        content.appendChild(centerContainer);
      }

      // Replace modal content
      modalElement.innerHTML = '';
      modalElement.appendChild(content);
    }

    function handleKeyDown(e) {
      if (selectedPostIndex === null) return;

      const hasPrevPost = selectedPostIndex > 0;
      const hasNextPost = selectedPostIndex < allPosts.length - 1;

      switch (e.key) {
        case 'Escape':
          closeModal();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          if (hasPrevPost) navigatePost(selectedPostIndex - 1);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          if (hasNextPost) navigatePost(selectedPostIndex + 1);
          break;
      }
    }

    function handleTouchEnd() {
      if (selectedPostIndex === null) return;

      const deltaX = touchStartX - touchEndX;
      const deltaY = touchStartY - touchEndY;
      const minSwipeDistance = 50;

      const hasPrevPost = selectedPostIndex > 0;
      const hasNextPost = selectedPostIndex < allPosts.length - 1;

      // Only handle horizontal swipes for post navigation
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0 && hasNextPost) {
          navigatePost(selectedPostIndex + 1);
        } else if (deltaX < 0 && hasPrevPost) {
          navigatePost(selectedPostIndex - 1);
        }
      }
    }
  });
})();
  `;

  res.status(200).send(scriptContent);
}
