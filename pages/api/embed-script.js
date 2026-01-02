export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const scriptContent = `
(function() {
  'use strict';
  
  const API_BASE = 'https://ig-feed-widget-six.vercel.app';
  
  console.log('Instagram Widget: Initializing...');
  
  const containers = document.querySelectorAll('[data-ig-feed]');
  
  if (containers.length === 0) {
    console.warn('Instagram Widget: No containers found with [data-ig-feed] attribute');
    return;
  }
  
  containers.forEach(function(container, index) {
    const maxPosts = container.getAttribute('data-max-posts') || '30';
    
    // Show loading state
    container.innerHTML = '<div style="text-align: center; padding: 60px; color: #999;"><div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #e1306c; border-radius: 50%; animation: spin 1s linear infinite;"></div><p style="margin-top: 20px;">Loading Instagram feed...</p></div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>';
    
    // Fetch HTML content
    const url = API_BASE + '/api/embed-html?limit=' + encodeURIComponent(maxPosts);
    
    console.log('Instagram Widget: Fetching from', url);
    
    fetch(url)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.text();
      })
      .then(function(html) {
        container.innerHTML = html;
        console.log('Instagram Widget: Feed #' + index + ' loaded successfully');
      })
      .catch(function(error) {
        console.error('Instagram Widget: Failed to load feed #' + index, error);
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #e53e3e;">Failed to load Instagram feed. Please try again later.</div>';
      });
  });
  
  console.log('Instagram Widget: Script loaded');
})();
  `;

  res.status(200).send(scriptContent);
}