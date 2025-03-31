import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAllPosts } from './mdx';

// Simple in-memory cache for recommendation results
const RECOMMENDATION_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
const MAX_CACHE_SIZE = 100; // Maximum number of recommendation sets to cache

// Create a cache for articles to prevent repeated disk reads
const articleCache = new Map();

// Add pagination state
const ARTICLES_PER_PAGE = 100;
let cachedArticlesList = null;
let isInitialCacheLoaded = false;

// Export the cache and article list for use in other files
export { articleCache, cachedArticlesList };

// Add a slug-to-filename mapping for fast lookup
const slugToFilenameMap = new Map();

export function getRelativeTime(date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

/**
 * Get related articles based on category and keywords
 * @param {string} category - The category to match
 * @param {string} currentSlug - The current article's slug to exclude
 * @param {number} limit - Maximum number of articles to return
 * @returns {Promise<Array>} - Array of related article objects
 */
export async function getRelatedArticles(category, currentSlug, limit = 3) {
  try {
    // Ensure cache is loaded
    if (!isInitialCacheLoaded) {
      try {
        preloadArticleCacheSync();
      } catch (error) {
        console.error('Failed to preload article cache in getRelatedArticles:', error);
      }
    }
    
    // Initialize results array
    const relatedArticles = [];
    
    // First, try to find articles in the same category
    if (category) {
      for (const [filename, data] of articleCache.entries()) {
        // Skip current article and ensure slug exists
        if (!data.slug || data.slug === currentSlug) continue;
        
        // Match by category
        if (data.category === category) {
          // Add to related articles
          relatedArticles.push({
            slug: data.slug,
            title: data.title || 'Untitled Article',
            excerpt: data.excerpt || '',
            date: data.date || new Date().toISOString(),
            image: data.image || '/images/default-article.jpg',
            category: data.category || 'Uncategorized',
            readingTime: data.readingTime || 3
          });
          
          // Break if we have enough articles
          if (relatedArticles.length >= limit) break;
        }
      }
    }
    
    // If we don't have enough articles by category, add recent articles
    if (relatedArticles.length < limit) {
      // Get recent articles that are not already included
      const existingSlugs = new Set(relatedArticles.map(article => article.slug));
      existingSlugs.add(currentSlug); // Exclude current article
      
      // Get recent articles from the cached list
      for (const filename of cachedArticlesList) {
        // Skip if we have enough articles
        if (relatedArticles.length >= limit) break;
        
        // Get article data from cache
        const data = articleCache.get(filename);
        if (!data || !data.slug || existingSlugs.has(data.slug)) continue;
        
        // Add to related articles
        relatedArticles.push({
          slug: data.slug,
          title: data.title || 'Untitled Article',
          excerpt: data.excerpt || '',
          date: data.date || new Date().toISOString(),
          image: data.image || '/images/default-article.jpg',
          category: data.category || 'Uncategorized',
          readingTime: data.readingTime || 3
        });
        
        // Mark as included
        existingSlugs.add(data.slug);
      }
    }
    
    // Sort related articles by date (newest first)
    relatedArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return relatedArticles;
  } catch (error) {
    console.error('Error getting related articles:', error);
    return [];
  }
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Format a date in a human-readable format
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date
 */
export function formatDate(date) {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Generate an excerpt from content
 * @param {string} content - Content to generate excerpt from
 * @param {number} length - Maximum length of excerpt
 * @returns {string} - Generated excerpt
 */
export function generateExcerpt(content, length = 160) {
  if (!content) return '';
  
  // Remove Markdown formatting
  const plainText = content
    .replace(/#+\s+(.*?)\n/g, '') // Remove headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Remove links
    .replace(/!\[(.*?)\]\((.*?)\)/g, '') // Remove images
    .replace(/```([\s\S]*?)```/g, '') // Remove code blocks
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/-\s+(.*?)\n/g, '$1 ') // Replace list items with their text
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .trim();
  
  // Get the first 'length' characters
  if (plainText.length <= length) {
    return plainText;
  }
  
  // Find the last space before the length limit
  const lastSpace = plainText.lastIndexOf(' ', length);
  
  // If no space is found, just cut at the length
  const excerpt = lastSpace > 0 ? plainText.substring(0, lastSpace) : plainText.substring(0, length);
  
  return excerpt + '...';
}

// Helper function to get engagement score (placeholder - implement based on your analytics)
function getArticleEngagementScore(slug) {
  // This is a placeholder - in a real implementation you would:
  // 1. Read from your analytics/engagement database
  // 2. Calculate a score based on page views, time spent, comments, shares, etc.
  // 3. Apply time decay to favor recent engagement
  return 0; // Replace with real implementation when available
}

// Helper function to ensure diverse recommendations
function diversifyRecommendations(scoredArticles, limitCount) {
  if (scoredArticles.length <= limitCount) {
    return scoredArticles; // Not enough articles to diversify
  }
  
  // Start with the highest scoring article
  const result = [scoredArticles[0]];
  const usedCategories = new Set([scoredArticles[0].primaryCategory]);
  const usedTerms = new Set(scoredArticles[0].keyTerms);
  
  // Process remaining articles
  const remainingArticles = scoredArticles.slice(1);
  
  // Continue until we have enough recommendations
  while (result.length < limitCount && remainingArticles.length > 0) {
    // Find index of the best next article for diversity
    let bestDiversityIndex = 0;
    let bestDiversityScore = -1;
    
    for (let i = 0; i < remainingArticles.length; i++) {
      const article = remainingArticles[i];
      
      // Calculate how different this article is from already selected ones
      let diversityScore = 0;
      
      // Reward different categories
      if (!usedCategories.has(article.primaryCategory)) {
        diversityScore += 2;
      }
      
      // Reward different key terms
      const termOverlapCount = article.keyTerms.filter(term => usedTerms.has(term)).length;
      diversityScore += (5 - termOverlapCount); // Higher score for less overlap
      
      // Balance diversity with relevance (original score)
      const finalScore = (diversityScore * 0.3) + (article.score * 0.7);
      
      if (finalScore > bestDiversityScore) {
        bestDiversityScore = finalScore;
        bestDiversityIndex = i;
      }
    }
    
    // Add the best diverse article
    const selectedArticle = remainingArticles[bestDiversityIndex];
    result.push(selectedArticle);
    
    // Update tracking sets
    usedCategories.add(selectedArticle.primaryCategory);
    selectedArticle.keyTerms.forEach(term => usedTerms.add(term));
    
    // Remove the selected article from candidates
    remainingArticles.splice(bestDiversityIndex, 1);
  }
  
  return result;
}

/**
 * Gets all articles with optional filtering
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} - Array of article objects
 */
export async function getAllArticles(options = {}) {
  try {
    const { page = 1, limit = 20, skipCache = false } = options;
    
    // If using cache and we haven't loaded this page yet, load it now
    if (!skipCache && cachedArticlesList) {
      await loadArticleCachePage(page);
    }
    
    let files = fs.readdirSync(path.join(process.cwd(), 'content/articles'));
    
    // Sort files by their timestamp in filename (newer files first)
    files.sort((a, b) => {
      // Extract timestamp from filename if present
      const timestampRegexA = a.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      const timestampRegexB = b.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      
      const timestampA = timestampRegexA ? timestampRegexA[1] : null;
      const timestampB = timestampRegexB ? timestampRegexB[1] : null;
      
      // If both have timestamps, compare them (reverse order for newest first)
      if (timestampA && timestampB) {
        return timestampB.localeCompare(timestampA);
      }
      
      // If only one has a timestamp, prioritize that one
      if (timestampA) return -1; // A has timestamp, comes first
      if (timestampB) return 1;  // B has timestamp, comes first
      
      // Otherwise just sort by filename
      return b.localeCompare(a);
    });
    
    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, files.length);
    const paginatedFiles = options.paginate ? files.slice(startIndex, endIndex) : files;
    
    const articlesData = [];
    
    for (const filename of paginatedFiles) {
      try {
        // Skip directories
        const filePath = path.join(process.cwd(), 'content/articles', filename);
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) continue;
        
        // Use cached data if available
        let frontMatter;
        if (!skipCache && articleCache.has(filename)) {
          frontMatter = articleCache.get(filename);
        } else {
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const { data } = matter(fileContents);
          frontMatter = data;
          // Store in cache for future use
          articleCache.set(filename, frontMatter);
        }
        
        // Apply filters if provided
        if (options.category && frontMatter.category !== options.category) continue;
        if (options.featured && !frontMatter.featured) continue;
        if (options.trending && !frontMatter.trending) continue;
        
        // Extract timestamp from filename if present and use it as date if no date in frontMatter
        let date = frontMatter.date;
        if (!date) {
          const timestampRegex = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
          if (timestampRegex) {
            date = timestampRegex[1];
          } else {
            date = new Date().toISOString();
          }
        }
        
        const articleData = {
          slug: frontMatter.slug || filename.replace(/\.md$/, ''),
          title: frontMatter.title || 'Untitled',
          excerpt: frontMatter.excerpt || '',
          date: date,
          image: frontMatter.image || '/placeholder.jpg',
          category: frontMatter.category || 'Uncategorized',
          readingTime: frontMatter.readingTime || 3,
          categories: frontMatter.categories || []
        };
        
        articlesData.push(articleData);
      } catch (error) {
        console.error(`Error processing file ${filename} for all articles:`, error);
      }
    }
    
    // Secondary sort by date field (in case there are inconsistencies)
    articlesData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Add pagination metadata if requested
    if (options.paginate) {
      return {
        articles: articlesData,
        pagination: {
          page,
          limit,
          total: files.length,
          totalPages: Math.ceil(files.length / limit),
          hasMore: endIndex < files.length
        }
      };
    }
    
    return articlesData;
  } catch (error) {
    console.error('Error in getAllArticles:', error);
    return options.paginate ? { articles: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false } } : [];
  }
}

