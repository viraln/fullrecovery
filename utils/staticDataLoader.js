/**
 * Static Data Loader
 * 
 * A utility to load static data on the client-side.
 * This replaces API calls during static site export.
 */

// Cache for loaded data
const dataCache = new Map();

/**
 * Load data from static JSON files
 * Falls back to API if static data isn't available
 * 
 * @param {string} apiPath - The API path to load data from
 * @returns {Promise<any>} The loaded data
 */
export async function loadStaticData(apiPath) {
  // If we already have this data in cache, return it
  if (dataCache.has(apiPath)) {
    return dataCache.get(apiPath);
  }
  
  try {
    // Map API path to static data path
    const staticPath = mapApiPathToStaticPath(apiPath);
    
    // First try to fetch from the static path
    if (staticPath) {
      try {
        const response = await fetch(staticPath);
        if (response.ok) {
          const data = await response.json();
          dataCache.set(apiPath, data);
          return data;
        }
      } catch (staticError) {
        console.warn(`Static data not available for ${apiPath}, falling back to API`);
      }
    }
    
    // If static data doesn't exist or fails, fall back to API
    const response = await fetch(apiPath);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    dataCache.set(apiPath, data);
    return data;
  } catch (error) {
    console.error(`Error loading data for ${apiPath}:`, error);
    throw error;
  }
}

/**
 * Map API paths to static data paths
 */
function mapApiPathToStaticPath(apiPath) {
  const STATIC_DATA_BASE = '/static-data';
  
  // Home page articles
  if (apiPath === '/api/articles') {
    return `${STATIC_DATA_BASE}/articles.json`;
  }
  
  // Paginated articles
  const pageMatch = apiPath.match(/\/api\/articles\/page\/(\d+)(\?.*)?$/);
  if (pageMatch) {
    const page = pageMatch[1];
    return `${STATIC_DATA_BASE}/articles-page-${page}.json`;
  }
  
  // Single article
  const articleMatch = apiPath.match(/\/api\/article\/([^\/\?]+)/);
  if (articleMatch) {
    const slug = articleMatch[1];
    return `${STATIC_DATA_BASE}/articles/${slug}.json`;
  }
  
  // Topics list
  if (apiPath === '/api/topics') {
    return `${STATIC_DATA_BASE}/topics.json`;
  }
  
  // Single topic - pattern 1
  const topicMatch1 = apiPath.match(/\/api\/topic\/([^\/\?]+)$/);
  if (topicMatch1) {
    const topicSlug = topicMatch1[1];
    return `${STATIC_DATA_BASE}/topics/${topicSlug}/index.json`;
  }
  
  // Single topic - pattern 2
  const topicMatch2 = apiPath.match(/\/api\/topics\/([^\/\?]+)$/);
  if (topicMatch2) {
    const topicSlug = topicMatch2[1];
    return `${STATIC_DATA_BASE}/topics/${topicSlug}/index.json`;
  }
  
  // Subtopic - pattern 1
  const subtopicMatch1 = apiPath.match(/\/api\/subtopic\/([^\/]+)\/([^\/\?]+)/);
  if (subtopicMatch1) {
    const topicSlug = subtopicMatch1[1];
    const subtopicSlug = subtopicMatch1[2];
    return `${STATIC_DATA_BASE}/topics/${topicSlug}/${subtopicSlug}.json`;
  }
  
  // Subtopic - pattern 2
  const subtopicMatch2 = apiPath.match(/\/api\/topics\/([^\/]+)\/([^\/\?]+)/);
  if (subtopicMatch2) {
    const topicSlug = subtopicMatch2[1];
    const subtopicSlug = subtopicMatch2[2];
    return `${STATIC_DATA_BASE}/topics/${topicSlug}/${subtopicSlug}.json`;
  }
  
  // Preload cache
  if (apiPath === '/api/preload-cache') {
    return `${STATIC_DATA_BASE}/preload-cache.json`;
  }
  
  // If no match, return null
  return null;
}

/**
 * Check if we're in static export mode
 * This is used to determine whether to use static data or API
 */
export function isStaticMode() {
  if (typeof window === 'undefined') {
    // Always use API in server context
    return false;
  }
  
  // Check for environment variable
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') {
    return true;
  }
  
  // During development, NextJS doesn't set output mode
  // So we use window.location to check if we're in a static export
  const { hostname } = window.location;
  return hostname === 'localhost' || 
         hostname.includes('netlify') || 
         hostname.includes('vercel') ||
         hostname === '127.0.0.1';
}

/**
 * Fetch wrapper that uses static data when available
 * Drop-in replacement for fetch for API calls
 */
export async function staticFetch(url, options) {
  if (typeof url === 'string' && url.includes('/api/') && isStaticMode()) {
    try {
      const data = await loadStaticData(url);
      return {
        ok: true,
        status: 200,
        json: async () => data
      };
    } catch (error) {
      console.error(`Error in staticFetch for ${url}:`, error);
      throw error;
    }
  }
  
  // Fall back to regular fetch
  return fetch(url, options);
} 