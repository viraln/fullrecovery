import { getAllArticles, getArticleBySlug } from '../../../utils/articleUtils';

// Add caching to improve performance
export const config = {
  runtime: 'nodejs',
};

// In-memory cache
const CACHE = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

export default async function handler(req, res) {
  try {
    // Support both GET and POST methods
    let slugs = [];
    
    if (req.method === 'POST') {
      // Extract slugs from POST body
      slugs = req.body.slugs || [];
    } else if (req.method === 'GET') {
      // Extract slugs from query string (comma-separated)
      const slugString = req.query.slugs;
      if (slugString) {
        slugs = slugString.split(',').map(s => s.trim());
      }
    }
    
    if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
      return res.status(400).json({ error: 'Invalid request. Provide an array of slugs.' });
    }
    
    // Check cache first
    const cacheKey = `batch_${slugs.sort().join('_')}`;
    const cachedData = CACHE.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return res.status(200).json(cachedData.data);
    }
    
    // Limit batch size to prevent abuse
    const batchLimit = 20;
    const limitedSlugs = slugs.slice(0, batchLimit);
    
    // If we're requesting more than 5 articles, use getAllArticles for efficiency
    let requestedArticles = [];
    
    if (limitedSlugs.length > 5) {
      // Get all articles first (we have optimized caching in this function)
      const allArticles = await getAllArticles({ limit: 100 });
      
      // Filter to just the requested slugs
      requestedArticles = allArticles.filter(article => 
        limitedSlugs.includes(article.slug)
      );
    } else {
      // For small batches, just get them individually (uses cache)
      const articlePromises = limitedSlugs.map(async (slug) => {
        try {
          const article = await getArticleBySlug(slug);
          if (!article) return null;
          
          return {
            slug: article.slug,
            title: article.frontMatter.title,
            excerpt: article.frontMatter.excerpt,
            date: article.frontMatter.date,
            image: article.frontMatter.image,
            category: article.frontMatter.category,
            readingTime: article.frontMatter.readingTime
          };
        } catch (error) {
          console.error(`Error fetching article ${slug}:`, error);
          return null;
        }
      });
      
      const articles = await Promise.all(articlePromises);
      requestedArticles = articles.filter(article => article !== null);
    }
    
    const responseData = {
      articles: requestedArticles,
      timestamp: new Date().toISOString()
    };
    
    // Store in cache
    CACHE.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });
    
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in batch articles API:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch articles batch',
      message: error.message
    });
  }
} 