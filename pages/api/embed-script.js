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
  
  containers.forEach(function(container, containerIndex) {
    const initialLimit = container.getAttribute('data-max-posts') || '15';
    
    // State
    let isLoading = false;
    let hasMore = true;
    let nextCursor = null;
    let postsContainer = null;
    let loadingIndicator = null;
    let observer = null;
    
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
      
      // Load initial posts
      loadMorePosts(true);
    }
    
    function createLoadingIndicator() {
      const indicator = document.createElement('div');
      indicator.style.cssText = 'display: none; text-align: center; padding: 40px; color: #999;';
      indicator.innerHTML = \`
        <div style="display: inline-block; width: 32px; height: 32px; border: 3px solid #f3f3f3; border-top: 3px solid #e1306c; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 12px; font-size: 14px;">Loading more posts...</p>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>
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
            const postEl = createPostElement(post, postsContainer.children.length + index);
            postsContainer.appendChild(postEl);
          });
          
          // Update state
          hasMore = data.hasMore;
          nextCursor = data.nextCursor;
          
          isLoading = false;
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
    };

    function createPostElement(post, index) {
      const style = layoutStyles[index % layoutStyles.length];
      const mediaUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
      let positionStyle = getPositionClass(style.position);

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'width: 100%; margin-bottom: 80px;';
      
      const link = document.createElement('a');
      link.href = post.permalink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.cssText = positionStyle + ' display: block; position: relative; width: ' + style.width + '; aspect-ratio: ' + style.aspectRatio + '; overflow: hidden; background: #f3f4f6; transition: all 0.3s ease; text-decoration: none;';
      
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
  });
  })();
  `;

  res.status(200).send(scriptContent);
}