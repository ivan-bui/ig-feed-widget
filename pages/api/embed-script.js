export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scriptContent = `
(function() {
  'use strict';

  const API_BASE = 'https://ig-feed-widget-six.vercel.app';

  const containers = document.querySelectorAll('[data-ig-feed]');
  if (containers.length === 0) return;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = \`
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes igFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes igFadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes igBounce { 0%, 100% { transform: translateY(0) translateX(-50%); } 50% { transform: translateY(-10px) translateX(-50%); } }
    .ig-modal-overlay { animation: igFadeIn 0.3s ease-out forwards; }
    .ig-modal-overlay.closing { animation: igFadeOut 0.3s ease-out forwards; }
    .ig-scroll-indicator { animation: igBounce 2s ease-in-out infinite; }
    .ig-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .ig-scrollbar-hide::-webkit-scrollbar { display: none; }
    .ig-content { transition: transform 0.25s ease-out, opacity 0.25s ease-out; }
    .ig-content.slide-left { transform: translateX(-100%); opacity: 0; }
    .ig-content.slide-right { transform: translateX(100%); opacity: 0; }
    .ig-content.enter-left { transform: translateX(-100%); opacity: 0; transition: none; }
    .ig-content.enter-right { transform: translateX(100%); opacity: 0; transition: none; }
    .ig-content.center { transform: translateX(0); opacity: 1; }
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
    let allPosts = [];
    let selectedPostIndex = null;
    let displayedIndex = null;
    let modalElement = null;
    let isAnimating = false;
    let preloadedPosts = new Set();

    // Touch handling
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const layoutStyles = [
      { width: '85%', aspectRatio: '16/9', position: 'left' },
      { width: '75%', aspectRatio: '4/5', position: 'right' },
      { width: '70%', aspectRatio: '1/1', position: 'center' },
      { width: '90%', aspectRatio: '21/9', position: 'right' },
      { width: '65%', aspectRatio: '3/4', position: 'left' },
    ];

    init();

    function init() {
      const mainContainer = document.createElement('div');
      mainContainer.style.cssText = 'width: 100%; max-width: 1200px; margin: 0 auto;';

      postsContainer = document.createElement('div');
      postsContainer.style.cssText = 'width: 100%;';
      mainContainer.appendChild(postsContainer);

      loadingIndicator = document.createElement('div');
      loadingIndicator.style.cssText = 'display: none; text-align: center; padding: 40px; color: #999;';
      loadingIndicator.innerHTML = '<div style="display: inline-block; width: 32px; height: 32px; border: 3px solid #f3f3f3; border-top: 3px solid #595959; border-radius: 50%; animation: spin 1s linear infinite;"></div>';
      mainContainer.appendChild(loadingIndicator);

      const scrollTrigger = document.createElement('div');
      scrollTrigger.style.cssText = 'height: 1px;';
      mainContainer.appendChild(scrollTrigger);

      container.innerHTML = '';
      container.appendChild(mainContainer);

      new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting && hasMore && !isLoading) loadMorePosts();
      }, { rootMargin: '200px' }).observe(scrollTrigger);

      document.addEventListener('keydown', handleKeyDown);
      loadMorePosts(true);
    }

    function loadMorePosts(isInitial) {
      if (isLoading) return;
      isLoading = true;
      loadingIndicator.style.display = 'block';

      let url = API_BASE + '/api/embed-html?limit=' + (isInitial ? initialLimit : '10');
      if (nextCursor) url += '&after=' + encodeURIComponent(nextCursor);

      fetch(url)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(function(data) {
          if (!data.posts || !data.posts.length) {
            hasMore = false;
            loadingIndicator.style.display = 'none';
            return;
          }
          data.posts.forEach(function(post) {
            allPosts.push(post);
            postsContainer.appendChild(createPostElement(post, allPosts.length - 1));
          });
          hasMore = data.hasMore;
          nextCursor = data.nextCursor;
          isLoading = false;
          loadingIndicator.style.display = 'none';
        })
        .catch(function() {
          loadingIndicator.innerHTML = '<p style="color: #e53e3e;">Failed to load posts.</p>';
          isLoading = false;
          hasMore = false;
        });
    }

    function createPostElement(post, index) {
      const style = layoutStyles[index % layoutStyles.length];
      const mediaUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
      const pos = style.position === 'left' ? 'margin-right:auto;' : style.position === 'right' ? 'margin-left:auto;' : 'margin:0 auto;';

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'width: 100%; margin-bottom: 80px;';

      const button = document.createElement('button');
      button.style.cssText = pos + 'display:block;position:relative;width:' + style.width + ';aspect-ratio:' + style.aspectRatio + ';overflow:hidden;background:#f3f4f6;transition:all 0.3s;border:none;padding:0;cursor:pointer;';
      button.onclick = function() { openModal(index); };

      const img = document.createElement('img');
      img.src = mediaUrl;
      img.alt = post.caption || '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;transition:transform 0.5s;';

      button.appendChild(img);

      // Badges
      if (post.media_type === 'VIDEO') {
        const badge = document.createElement('div');
        badge.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.7);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;';
        badge.innerHTML = '<svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        button.appendChild(badge);
      }
      if (post.media_type === 'CAROUSEL_ALBUM') {
        const badge = document.createElement('div');
        badge.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.7);border-radius:20px;padding:4px 12px;display:flex;align-items:center;gap:4px;';
        const count = post.children && post.children.data ? post.children.data.length : '•••';
        badge.innerHTML = '<svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg><span style="color:white;font-size:12px;">' + count + '</span>';
        button.appendChild(badge);
      }

      // Overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.7),transparent,transparent);opacity:0;transition:opacity 0.3s;display:flex;align-items:flex-end;padding:16px;';
      overlay.innerHTML = '<p style="color:white;font-size:14px;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-align:left;">' + (post.caption || '') + '</p>';
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

    function preloadPost(post) {
      if (!post || preloadedPosts.has(post.id)) return Promise.resolve();

      const items = getCarouselItems(post);
      const promises = items.map(function(item) {
        return new Promise(function(resolve) {
          if (item.media_type === 'VIDEO') { resolve(); return; }
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = item.media_url;
        });
      });

      return Promise.all(promises).then(function() {
        preloadedPosts.add(post.id);
      });
    }

    function openModal(index) {
      selectedPostIndex = index;
      displayedIndex = index;
      isAnimating = false;
      document.body.style.overflow = 'hidden';

      // Preload current and adjacent
      preloadPost(allPosts[index]);
      if (index > 0) preloadPost(allPosts[index - 1]);
      if (index < allPosts.length - 1) preloadPost(allPosts[index + 1]);

      renderModal();
    }

    function closeModal() {
      if (!modalElement) return;
      modalElement.classList.add('closing');
      setTimeout(function() {
        if (modalElement && modalElement.parentNode) modalElement.parentNode.removeChild(modalElement);
        modalElement = null;
        selectedPostIndex = null;
        displayedIndex = null;
        document.body.style.overflow = '';
      }, 300);
    }

    function navigatePost(newIndex) {
      if (newIndex < 0 || newIndex >= allPosts.length || isAnimating) return;

      isAnimating = true;
      const direction = newIndex > selectedPostIndex ? 'next' : 'prev';
      const targetPost = allPosts[newIndex];

      // Preload target post
      preloadPost(targetPost).then(function() {
        const content = modalElement.querySelector('.ig-content');

        // Slide out
        content.className = 'ig-content ' + (direction === 'next' ? 'slide-left' : 'slide-right');

        setTimeout(function() {
          selectedPostIndex = newIndex;
          displayedIndex = newIndex;

          // Position for enter
          content.className = 'ig-content ' + (direction === 'next' ? 'enter-right' : 'enter-left');

          // Update content
          updateModalContent();

          // Slide in
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              content.className = 'ig-content center';
              isAnimating = false;

              // Preload next adjacent
              if (direction === 'next' && newIndex + 1 < allPosts.length) {
                preloadPost(allPosts[newIndex + 1]);
              } else if (direction === 'prev' && newIndex - 1 >= 0) {
                preloadPost(allPosts[newIndex - 1]);
              }
            });
          });
        }, 250);
      });
    }

    function renderModal() {
      if (modalElement) modalElement.parentNode.removeChild(modalElement);

      modalElement = document.createElement('div');
      modalElement.className = 'ig-modal-overlay';
      modalElement.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.95);overflow:hidden;';
      modalElement.onclick = function(e) { if (e.target === modalElement) closeModal(); };

      modalElement.ontouchstart = function(e) { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; };
      modalElement.ontouchmove = function(e) { touchEndX = e.touches[0].clientX; touchEndY = e.touches[0].clientY; };
      modalElement.ontouchend = handleTouchEnd;

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;z-index:10;background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;padding:8px;';
      closeBtn.innerHTML = '<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"/></svg>';
      closeBtn.onclick = function(e) { e.stopPropagation(); closeModal(); };
      modalElement.appendChild(closeBtn);

      // Counter
      const counter = document.createElement('div');
      counter.className = 'ig-counter';
      counter.style.cssText = 'position:absolute;top:20px;left:20px;z-index:10;color:rgba(255,255,255,0.5);font-size:14px;';
      modalElement.appendChild(counter);

      // Nav buttons
      const prevBtn = document.createElement('button');
      prevBtn.className = 'ig-nav-prev';
      prevBtn.style.cssText = 'position:absolute;left:8px;top:50%;transform:translateY(-50%);z-index:10;background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;padding:12px;display:none;';
      prevBtn.innerHTML = '<svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 19l-7-7 7-7"/></svg>';
      prevBtn.onclick = function(e) { e.stopPropagation(); navigatePost(selectedPostIndex - 1); };
      modalElement.appendChild(prevBtn);

      const nextBtn = document.createElement('button');
      nextBtn.className = 'ig-nav-next';
      nextBtn.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);z-index:10;background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;padding:12px;display:none;';
      nextBtn.innerHTML = '<svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5l7 7-7 7"/></svg>';
      nextBtn.onclick = function(e) { e.stopPropagation(); navigatePost(selectedPostIndex + 1); };
      modalElement.appendChild(nextBtn);

      // Content container
      const content = document.createElement('div');
      content.className = 'ig-content center';
      content.style.cssText = 'width:100%;height:100%;';
      content.onclick = function(e) { e.stopPropagation(); };
      modalElement.appendChild(content);

      // Scroll indicator
      const scrollIndicator = document.createElement('div');
      scrollIndicator.className = 'ig-scroll-indicator';
      scrollIndicator.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);z-index:40;pointer-events:none;display:none;flex-direction:column;align-items:center;gap:8px;color:rgba(255,255,255,0.3);';
      scrollIndicator.innerHTML = '<span style="font-size:11px;font-weight:300;letter-spacing:0.1em;text-transform:uppercase;">Scroll</span><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>';
      modalElement.appendChild(scrollIndicator);

      document.body.appendChild(modalElement);
      updateModalContent();
    }

    function updateModalContent() {
      const post = allPosts[displayedIndex];
      const items = getCarouselItems(post);
      const hasMultiple = items.length > 1;
      const date = new Date(post.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Update counter
      modalElement.querySelector('.ig-counter').textContent = (displayedIndex + 1) + ' / ' + allPosts.length;

      // Update nav visibility
      modalElement.querySelector('.ig-nav-prev').style.display = selectedPostIndex > 0 ? 'block' : 'none';
      modalElement.querySelector('.ig-nav-next').style.display = selectedPostIndex < allPosts.length - 1 ? 'block' : 'none';

      // Update scroll indicator
      modalElement.querySelector('.ig-scroll-indicator').style.display = hasMultiple ? 'flex' : 'none';

      // Build content HTML
      const content = modalElement.querySelector('.ig-content');
      let html = '';

      if (hasMultiple) {
        html = '<div class="ig-scrollbar-hide" style="height:100%;overflow-y:auto;">';
        html += '<div style="max-width:900px;margin:0 auto;padding:80px 16px 48px;">';
        if (post.caption) {
          html += '<div style="margin-bottom:32px;max-width:600px;margin-left:auto;margin-right:auto;"><p style="color:rgba(255,255,255,0.8);font-size:14px;font-weight:300;line-height:1.6;margin:0;">' + post.caption + '</p></div>';
        }
        html += '<div style="display:flex;flex-direction:column;gap:16px;">';
        items.forEach(function(item) {
          if (item.media_type === 'VIDEO') {
            html += '<video src="' + item.media_url + '" poster="' + (item.thumbnail_url || '') + '" controls playsinline style="width:100%;height:auto;"></video>';
          } else {
            html += '<img src="' + item.media_url + '" alt="" style="width:100%;height:auto;display:block;" />';
          }
        });
        html += '</div>';
        html += '<div style="padding:48px 0;display:flex;align-items:center;justify-content:center;gap:16px;color:rgba(255,255,255,0.4);font-size:13px;">';
        html += '<span>' + date + '</span><span>•</span><span>' + items.length + ' images</span><span>•</span><a href="' + post.permalink + '" target="_blank" style="color:inherit;text-decoration:underline;">View on Instagram</a>';
        html += '</div></div></div>';
      } else {
        const item = items[0];
        html = '<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;">';
        html += '<div style="max-width:900px;width:100%;max-height:70vh;display:flex;align-items:center;justify-content:center;">';
        if (item.media_type === 'VIDEO') {
          html += '<video src="' + item.media_url + '" poster="' + (item.thumbnail_url || '') + '" controls autoplay playsinline style="max-width:100%;max-height:70vh;object-fit:contain;"></video>';
        } else {
          html += '<img src="' + item.media_url + '" alt="" style="max-width:100%;max-height:70vh;object-fit:contain;" />';
        }
        html += '</div>';
        if (post.caption) {
          html += '<div style="margin-top:24px;max-width:600px;text-align:center;padding:0 16px;"><p style="color:rgba(255,255,255,0.8);font-size:14px;font-weight:300;line-height:1.6;margin:0;">' + post.caption + '</p></div>';
        }
        html += '<div style="margin-top:16px;display:flex;align-items:center;gap:16px;color:rgba(255,255,255,0.4);font-size:13px;">';
        html += '<span>' + date + '</span><a href="' + post.permalink + '" target="_blank" style="color:inherit;text-decoration:underline;">View on Instagram</a>';
        html += '</div></div>';
      }

      content.innerHTML = html;
    }

    function handleKeyDown(e) {
      if (selectedPostIndex === null || isAnimating) return;
      if (e.key === 'Escape') closeModal();
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && selectedPostIndex > 0) navigatePost(selectedPostIndex - 1);
      else if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && selectedPostIndex < allPosts.length - 1) navigatePost(selectedPostIndex + 1);
    }

    function handleTouchEnd() {
      if (selectedPostIndex === null || isAnimating) return;
      const deltaX = touchStartX - touchEndX;
      const deltaY = touchStartY - touchEndY;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0 && selectedPostIndex < allPosts.length - 1) navigatePost(selectedPostIndex + 1);
        else if (deltaX < 0 && selectedPostIndex > 0) navigatePost(selectedPostIndex - 1);
      }
    }
  });
})();
  `;

  res.status(200).send(scriptContent);
}