/**
 * Preloads article data to ensure it's available during navigation
 * Now with pagination to improve performance
 */
export async function preloadArticleCache() {
  try {
    // If we've already loaded the initial cache, return immediately
    if (isInitialCacheLoaded) {
      return;
    }
    
    console.time('preloadCache');
    
    // Check if content/articles directory exists
    let articleDir = path.join(process.cwd(), 'content/articles');
    if (!fs.existsSync(articleDir)) {
      console.warn(`Directory ${articleDir} not found. Articles may not be accessible.`);
      // Initialize empty arrays to prevent errors
      cachedArticlesList = [];
      isInitialCacheLoaded = true;
      console.timeEnd('preloadCache');
      return;
    }
    
    // Get all files in the articles directory
    let files = fs.readdirSync(articleDir);
    
    // Log the directory and number of files found
    console.log(`Found ${files.length} files in ${articleDir}`);
    
    // If no files were found, log a warning and exit early
    if (files.length === 0) {
      console.warn('No article files found in the content directory. This may cause "Article Not Found" errors.');
      cachedArticlesList = [];
      isInitialCacheLoaded = true;
      console.timeEnd('preloadCache');
      return;
    }
    
    // Sort files by their timestamp in filename (newer files first)
    files.sort((a, b) => {
      // Extract timestamp from filename if present
      const timestampRegexA = a.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      const timestampRegexB = b.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      
      const timestampA = timestampRegexA ? timestampRegexA[1] : null;
      const timestampB = timestampRegexB ? timestampRegexB[1] : null;
      
      // If both have timestamps, compare them (reverse order for newest first)
      if (timestampA && timestampB) {
        return timestampB.localeCompare(timestampA);
      }
      
      // If only one has a timestamp, prioritize that one
      if (timestampA) return -1; // A has timestamp, comes first
      if (timestampB) return 1;  // B has timestamp, comes first
      
      // Otherwise just sort by filename
      return b.localeCompare(a);
    });
    
    // Store the list of files for later pagination - already sorted by newest first
    cachedArticlesList = files;
    
    // Only preload a small initial batch (first page)
    const initialBatch = files.slice(0, ARTICLES_PER_PAGE);
    
    console.log(`Preloading initial batch of ${initialBatch.length} articles out of ${files.length}...`);
    
    for (const filename of initialBatch) {
      try {
        // Skip directories and check if file exists before processing
        const filePath = path.join(articleDir, filename);
        if (!fs.existsSync(filePath)) {
          console.warn(`File ${filePath} not found, skipping`);
          continue;
        }
        
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) continue;
        
        // Only load if not already cached
        if (!articleCache.has(filename)) {
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const { data } = matter(fileContents);
          
          // If no date is present in frontmatter, try to extract from filename
          if (!data.date) {
            const timestampRegex = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
            if (timestampRegex) {
              data.date = timestampRegex[1];
            }
          }
          
          // Make sure data.slug exists, otherwise extract from filename
          if (!data.slug) {
            const filenameParts = filename.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-(.*?)\.md$/);
            if (filenameParts && filenameParts[1]) {
              data.slug = filenameParts[1];
            } else {
              data.slug = filename.replace(/\.md$/, '');
            }
            console.log(`Generated slug '${data.slug}' for file ${filename}`);
          }
          
          articleCache.set(filename, data);
          
          // Build slug-to-filename index for faster lookups
          slugToFilenameMap.set(data.slug, filename);
          console.log(`Mapped slug '${data.slug}' to file ${filename}`);
          
          // Also index by filename without extension as fallback
          const filenameSlug = filename.replace(/\.md$/, '');
          // Check for timestamp prefix pattern and extract slug
          const timeStampMatch = filenameSlug.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-(.*?)$/);
          if (timeStampMatch && timeStampMatch[1]) {
            slugToFilenameMap.set(timeStampMatch[1], filename);
          } else {
            slugToFilenameMap.set(filenameSlug, filename);
          }
        }
      } catch (error) {
        console.error(`Error preloading article ${filename}:`, error);
      }
    }
    
    // Also preload some recently created or popular articles - these should already be at the top of our sorted list
    try {
      // We're already sorted by newest first, so we just need to get articles with timestamp-prefixed filenames
      const recentArticleFiles = cachedArticlesList
        .filter(file => /^\d{4}-\d{2}-\d{2}T/.test(file))
        .slice(0, 5000); // Increased from 50 to 5000
        
      console.log(`Preloading ${recentArticleFiles.length} additional recent articles...`);
      
      for (const filename of recentArticleFiles) {
        // Skip if already loaded
        if (articleCache.has(filename)) continue;
        
        try {
          const filePath = path.join(articleDir, filename);
          if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) continue;
          
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const { data } = matter(fileContents);
          
          // If no date is present in frontmatter, try to extract from filename
          if (!data.date) {
            const timestampRegex = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
            if (timestampRegex) {
              data.date = timestampRegex[1];
            }
          }
          
          // Make sure data.slug exists, otherwise extract from filename
          if (!data.slug) {
            const filenameParts = filename.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-(.*?)\.md$/);
            if (filenameParts && filenameParts[1]) {
              data.slug = filenameParts[1];
            } else {
              data.slug = filename.replace(/\.md$/, '');
            }
          }
          
          articleCache.set(filename, data);
          
          // Add to slug mapping
          slugToFilenameMap.set(data.slug, filename);
          
          // Extract slug from filename
          const filenameSlug = filename.replace(/\.md$/, '');
          const timeStampMatch = filenameSlug.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-(.*?)$/);
          if (timeStampMatch && timeStampMatch[1]) {
            slugToFilenameMap.set(timeStampMatch[1], filename);
          }
        } catch (error) {
          // Ignore errors
        }
      }
    } catch (error) {
      console.error('Error preloading recent articles:', error);
    }
    
    isInitialCacheLoaded = true;
    console.log(`Preloaded initial batch of ${articleCache.size} articles into cache`);
    console.log(`Built slug mapping with ${slugToFilenameMap.size} entries`);
    console.timeEnd('preloadCache');
  } catch (error) {
    console.error('Error preloading article cache:', error);
  }
}

