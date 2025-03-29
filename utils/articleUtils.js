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
const ARTICLES_PER_PAGE = 20;
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
 * Get related articles based on categories, tags, or content similarity
 * @param {string[]} keywords - Keywords to match
 * @param {string} currentSlug - Slug of the current article (to exclude from results)
 * @param {number} limit - Maximum number of articles to return
 * @returns {Promise<Array>} - Array of related articles
 */
export async function getRelatedArticles(keywords = [], currentSlug, limit = 3) {
  try {
    // Check if we already have these recommendations cached
    const cacheKey = `related_${currentSlug}_${limit}`;
    if (RECOMMENDATION_CACHE.has(cacheKey)) {
      const { data, timestamp } = RECOMMENDATION_CACHE.get(cacheKey);
      // Use cache if not expired
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
      // Otherwise continue and update the cache
    }
    
    // Instead of scanning all files every time, use a subset of pre-indexed articles
    // First ensure we have loaded the initial cache
    if (!isInitialCacheLoaded) {
      await preloadArticleCache();
    }
    
    // We'll use the cached articles we already have rather than reading all files
    const articlesData = [];
    
    // Get a list of all filenames if not already stored
    if (!cachedArticlesList) {
      const files = fs.readdirSync(path.join(process.cwd(), 'content/articles'));
      cachedArticlesList = files;
    }
    
    // Use the files we've already cached, plus maybe load a few more
    // First use what we already have in cache
    for (const [filename, frontMatter] of articleCache.entries()) {
      // Skip current post
      if (frontMatter.slug === currentSlug) continue;
      
      // Calculate a relevance score based on keyword match
      let relevanceScore = 0;
      
      // Check keyword matches
      if (keywords && keywords.length > 0) {
        // Check in post keywords
        const postKeywords = frontMatter.keywords || [];
        for (const keyword of keywords) {
          // Check exact matches in keywords array
          if (postKeywords.includes(keyword)) {
            relevanceScore += 3;
          }
          // Check for partial matches in keywords
          else if (postKeywords.some(k => k.includes(keyword))) {
            relevanceScore += 1;
          }
          
          // Check in title
          if (frontMatter.title && frontMatter.title.includes(keyword)) {
            relevanceScore += 2;
          }
          
          // Check in excerpt
          if (frontMatter.excerpt && frontMatter.excerpt.includes(keyword)) {
            relevanceScore += 1;
          }
        }
      }
      
      // Check category match
      if (frontMatter.categories && Array.isArray(frontMatter.categories)) {
        relevanceScore += frontMatter.categories.length; // More categories means more potential overlap
      }
      
      // Boost trending or featured posts
      if (frontMatter.trending) relevanceScore += 3;
      if (frontMatter.featured) relevanceScore += 2;
      
      articlesData.push({
        slug: frontMatter.slug || filename.replace(/\.md$/, ''),
        title: frontMatter.title || 'Untitled',
        excerpt: frontMatter.excerpt || '',
        date: frontMatter.date || new Date().toISOString(),
        image: frontMatter.image || '/placeholder.jpg',
        category: frontMatter.category || 'Uncategorized',
        readingTime: frontMatter.readingTime || 3,
        relevanceScore
      });
    }
    
    // If we don't have enough related articles yet, load a few more
    if (articlesData.length < limit * 3) { // Load more to ensure we have enough good matches
      // Get uncached files to check
      const uncachedFiles = cachedArticlesList.filter(filename => !articleCache.has(filename));
      
      // Load maximum 50 additional files to check for better matches
      const filesToCheck = uncachedFiles.slice(0, 50); 
      
      for (const filename of filesToCheck) {
        try {
          // Skip directories
          const filePath = path.join(process.cwd(), 'content/articles', filename);
          const stats = fs.statSync(filePath);
          if (!stats.isFile()) continue;
          
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const { data } = matter(fileContents);
          
          // Store in cache for future use
          articleCache.set(filename, data);
          
          // Skip current post
          if (data.slug === currentSlug) continue;
          
          // Calculate relevance score (same logic as above)
          let relevanceScore = 0;
          
          if (keywords && keywords.length > 0) {
            const postKeywords = data.keywords || [];
            for (const keyword of keywords) {
              if (postKeywords.includes(keyword)) {
                relevanceScore += 3;
              } else if (postKeywords.some(k => k.includes(keyword))) {
                relevanceScore += 1;
              }
              
              if (data.title && data.title.includes(keyword)) {
                relevanceScore += 2;
              }
              
              if (data.excerpt && data.excerpt.includes(keyword)) {
                relevanceScore += 1;
              }
            }
          }
          
          if (data.categories && Array.isArray(data.categories)) {
            relevanceScore += data.categories.length;
          }
          
          if (data.trending) relevanceScore += 3;
          if (data.featured) relevanceScore += 2;
          
          articlesData.push({
            slug: data.slug || filename.replace(/\.md$/, ''),
            title: data.title || 'Untitled',
            excerpt: data.excerpt || '',
            date: data.date || new Date().toISOString(),
            image: data.image || '/placeholder.jpg',
            category: data.category || 'Uncategorized',
            readingTime: data.readingTime || 3,
            relevanceScore
          });
        } catch (error) {
          console.error(`Error processing file ${filename} for related articles:`, error);
        }
      }
    }
    
    // Sort by relevance score (higher is better)
    articlesData.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Get limited results
    const results = articlesData.slice(0, limit);
    
    // Store in cache
    RECOMMENDATION_CACHE.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });
    
    // Trim cache if it's too large
    if (RECOMMENDATION_CACHE.size > MAX_CACHE_SIZE) {
      // Find the oldest entry
      let oldestKey = null;
      let oldestTime = Date.now();
      
      for (const [key, { timestamp }] of RECOMMENDATION_CACHE.entries()) {
        if (timestamp < oldestTime) {
          oldestTime = timestamp;
          oldestKey = key;
        }
      }
      
      // Remove the oldest entry
      if (oldestKey) {
        RECOMMENDATION_CACHE.delete(oldestKey);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in getRelatedArticles:', error);
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
    
    // Store the list of files for later pagination - already sorted by newest first
    cachedArticlesList = files;
    
    // Only preload a small initial batch (first page)
    const initialBatch = files.slice(0, ARTICLES_PER_PAGE);
    
    console.log(`Preloading initial batch of ${initialBatch.length} articles out of ${files.length}...`);
    
    for (const filename of initialBatch) {
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
          
          // Build slug-to-filename index for faster lookups
          if (data.slug) {
            slugToFilenameMap.set(data.slug, filename);
          }
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
        .slice(0, 50); // Ensure we at least have 50 recent ones
        
      console.log(`Preloading ${recentArticleFiles.length} additional recent articles...`);
      
      for (const filename of recentArticleFiles) {
        // Skip if already loaded
        if (articleCache.has(filename)) continue;
        
        try {
          const filePath = path.join(process.cwd(), 'content/articles', filename);
          if (!fs.statSync(filePath).isFile()) continue;
          
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
          
          // Add to slug mapping
          if (data.slug) {
            slugToFilenameMap.set(data.slug, filename);
          }
          
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
 * @returns {Object|null} - Article data or null if not found
 */
export async function getArticleBySlug(slug) {
  try {
    // Performance optimization #1: Direct lookup from slug map
    if (slugToFilenameMap.has(slug)) {
      const targetFilename = slugToFilenameMap.get(slug);
      try {
        const filePath = path.join(process.cwd(), 'content/articles', targetFilename);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContents);
        
        return {
          frontMatter: data,
          content,
          slug: data.slug || slug
        };
      } catch (error) {
        // If file access fails, remove from map and continue with other methods
        slugToFilenameMap.delete(slug);
        console.log(`File lookup failed for cached slug ${slug}, falling back to other methods`);
      }
    }
    
    // Performance optimization #2: Check existing cache by examining frontMatter slugs
    // If we already know which file contains this slug, use it directly
    let targetFilename = null;
    for (const [filename, data] of articleCache.entries()) {
      if (data.slug === slug) {
        targetFilename = filename;
        // Add to slug map for future lookups
        slugToFilenameMap.set(slug, filename);
        break;
      }
    }
    
    // If we found the file in our cache, read it directly
    if (targetFilename) {
      const filePath = path.join(process.cwd(), 'content/articles', targetFilename);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);
      
      return {
        frontMatter: data,
        content,
        slug: data.slug || targetFilename.replace(/\.md$/, '')
      };
    }
    
    // Performance optimization #3: Try direct filename match without reading content
    const directFilePath = path.join(process.cwd(), 'content/articles', `${slug}.md`);
    if (fs.existsSync(directFilePath)) {
      const fileContents = fs.readFileSync(directFilePath, 'utf8');
      const { data, content } = matter(fileContents);
      
      // Add to cache and slug map for future use
      articleCache.set(`${slug}.md`, data);
      slugToFilenameMap.set(slug, `${slug}.md`);
      
      return {
        frontMatter: data,
        content,
        slug: data.slug || slug
      };
    }
    
    // Third attempt: Look for timestamp-prefixed files that end with the slug
    if (cachedArticlesList === null) {
      // Initialize the list if needed
      cachedArticlesList = fs.readdirSync(path.join(process.cwd(), 'content/articles'));
    }
    
    // Optimization #4: Try pattern matching on filenames before reading contents
    const potentialMatch = cachedArticlesList.find(file => {
      // Try several patterns:
      // 1. File ends with slug.md (for timestamp prefixed files)
      if (file.endsWith(`-${slug}.md`)) return true;
      
      // 2. File has slug embedded (for timestamp plus slug files)
      const slugPattern = new RegExp(`-${slug}(\\.md|\\.mdx)$`);
      return slugPattern.test(file);
    });
    
    if (potentialMatch) {
      const filePath = path.join(process.cwd(), 'content/articles', potentialMatch);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);
      
      // Add to cache and slug map for future use
      articleCache.set(potentialMatch, data);
      slugToFilenameMap.set(slug, potentialMatch);
      if (data.slug) {
        slugToFilenameMap.set(data.slug, potentialMatch);
      }
      
      return {
        frontMatter: data,
        content,
        slug: data.slug || slug
      };
    }
    
    // Optimization #5: Smart search by sorting files by likelihood 
    // Check files from newest first (assuming timestamp prefixed filenames)
    // and limit to only 100 files for even faster performance
    let filesToCheck = [];
    if (cachedArticlesList.length > 0) {
      // Try to find files that might contain the slug in the name first
      const potentialFiles = cachedArticlesList.filter(file => 
        file.includes(slug) || 
        file.includes(slug.replace(/-/g, '')) ||
        file.includes(slug.replace(/-/g, ' '))
      );
      
      if (potentialFiles.length > 0) {
        // If we have potential matches, check those first
        filesToCheck = potentialFiles;
      } else {
        // Otherwise sort by timestamp and check newest 100
        const sortedFiles = [...cachedArticlesList].sort((a, b) => {
          try {
            // Try to extract dates from filenames for sorting (newest first)
            const dateA = a.match(/^\d{4}-\d{2}-\d{2}/);
            const dateB = b.match(/^\d{4}-\d{2}-\d{2}/);
            
            if (dateA && dateB) {
              return dateB[0].localeCompare(dateA[0]);
            }
            return 0;
          } catch (error) {
            return 0;
          }
        });
        
        filesToCheck = sortedFiles.slice(0, 100);
      }
    }
    
    // Last resort: Check a limited number of files
    for (const filename of filesToCheck) {
      try {
        // Skip directories
        const filePath = path.join(process.cwd(), 'content/articles', filename);
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) continue;
        
        // Use cached data if available
        let frontMatter;
        if (articleCache.has(filename)) {
          frontMatter = articleCache.get(filename);
        } else {
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const { data } = matter(fileContents);
          frontMatter = data;
          // Store in cache for future use
          articleCache.set(filename, frontMatter);
        }
        
        if (frontMatter.slug === slug || filename.replace(/\.md$/, '') === slug) {
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const { content } = matter(fileContents);
          
          // Add to slug map for future lookups
          slugToFilenameMap.set(slug, filename);
          if (frontMatter.slug) {
            slugToFilenameMap.set(frontMatter.slug, filename);
          }
          
          return {
            frontMatter,
            content,
            slug: frontMatter.slug || filename.replace(/\.md$/, '')
          };
        }
      } catch (error) {
        console.error(`Error processing file ${filename} for article by slug:`, error);
      }
    }
    
    console.error(`Article not found for slug: ${slug}`);
    return null;
  } catch (error) {
    console.error('Error in getArticleBySlug:', error);
    return null;
  }
} 