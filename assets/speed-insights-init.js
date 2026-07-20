// Vercel Speed Insights initialization
// This script loads the Speed Insights library and initializes it
(function() {
  'use strict';
  
  // Import and initialize Speed Insights using dynamic import
  import('./speed-insights.mjs')
    .then((module) => {
      // Initialize Speed Insights
      if (module && module.injectSpeedInsights) {
        module.injectSpeedInsights({
          debug: false, // Set to true for development debugging
          sampleRate: 1 // Send all events (can be reduced to save costs)
        });
      }
    })
    .catch((error) => {
      console.error('Failed to load Speed Insights:', error);
    });
})();
