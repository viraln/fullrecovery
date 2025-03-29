/**
 * Utility for optimized data fetching with built-in
 * debouncing, deduplication, and batching
 */

// In-memory request cache
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache lifetime

// Batch queue for article slug requests
let batchQueue = [];
let batchTimer = null;
const BATCH_DELAY = 50; // 50ms delay to batch requests

/**
 * Process the batch queue of article slugs
 * @returns {Promise<void>}
 */
async function processBatchQueue() {
  if (batchQueue.length === 0) return;
  
  const currentBatch = [...batchQueue];
  batchQueue = [];
  
  try {
    const response = await fetch('/api/articles/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slugs: currentBatch.map(item => item.slug) }),
    });
    
    if (!response.ok) throw new Error('Failed to fetch batch articles');
    
    const data = await response.json();
    
    // Resolve all the promises in the batch
    currentBatch.forEach(({ slug, resolve, reject }) => {
      const article = data.articles.find(a => a.slug === slug);
      if (article) {
        // Store in cache
        cache.set(slug, {
          data: article,
          timestamp: Date.now()
        });
        resolve(article);
      } else {
        reject(new Error(`Article ${slug} not found in batch response`));
      }
    });
  } catch (error) {
    console.error('Error processing article batch:', error);
    // Reject all promises in the batch
    currentBatch.forEach(({ reject }) => {
      reject(error);
    });
  }
}

/**
 * Fetch an article by slug, with automatic batching
 * @param {string} slug - Article slug
 * @returns {Promise<Object>} - Article data
 */
export function fetchArticle(slug) {
  // Check cache first
  const cachedItem = cache.get(slug);
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    return Promise.resolve(cachedItem.data);
  }
  
  // Otherwise, add to batch queue
  return new Promise((resolve, reject) => {
    batchQueue.push({ slug, resolve, reject });
    
    // Clear existing timer and set a new one
    if (batchTimer) {
      clearTimeout(batchTimer);
    }
    
    batchTimer = setTimeout(() => {
      processBatchQueue();
    }, BATCH_DELAY);
  });
}

/**
 * Fetch multiple articles by slug in one request
 * @param {string[]} slugs - Array of article slugs
 * @returns {Promise<Object[]>} - Array of article data
 */
export function fetchArticles(slugs) {
  if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
    return Promise.resolve([]);
  }
  
  return fetch('/api/articles/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slugs }),
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch batch articles');
      return response.json();
    })
    .then(data => {
      // Store each article in cache
      data.articles.forEach(article => {
        cache.set(article.slug, {
          data: article,
          timestamp: Date.now()
        });
      });
      return data.articles;
    });
}

/**
 * Optimized fetch with caching
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - The response data
 */
export function cachedFetch(url, options = {}) {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  
  // Check cache first
  const cachedItem = cache.get(cacheKey);
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    return Promise.resolve(cachedItem.data);
  }
  
  // Otherwise, fetch and cache
  return fetch(url, options)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to fetch ${url}`);
      return response.json();
    })
    .then(data => {
      // Store in cache
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      return data;
    });
} 