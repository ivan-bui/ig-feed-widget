export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const scriptContent = `
(function() {
  'use strict';
  
  // Configuration
  const WIDGET_ORIGIN = 'https://ig-feed-widget-six.vercel.app';
  const EMBED_PATH = '/embed';
  
  console.log('Instagram Widget: Initializing...');
  
  // Find all Instagram feed containers
  const containers = document.querySelectorAll('[data-ig-feed]');
  
  if (containers.length === 0) {
    console.warn('Instagram Widget: No containers found with [data-ig-feed] attribute');
    return;
  }
  
  console.log('Instagram Widget: Found ' + containers.length + ' container(s)');
  
  // Store iframe references
  const iframeMap = new Map();
  
  containers.forEach(function(container, index) {
    // Get configuration from data attributes
    const maxPosts = container.getAttribute('data-max-posts') || '';
    const embedId = 'ig-feed-' + Date.now() + '-' + index;
    
    // Build iframe URL
    let iframeUrl = WIDGET_ORIGIN + EMBED_PATH;
    const params = [];
    
    if (maxPosts) {
      params.push('limit=' + encodeURIComponent(maxPosts));
    }
    
    if (params.length > 0) {
      iframeUrl += '?' + params.join('&');
    }
    
    console.log('Instagram Widget: Creating iframe #' + index + ' with URL:', iframeUrl);
    
    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.id = embedId;
    iframe.src = iframeUrl;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('title', 'Instagram Feed');
    iframe.style.cssText = 'width: 100%; border: none; display: block; overflow: hidden; min-height: 600px;';
    
    // Store iframe reference
    iframeMap.set(iframe.contentWindow, iframe);
    
    // Clear container and append iframe
    container.innerHTML = '';
    container.appendChild(iframe);
    
    // Listen for iframe load
    iframe.addEventListener('load', function() {
      console.log('Instagram Widget: Iframe #' + index + ' loaded');
      
      // Request initial height from iframe
      setTimeout(function() {
        iframe.contentWindow.postMessage({ type: 'getHeight' }, WIDGET_ORIGIN);
      }, 500);
    });
    
    console.log('Instagram Widget: Embedded feed #' + index);
  });
  
  // Set up message listener for iframe resizing
  window.addEventListener('message', function(event) {
    // Security: verify origin
    if (event.origin !== WIDGET_ORIGIN) {
      return;
    }
    
    console.log('Instagram Widget: Received message:', event.data);
    
    // Handle resize messages
    if (event.data && event.data.type === 'resize') {
      const height = event.data.height;
      
      if (!height || height < 100) {
        console.warn('Instagram Widget: Invalid height received:', height);
        return;
      }
      
      // Find the iframe that sent the message
      const iframes = document.querySelectorAll('iframe[src^="' + WIDGET_ORIGIN + '"]');
      iframes.forEach(function(iframe) {
        try {
          if (iframe.contentWindow === event.source) {
            const newHeight = height + 'px';
            iframe.style.height = newHeight;
            iframe.style.minHeight = newHeight;
            console.log('Instagram Widget: Resized iframe to ' + newHeight);
          }
        } catch (e) {
          console.error('Instagram Widget: Error resizing iframe:', e);
        }
      });
    }
  });
  
  console.log('Instagram Widget: Script loaded successfully');
})();
  `;

  res.status(200).send(scriptContent);
}