/**
 * Loads the next page of articles into the cache
 * @param {number} page - The page number to load (1-based index)
 * @returns {Promise<number>} - The number of articles loaded
 */
export async function loadArticleCachePage(page = 1) {
  try {
    if (!cachedArticlesList) {
      // If we don't have the file list yet, initialize it
      await preloadArticleCache();
      return articleCache.size;
    }
    
    const startIndex = (page - 1) * ARTICLES_PER_PAGE;
    const endIndex = startIndex + ARTICLES_PER_PAGE;
    const pageFiles = cachedArticlesList.slice(startIndex, endIndex);
    
    if (pageFiles.length === 0) {
      // No more files to load
      return 0;
    }
    
    console.log(`Loading page ${page} with ${pageFiles.length} articles...`);
    
    let newlyLoaded = 0;
    for (const filename of pageFiles) {
      try {
        // Skip directories
        const filePath = path.join(process.cwd(), 'content/articles', filename);
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) continue;
        
        // Only load if not already cached
        if (!articleCache.has(filename)) {
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const { data } = matter(fileContents);
          
          // If no date is present in frontmatter, try to extract from filename
          if (!data.date) {
            const timestampRegex = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
            if (timestampRegex) {
              data.date = timestampRegex[1];
            }
          }
          
          articleCache.set(filename, data);
          newlyLoaded++;
        }
      } catch (error) {
        console.error(`Error loading article ${filename}:`, error);
      }
    }
    
    console.log(`Loaded ${newlyLoaded} additional articles into cache (total: ${articleCache.size})`);
    return newlyLoaded;
  } catch (error) {
    console.error('Error loading article cache page:', error);
    return 0;
  }
}

