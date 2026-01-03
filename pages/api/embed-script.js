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
    @keyframes igBounce { 0%, 100% { transform: translateY(0) translateX(-50%); } 50% { transform: translateY(-10px) translateX(-50%); } }
    .ig-modal-overlay { animation: igModalFadeIn 0.3s ease-out forwards; }
    .ig-modal-overlay.closing { animation: igModalFadeOut 0.3s ease-out forwards; }
    .ig-scroll-indicator { animation: igBounce 2s ease-in-out infinite; }
    .ig-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .ig-scrollbar-hide::-webkit-scrollbar { display: none; }
    .ig-slide-container { display: flex; width: 300vw; height: 100%; transition: transform 0.3s ease-out; }
    .ig-slide-panel { width: 100vw; height: 100%; flex-shrink: 0; overflow: hidden; }
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
    let isSliding = false;

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
      const mainContainer = document.createElement('div');
      mainContainer.style.cssText = 'width: 100%; max-width: 1200px; margin: 0 auto; padding: 0; box-sizing: border-box;';

      postsContainer = document.createElement('div');
      postsContainer.style.cssText = 'width: 100%;';
      mainContainer.appendChild(postsContainer);

      loadingIndicator = createLoadingIndicator();
      mainContainer.appendChild(loadingIndicator);

      const scrollTrigger = document.createElement('div');
      scrollTrigger.id = 'ig-scroll-trigger-' + containerIndex;
      scrollTrigger.style.cssText = 'height: 1px; width: 100%;';
      mainContainer.appendChild(scrollTrigger);

      container.innerHTML = '';
      container.appendChild(mainContainer);

      observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMorePosts();
        }
      }, { rootMargin: '200px' });

      observer.observe(scrollTrigger);
      document.addEventListener('keydown', handleKeyDown);
      loadMorePosts(true);
    }

    function createLoadingIndicator() {
      const indicator = document.createElement('div');
      indicator.style.cssText = 'display: none; text-align: center; padding: 40px; color: #999;';
      indicator.innerHTML = '<div style="display: inline-block; width: 32px; height: 32px; border: 3px solid #f3f3f3; border-top: 3px solid #595959; border-radius: 50%; animation: spin 1s linear infinite;"></div><p style="margin-top: 12px; font-size: 14px;">Loading...</p>';
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

          data.posts.forEach(function(post) {
            const postIndex = allPosts.length;
            allPosts.push(post);
            const postEl = createPostElement(post, postIndex);
            postsContainer.appendChild(postEl);
          });

          hasMore = data.hasMore;
          nextCursor = data.nextCursor;
          isLoading = false;
          loadingIndicator.style.display = 'none';
        })
        .catch(function(error) {
          console.error('Instagram Widget: Failed to load posts', error);
          loadingIndicator.innerHTML = '<p style="color: #e53e3e; text-align: center; padding: 20px;">Failed to load posts.</p>';
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
      button.style.cssText = positionStyle + ' display: block; position: relative; width: ' + style.width + '; aspect-ratio: ' + style.aspectRatio + '; overflow: hidden; background: #f3f4f6; transition: all 0.3s ease; border: none; padding: 0; cursor: pointer;';
      button.onclick = function() { openModal(index); };

      const img = document.createElement('img');
      img.src = mediaUrl;
      img.alt = post.caption || 'Instagram post';
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;';

      button.appendChild(img);

      if (post.media_type === 'VIDEO') {
        const badge = document.createElement('div');
        badge.style.cssText = 'position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.7); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;';
        badge.innerHTML = '<svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        button.appendChild(badge);
      }

      if (post.media_type === 'CAROUSEL_ALBUM') {
        const badge = document.createElement('div');
        badge.style.cssText = 'position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.7); border-radius: 20px; padding: 4px 12px; display: flex; align-items: center; gap: 4px;';
        const count = post.children && post.children.data ? post.children.data.length : '•••';
        badge.innerHTML = '<svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg><span style="color:white;font-size:12px;">' + count + '</span>';
        button.appendChild(badge);
      }

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent, transparent); opacity: 0; transition: opacity 0.3s; display: flex; align-items: flex-end; padding: 16px;';
      overlay.innerHTML = '<p style="color: white; font-size: 14px; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-align: left;">' + (post.caption || '') + '</p>';
      button.onmouseover = function() { overlay.style.opacity = '1'; img.style.transform = 'scale(1.05)'; };
      button.onmouseout = function() { overlay.style.opacity = '0'; img.style.transform = 'scale(1)'; };
      button.appendChild(overlay);

      wrapper.appendChild(button);
      return wrapper;
    }

    function getCarouselItems(post) {
      if (post && post.media_type === 'CAROUSEL_ALBUM' && post.children && post.children.data) {
        return post.children.data;
      }
      return post ? [post] : [];
    }

    function preloadImages(post) {
      if (!post) return;
      const items = getCarouselItems(post);
      items.forEach(function(item) {
        const img = new Image();
        img.src = item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : item.media_url;
      });
    }

    function openModal(index) {
      selectedPostIndex = index;
      isSliding = false;
      document.body.style.overflow = 'hidden';

      // Preload adjacent posts
      if (index > 0) preloadImages(allPosts[index - 1]);
      if (index < allPosts.length - 1) preloadImages(allPosts[index + 1]);

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
      if (newIndex < 0 || newIndex >= allPosts.length || isSliding) return;

      isSliding = true;
      const direction = newIndex > selectedPostIndex ? 'left' : 'right';
      const slideContainer = modalElement.querySelector('.ig-slide-container');

      // Preload the post after the one we're navigating to
      if (direction === 'left' && newIndex + 1 < allPosts.length) {
        preloadImages(allPosts[newIndex + 1]);
      } else if (direction === 'right' && newIndex - 1 >= 0) {
        preloadImages(allPosts[newIndex - 1]);
      }

      // Animate slide
      if (direction === 'left') {
        slideContainer.style.transform = 'translateX(-200vw)';
      } else {
        slideContainer.style.transform = 'translateX(0)';
      }

      setTimeout(function() {
        selectedPostIndex = newIndex;
        isSliding = false;
        renderModalContent();
      }, 300);
    }

    function renderModal() {
      if (modalElement) {
        modalElement.parentNode.removeChild(modalElement);
      }

      modalElement = document.createElement('div');
      modalElement.className = 'ig-modal-overlay';
      modalElement.style.cssText = 'position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.95); overflow: hidden;';
      modalElement.onclick = function(e) { if (e.target === modalElement) closeModal(); };

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

    function renderPostContent(post) {
      if (!post) return '';

      const items = getCarouselItems(post);
      const hasMultiple = items.length > 1;
      const date = new Date(post.timestamp);
      const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      let html = '<div class="ig-slide-panel">';

      if (hasMultiple) {
        html += '<div class="ig-scrollbar-hide" style="height: 100%; overflow-y: auto;">';
        html += '<div style="max-width: 900px; margin: 0 auto; padding: 80px 16px 48px;">';

        if (post.caption) {
          html += '<div style="margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">';
          html += '<p style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 300; line-height: 1.6; margin: 0;">' + post.caption + '</p>';
          html += '</div>';
        }

        html += '<div style="display: flex; flex-direction: column; gap: 16px;">';
        items.forEach(function(item) {
          if (item.media_type === 'VIDEO') {
            html += '<video src="' + item.media_url + '" poster="' + (item.thumbnail_url || '') + '" controls playsinline style="width: 100%; height: auto;"></video>';
          } else {
            html += '<img src="' + item.media_url + '" alt="' + (post.caption || 'Image') + '" style="width: 100%; height: auto; display: block;" />';
          }
        });
        html += '</div>';

        html += '<div style="padding: 48px 0; display: flex; align-items: center; justify-content: center; gap: 16px; color: rgba(255,255,255,0.4); font-size: 13px;">';
        html += '<span>' + dateStr + '</span><span>•</span><span>' + items.length + ' images</span><span>•</span>';
        html += '<a href="' + post.permalink + '" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">View on Instagram</a>';
        html += '</div></div></div>';
      } else {
        const item = items[0];
        html += '<div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px;">';
        html += '<div style="max-width: 900px; width: 100%; max-height: 70vh; display: flex; align-items: center; justify-content: center;">';

        if (item.media_type === 'VIDEO') {
          html += '<video src="' + item.media_url + '" poster="' + (item.thumbnail_url || '') + '" controls autoplay playsinline style="max-width: 100%; max-height: 70vh; object-fit: contain;"></video>';
        } else {
          html += '<img src="' + item.media_url + '" alt="' + (post.caption || 'Image') + '" style="max-width: 100%; max-height: 70vh; object-fit: contain;" />';
        }
        html += '</div>';

        if (post.caption) {
          html += '<div style="margin-top: 24px; max-width: 600px; text-align: center; padding: 0 16px;">';
          html += '<p style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 300; line-height: 1.6; margin: 0;">' + post.caption + '</p>';
          html += '</div>';
        }

        html += '<div style="margin-top: 16px; display: flex; align-items: center; gap: 16px; color: rgba(255,255,255,0.4); font-size: 13px;">';
        html += '<span>' + dateStr + '</span>';
        html += '<a href="' + post.permalink + '" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">View on Instagram</a>';
        html += '</div></div>';
      }

      html += '</div>';
      return html;
    }

    function renderModalContent() {
      const post = allPosts[selectedPostIndex];
      const prevPost = selectedPostIndex > 0 ? allPosts[selectedPostIndex - 1] : null;
      const nextPost = selectedPostIndex < allPosts.length - 1 ? allPosts[selectedPostIndex + 1] : null;
      const items = getCarouselItems(post);
      const hasMultiple = items.length > 1;
      const hasPrev = selectedPostIndex > 0;
      const hasNext = selectedPostIndex < allPosts.length - 1;

      let html = '';

      // Close button
      html += '<button onclick="event.stopPropagation();" style="position: absolute; top: 16px; right: 16px; z-index: 10; background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; padding: 8px;">';
      html += '<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"/></svg>';
      html += '</button>';

      // Counter
      html += '<div style="position: absolute; top: 20px; left: 20px; z-index: 10; color: rgba(255,255,255,0.5); font-size: 14px;">' + (selectedPostIndex + 1) + ' / ' + allPosts.length + '</div>';

      // Nav buttons
      if (hasPrev) {
        html += '<button class="ig-nav-prev" style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); z-index: 10; background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 12px;">';
        html += '<svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 19l-7-7 7-7"/></svg>';
        html += '</button>';
      }
      if (hasNext) {
        html += '<button class="ig-nav-next" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); z-index: 10; background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 12px;">';
        html += '<svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5l7 7-7 7"/></svg>';
        html += '</button>';
      }

      // Sliding container
      html += '<div class="ig-slide-container" style="transform: translateX(-100vw);">';
      html += renderPostContent(prevPost);
      html += renderPostContent(post);
      html += renderPostContent(nextPost);
      html += '</div>';

      // Scroll indicator
      if (hasMultiple) {
        html += '<div class="ig-scroll-indicator" style="position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); z-index: 40; pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 8px; color: rgba(255,255,255,0.3);">';
        html += '<span style="font-size: 11px; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase;">Scroll</span>';
        html += '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>';
        html += '</div>';
      }

      modalElement.innerHTML = html;

      // Attach event listeners
      const closeBtn = modalElement.querySelector('button');
      if (closeBtn) closeBtn.onclick = function(e) { e.stopPropagation(); closeModal(); };

      const prevBtn = modalElement.querySelector('.ig-nav-prev');
      if (prevBtn) prevBtn.onclick = function(e) { e.stopPropagation(); navigatePost(selectedPostIndex - 1); };

      const nextBtn = modalElement.querySelector('.ig-nav-next');
      if (nextBtn) nextBtn.onclick = function(e) { e.stopPropagation(); navigatePost(selectedPostIndex + 1); };

      // Stop propagation on slide container
      const slideContainer = modalElement.querySelector('.ig-slide-container');
      if (slideContainer) slideContainer.onclick = function(e) { e.stopPropagation(); };
    }

    function handleKeyDown(e) {
      if (selectedPostIndex === null || isSliding) return;

      switch (e.key) {
        case 'Escape':
          closeModal();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          if (selectedPostIndex > 0) navigatePost(selectedPostIndex - 1);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          if (selectedPostIndex < allPosts.length - 1) navigatePost(selectedPostIndex + 1);
          break;
      }
    }

    function handleTouchEnd() {
      if (selectedPostIndex === null || isSliding) return;

      const deltaX = touchStartX - touchEndX;
      const deltaY = touchStartY - touchEndY;
      const minSwipeDistance = 50;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0 && selectedPostIndex < allPosts.length - 1) {
          navigatePost(selectedPostIndex + 1);
        } else if (deltaX < 0 && selectedPostIndex > 0) {
          navigatePost(selectedPostIndex - 1);
        }
      }
    }
  });
})();
  `;

  res.status(200).send(scriptContent);
}
