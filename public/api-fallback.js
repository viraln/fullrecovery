// API fallback for static site builds
// This script loads static JSON files generated during build instead of making API requests

(function() {
  console.log('[API Fallback] Static site mode - Installing API fallback');

  // Path to the static data directory
  const STATIC_DATA_BASE = '/static-data';

  // Helper to safely parse URL parameters
  function getQueryParams(url) {
    try {
      const searchParams = new URLSearchParams(url.split('?')[1] || '');
      return Object.fromEntries(searchParams.entries());
    } catch (error) {
      console.error('[API Fallback] Error parsing query params:', error);
      return {};
    }
  }

  // Function to safely fetch static data
  async function fetchStaticData(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch static data: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[API Fallback] Error fetching static data from ${path}:`, error);
      return null;
    }
  }

  // Define mapping for API URLs to static data files
  const staticDataMap = [
    // Home page articles
    {
      pattern: /\/api\/articles$/,
      getStaticPath: () => `${STATIC_DATA_BASE}/articles.json`
    },
    
    // Paginated articles
    {
      pattern: /\/api\/articles\/page\/(\d+)/,
      getStaticPath: (matches, queryParams) => {
        const page = matches[1] || '1';
        return `${STATIC_DATA_BASE}/articles-page-${page}.json`;
      }
    },
    
    // Single article
    {
      pattern: /\/api\/article\/([^\/\?]+)/,
      getStaticPath: (matches) => {
        const slug = matches[1];
        return `${STATIC_DATA_BASE}/articles/${slug}.json`;
      }
    },
    
    // Topics list
    {
      pattern: /\/api\/topics$/,
      getStaticPath: () => `${STATIC_DATA_BASE}/topics.json`
    },
    
    // Single topic - pattern 1
    {
      pattern: /\/api\/topic\/([^\/\?]+)$/,
      getStaticPath: (matches) => {
        const topicSlug = matches[1];
        return `${STATIC_DATA_BASE}/topics/${topicSlug}/index.json`;
      }
    },
    
    // Single topic - pattern 2
    {
      pattern: /\/api\/topics\/([^\/\?]+)$/,
      getStaticPath: (matches) => {
        const topicSlug = matches[1];
        return `${STATIC_DATA_BASE}/topics/${topicSlug}/index.json`;
      }
    },
    
    // Subtopic - pattern 1
    {
      pattern: /\/api\/subtopic\/([^\/]+)\/([^\/\?]+)/,
      getStaticPath: (matches) => {
        const topicSlug = matches[1];
        const subtopicSlug = matches[2];
        return `${STATIC_DATA_BASE}/topics/${topicSlug}/${subtopicSlug}.json`;
      }
    },
    
    // Subtopic - pattern 2
    {
      pattern: /\/api\/topics\/([^\/]+)\/([^\/\?]+)/,
      getStaticPath: (matches) => {
        const topicSlug = matches[1];
        const subtopicSlug = matches[2];
        return `${STATIC_DATA_BASE}/topics/${topicSlug}/${subtopicSlug}.json`;
      }
    },
    
    // Preload cache
    {
      pattern: /\/api\/preload-cache/,
      getStaticPath: () => `${STATIC_DATA_BASE}/preload-cache.json`
    }
  ];

  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(url, options) {
    try {
      // Only intercept API requests
      if (typeof url === 'string' && url.includes('/api/')) {
        console.log(`[API Fallback] Intercepting API request: ${url}`);
        
        // Find a matching static data file
        let staticPath = null;
        let matches = null;
        
        for (const mapping of staticDataMap) {
          matches = url.match(mapping.pattern);
          if (matches) {
            const queryParams = getQueryParams(url);
            staticPath = mapping.getStaticPath(matches, queryParams);
            break;
          }
        }
        
        if (staticPath) {
          console.log(`[API Fallback] Loading static data from: ${staticPath}`);
          
          // Fetch the static data file
          const data = await fetchStaticData(staticPath);
          
          if (data) {
            // Return the static data
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => data
            });
          } else {
            console.warn(`[API Fallback] Failed to load static data from ${staticPath}`);
          }
        } else {
          console.warn(`[API Fallback] No static data mapping found for: ${url}`);
        }
        
        // If we couldn't find or load static data, use original fetch
        return originalFetch.apply(this, arguments);
      }
      
      // For non-API requests, use the original fetch
      return originalFetch.apply(this, arguments);
    } catch (error) {
      console.error('[API Fallback] Error in fetch interceptor:', error);
      
      // If there's an error, try the original fetch as a fallback
      try {
        return originalFetch.apply(this, arguments);
      } catch (secondError) {
        // If original fetch also fails, return a graceful error
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal server error' })
        });
      }
    }
  };
  
  console.log('[API Fallback] Static data fallback initialized successfully');
})(); 