/**
 * Gets an article by slug
 * @param {string} slug - Article slug
 * @returns {Object} - Article data with safe fallbacks
 */
export function getArticleBySlug(slug) {
  try {
    // Validate slug input
    if (!slug || typeof slug !== 'string') {
      console.error(`Invalid slug provided to getArticleBySlug: ${slug}`);
      return createFallbackArticle(slug);
    }
    
    // Debug logging to help troubleshoot slug issues
    console.log(`Looking up article with slug: "${slug}"`);
    
    // Ensure the article cache is loaded
    if (!isInitialCacheLoaded) {
      console.warn('Article cache not loaded when getArticleBySlug was called');
      try {
        // Try to load it synchronously for static build
        preloadArticleCacheSync();
      } catch (error) {
        console.error('Failed to preload article cache synchronously:', error);
      }
    }
    
    // Debug the slug mapping size
    console.log(`Slug mapping size: ${slugToFilenameMap.size}`);
    
    // First try exact match from slug-to-filename mapping
    let filename = slugToFilenameMap.get(slug);
    
    // Log the result of the lookup
    if (filename) {
      console.log(`Found direct slug mapping: ${slug} -> ${filename}`);
    } else {
      console.log(`No direct slug mapping found for: "${slug}"`);
    }
    
    // If no exact match, try alternative approaches
    if (!filename) {
      // Try matching with normalized slug (lowercase, no special chars)
      const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // Check all entries in slugToFilenameMap with normalized comparison
      for (const [mapSlug, mapFilename] of slugToFilenameMap.entries()) {
        const normalizedMapSlug = mapSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (normalizedMapSlug === normalizedSlug) {
          filename = mapFilename;
          console.log(`Found normalized slug match: ${normalizedMapSlug} for "${slug}"`);
          break;
        }
      }
      
      // If still not found, look through all files in the content/articles directory
      if (!filename) {
        console.log('Attempting to search through all files for matching slug');
        try {
          const articleDir = path.join(process.cwd(), 'content/articles');
          if (fs.existsSync(articleDir)) {
            const allFiles = fs.readdirSync(articleDir);
            
            // First try to match by filename pattern
            const slugPattern = new RegExp(`\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z-${normalizedSlug.replace(/-/g, '[-_]')}(\\.md)?$`, 'i');
            const matchingFile = allFiles.find(file => slugPattern.test(file));
            
            if (matchingFile) {
              filename = matchingFile;
              console.log(`Found matching file by name pattern: ${matchingFile}`);
              
              // Update the slug mapping for future lookups
              slugToFilenameMap.set(slug, filename);
              
              // Also cache the article data if not already cached
              if (!articleCache.has(filename)) {
                try {
                  const filePath = path.join(articleDir, filename);
                  const fileContents = fs.readFileSync(filePath, 'utf8');
                  const { data } = matter(fileContents);
                  articleCache.set(filename, data);
                } catch (error) {
                  console.error(`Error caching article data for ${filename}:`, error);
                }
              }
            }
            
            // If still not found, try to check the frontmatter of each article (expensive but thorough)
            if (!filename) {
              for (const file of allFiles) {
                try {
                  const filePath = path.join(articleDir, file);
                  
                  // Skip if not a file
                  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) continue;
                  
                  // Skip non-markdown files
                  if (!file.endsWith('.md')) continue;
                  
                  // Only load articles not already in cache
                  if (!articleCache.has(file)) {
                    const fileContents = fs.readFileSync(filePath, 'utf8');
                    const { data } = matter(fileContents);
                    
                    // Cache this article
                    articleCache.set(file, data);
                    
                    // Check if this article has our slug
                    if (data.slug === slug || 
                        data.slug?.toLowerCase() === slug.toLowerCase()) {
                      filename = file;
                      slugToFilenameMap.set(slug, file);
                      console.log(`Found article by scanning frontmatter: ${file}`);
                      break;
                    }
                  }
                } catch (error) {
                  // Skip files with errors
                  console.error(`Error checking file ${file}:`, error);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error searching for article file:', error);
        }
      }
    }
    
    if (!filename) {
      console.warn(`No filename found for slug: "${slug}"`);
      return createFallbackArticle(slug);
    }
    
    // Now try to get the article data from cache
    const cachedArticleData = articleCache.get(filename);
    
    if (cachedArticleData) {
      try {
        // Get the full article content
        const articleContent = getArticleContent(filename);
        
        // Return combined data (frontmatter + content)
        return {
          ...cachedArticleData,
          slug: slug, // Ensure slug is set correctly
          content: articleContent
        };
      } catch (error) {
        console.error(`Error getting full article content for ${filename}:`, error);
        
        // Return just the metadata with empty content if we can't get the full content
        return {
          ...cachedArticleData,
          slug: slug,
          content: ''
        };
      }
    }
    
    console.warn(`Article cache miss for file: ${filename}`);
    
    // If not cached, read directly
    try {
      const fullPath = path.join(process.cwd(), 'content/articles', filename);
      if (!fs.existsSync(fullPath)) {
        console.error(`Article file not found: ${fullPath}`);
        return createFallbackArticle(slug);
      }
      
      // Read the file
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);
      
      // Cache the article data for future lookups
      articleCache.set(filename, data);
      
      // Ensure slug is consistent
      const articleData = {
        ...data,
        slug: slug,
        content: content || ''
      };
      
      return articleData;
    } catch (error) {
      console.error(`Error reading article file ${filename}:`, error);
      return createFallbackArticle(slug);
    }
  } catch (error) {
    console.error(`Error in getArticleBySlug for slug "${slug}":`, error);
    return createFallbackArticle(slug);
  }
}

/**
 * Create a fallback article when the actual article cannot be found
 * @param {string} slug - The slug that was requested
 * @returns {Object} - A fallback article object
 */
function createFallbackArticle(slug) {
  return {
    frontMatter: {
      title: 'Article Not Found',
      excerpt: 'We could not locate this article. It may have been moved or deleted.',
      date: new Date().toISOString(),
      image: 'https://Trendiingz.com/default-og-image.jpg',
      readingTime: 1,
      category: 'General',
      slug: slug,
      keywords: [],
      categories: []
    },
    content: `# Article Not Found\n\nWe could not locate the article you're looking for. It may have been moved, deleted, or the URL might be incorrect.\n\n[Return to home page](/)\n`,
    slug: slug
  };
}

/**
 * Gets the content portion of an article file
 * @param {string} filename - The filename of the article
 * @returns {string} - The article content
 */
function getArticleContent(filename) {
  try {
    if (!filename) {
      console.error('No filename provided to getArticleContent');
      return '';
    }
    
    const filePath = path.join(process.cwd(), 'content/articles', filename);
    if (!fs.existsSync(filePath)) {
      console.error(`Article file not found: ${filePath}`);
      return '';
    }
    
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { content } = matter(fileContents);
    
    return content || '';
  } catch (error) {
    console.error(`Error getting article content for ${filename}:`, error);
    return '';
  }
}

/**
 * Get related categories based on the current category
 * @param {string} currentCategory - The current article's category
 * @param {number} limit - Maximum number of categories to return
 * @returns {Promise<Array>} - Array of related category objects
 */
export async function getRelatedCategories(currentCategory, limit = 5) {
  try {
    if (!currentCategory) {
      return [];
    }
    
    // Get all available categories from our articles
    const categories = new Map();
    
    // Process all articles in the cache
    for (const [, data] of articleCache.entries()) {
      if (data.category && data.category !== currentCategory) {
        // Count articles in each category
        if (!categories.has(data.category)) {
          categories.set(data.category, 0);
        }
        categories.set(data.category, categories.get(data.category) + 1);
      }
    }
    
    // Convert to array and sort by popularity (number of articles)
    const sortedCategories = [...categories.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([category, count]) => ({
        name: category,
        slug: category.toLowerCase().replace(/\s+/g, '-'),
        count
      }));
    
    return sortedCategories;
  } catch (error) {
    console.error('Error getting related categories:', error);
    return [];
  }
}

/**
 * Synchronous version of preloadArticleCache for use in static builds
 * This is called when we need to immediately load the cache
 */
export function preloadArticleCacheSync() {
  try {
    // If already loaded, return immediately
    if (isInitialCacheLoaded) {
      return;
    }
    
    console.time('preloadCacheSync');
    
    // Check if content/articles directory exists
    let articleDir = path.join(process.cwd(), 'content/articles');
    if (!fs.existsSync(articleDir)) {
      console.warn(`Directory ${articleDir} not found. Articles may not be accessible.`);
      // Initialize empty arrays to prevent errors
      cachedArticlesList = [];
      isInitialCacheLoaded = true;
      console.timeEnd('preloadCacheSync');
      return;
    }
    
    // Get all files in the articles directory
    let files = fs.readdirSync(articleDir);
    
    // Log the directory and number of files found
    console.log(`Found ${files.length} files in ${articleDir}`);
    
    // Sort files by their timestamp in filename (newer files first)
    files.sort((a, b) => {
      // Extract timestamp from filename if present
      const timestampRegexA = a.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      const timestampRegexB = b.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      
      const timestampA = timestampRegexA ? timestampRegexA[1] : null;
      const timestampB = timestampRegexB ? timestampRegexB[1] : null;
      
      // If both have timestamps, compare them (reverse order for newest first)
      if (timestampA && timestampB) {
        return timestampB.localeCompare(timestampA);
      }
      
      // If only one has a timestamp, prioritize that one
      if (timestampA) return -1; // A has timestamp, comes first
      if (timestampB) return 1;  // B has timestamp, comes first
      
      // Otherwise just sort by filename
      return b.localeCompare(a);
    });
    
    // Store the list of files for later pagination - already sorted by newest first
    cachedArticlesList = files;
    
    // Process all files to build the slug map
    for (const filename of files) {
      try {
        // Skip directories
        const filePath = path.join(articleDir, filename);
        if (!fs.existsSync(filePath)) continue;
        
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) continue;
        
        // Skip non-markdown files
        if (!filename.endsWith('.md')) continue;
        
        // Read file contents
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContents);
        
        // Store in cache
        articleCache.set(filename, data);
        
        // If no date is present in frontmatter, try to extract from filename
        if (!data.date) {
          const timestampRegex = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
          if (timestampRegex) {
            data.date = timestampRegex[1];
          }
        }
        
        // Make sure data.slug exists, otherwise extract from filename
        if (!data.slug) {
          const filenameParts = filename.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-(.*?)\.md$/);
          if (filenameParts && filenameParts[1]) {
            data.slug = filenameParts[1];
          } else {
            data.slug = filename.replace(/\.md$/, '');
          }
        }
        
        // Add to slug mapping
        slugToFilenameMap.set(data.slug, filename);
        
        // Also index by filename without extension as fallback
        const filenameSlug = filename.replace(/\.md$/, '');
        const timeStampMatch = filenameSlug.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-(.*?)$/);
        if (timeStampMatch && timeStampMatch[1]) {
          slugToFilenameMap.set(timeStampMatch[1], filename);
        }
      } catch (error) {
        console.error(`Error processing file ${filename} in preloadArticleCacheSync:`, error);
      }
    }
    
    isInitialCacheLoaded = true;
    console.log(`Preloaded ${articleCache.size} articles into cache synchronously`);
    console.log(`Built slug mapping with ${slugToFilenameMap.size} entries`);
    console.timeEnd('preloadCacheSync');
  } catch (error) {
    console.error('Error in preloadArticleCacheSync:', error);
    throw error; // Re-throw to allow caller to handle
  }
} 