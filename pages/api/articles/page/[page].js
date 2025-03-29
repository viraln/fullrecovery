import { getAllArticles } from '../../../../utils/articleUtils';

// Add caching to improve performance
export const config = {
  runtime: 'nodejs',
};

// In-memory cache
const CACHE = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

export default async function handler(req, res) {
  try {
    const { page } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    
    // Check cache first
    const cacheKey = `page_${pageNum}_limit_${limit}`;
    const cachedData = CACHE.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return res.status(200).json(cachedData.data);
    }
    
    // Get paginated articles
    const result = await getAllArticles({
      paginate: true,
      page: pageNum,
      limit
    });
    
    // Store in cache
    CACHE.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    // Return paginated data
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in paginated articles API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch articles',
      message: error.message
    });
  }
} 