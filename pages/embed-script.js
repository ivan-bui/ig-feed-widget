export default function EmbedScript() {
    return null; // This page doesn't render HTML
}

export async function getServerSideProps({ res }) {
    // Set headers for JavaScript file
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin

    const scriptContent = `
(function() {
  'use strict';
  
  // Configuration
  const WIDGET_ORIGIN = 'https://ig-feed-widget-six.vercel.app';
  const EMBED_PATH = '/embed';
  
  // Find all Instagram feed containers
  const containers = document.querySelectorAll('[data-ig-feed]');
  
  if (containers.length === 0) {
    console.warn('Instagram Widget: No containers found with [data-ig-feed] attribute');
    return;
  }
  
  containers.forEach(function(container, index) {
    // Get configuration from data attributes
    const maxPosts = container.getAttribute('data-max-posts') || '';
    const embedId = container.getAttribute('data-embed-id') || 'ig-feed-' + index;
    
    // Build iframe URL
    let iframeUrl = WIDGET_ORIGIN + EMBED_PATH;
    const params = [];
    
    if (maxPosts) {
      params.push('limit=' + encodeURIComponent(maxPosts));
    }
    
    if (params.length > 0) {
      iframeUrl += '?' + params.join('&');
    }
    
    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.id = embedId;
    iframe.src = iframeUrl;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('title', 'Instagram Feed');
    iframe.style.cssText = 'width: 100%; border: none; display: block; overflow: hidden; min-height: 400px;';
    
    // Clear container and append iframe
    container.innerHTML = '';
    container.appendChild(iframe);
    
    // Log successful embed
    console.log('Instagram Widget: Embedded feed #' + index, {
      url: iframeUrl,
      maxPosts: maxPosts || 'default'
    });
  });
  
  // Set up message listener for iframe resizing
  window.addEventListener('message', function(event) {
    // Security: verify origin
    if (event.origin !== WIDGET_ORIGIN) {
      return;
    }
    
    // Handle resize messages
    if (event.data && event.data.type === 'resize' && event.data.height) {
      // Find all iframes and update the one that sent the message
      const iframes = document.querySelectorAll('iframe[src^="' + WIDGET_ORIGIN + '"]');
      iframes.forEach(function(iframe) {
        if (iframe.contentWindow === event.source) {
          iframe.style.height = event.data.height + 'px';
          console.log('Instagram Widget: Resized to ' + event.data.height + 'px');
        }
      });
    }
  });
  
  console.log('Instagram Widget: Script loaded successfully');
})();
  `;

    res.write(scriptContent);
    res.end();

    return { props: {} };
}