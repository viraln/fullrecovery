/**
 * Infinite Articles Function
 * 
 * This Netlify function handles paginated article requests for the infinite loading feature.
 * It supports filtering by topic/subtopic, sorting, and pagination.
 */

const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');

// Headers to enable CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// Cache for articles to avoid reading files repeatedly
let articlesCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse query parameters
    const params = event.queryStringParameters || {};
    const page = parseInt(params.page, 10) || 1;
    const limit = parseInt(params.limit, 10) || 20;
    const topic = params.topic || null;
    const subtopic = params.subtopic || null;
    const sort = params.sort || 'latest'; // latest, trending, popular
    
    // Get all articles
    const articles = await getAllArticles();
    
    // Apply filters
    let filteredArticles = articles;
    
    // Filter by topic if specified
    if (topic) {
      filteredArticles = filteredArticles.filter(article => {
        // Check topics array
        if (article.topics && Array.isArray(article.topics)) {
          return article.topics.some(t => 
            t.toLowerCase() === topic.toLowerCase() ||
            t.toLowerCase().includes(topic.toLowerCase())
          );
        }
        
        // Check main category
        if (article.category) {
          return article.category.toLowerCase() === topic.toLowerCase() ||
                 article.category.toLowerCase().includes(topic.toLowerCase());
        }
        
        return false;
      });
    }
    
    // Further filter by subtopic if specified
    if (topic && subtopic) {
      filteredArticles = filteredArticles.filter(article => {
        // Check subtopics array
        if (article.subtopics && Array.isArray(article.subtopics)) {
          return article.subtopics.some(s => 
            s.toLowerCase() === subtopic.toLowerCase() ||
            s.toLowerCase().includes(subtopic.toLowerCase())
          );
        }
        
        // Check if title contains subtopic
        if (article.title) {
          return article.title.toLowerCase().includes(subtopic.toLowerCase());
        }
        
        return false;
      });
    }
    
    // Apply sorting
    if (sort === 'latest') {
      filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sort === 'trending') {
      // Sort by trending flag first, then by date
      filteredArticles.sort((a, b) => {
        if (a.trending && !b.trending) return -1;
        if (!a.trending && b.trending) return 1;
        return new Date(b.date) - new Date(a.date);
      });
    } else if (sort === 'popular') {
      // Sort by views (or a popularity metric)
      filteredArticles.sort((a, b) => (b.views || 0) - (a.views || 0));
    }
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedArticles = filteredArticles.slice(startIndex, endIndex);
    
    // Format the results for the API response
    const formattedArticles = paginatedArticles.map(article => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      date: article.date,
      image: article.image || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60',
      readingTime: article.readingTime || 3,
      category: article.category || 'General',
      trending: article.trending || false,
      views: article.views || Math.floor(Math.random() * 1000) + 100,
    }));
    
    // Return the results
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        articles: formattedArticles,
        currentPage: page,
        totalPages: Math.ceil(filteredArticles.length / limit),
        totalArticles: filteredArticles.length,
        hasMore: endIndex < filteredArticles.length
      })
    };
  } catch (error) {
    console.error('Error in infinite-articles function:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to fetch articles',
        message: error.message
      })
    };
  }
};

/**
 * Get all articles from the content directory
 */
async function getAllArticles() {
  // Check if we have a valid cache
  const now = Date.now();
  if (articlesCache && (now - lastCacheTime < CACHE_TTL)) {
    return articlesCache;
  }
  
  const contentDir = path.join(__dirname, 'content/articles');
  
  // Ensure the directory exists
  if (!fs.existsSync(contentDir)) {
    console.warn(`Content directory not found: ${contentDir}`);
    return [];
  }
  
  try {
    // Read all files in the content directory
    const files = fs.readdirSync(contentDir);
    
    // Parse each markdown file
    const articles = files
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const filePath = path.join(contentDir, file);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        
        // Parse frontmatter
        const { data, content } = matter(fileContents);
        
        // Extract slug from filename
        const slug = file.replace(/\.md$/, '');
        
        // Add random view count for sorting by popularity
        const views = Math.floor(Math.random() * 1000) + 100;
        
        // Determine if trending (random or based on metadata)
        const trending = data.trending || Math.random() > 0.7;
        
        return {
          ...data,
          slug,
          content,
          views,
          trending
        };
      });
    
    // Update cache
    articlesCache = articles;
    lastCacheTime = now;
    
    return articles;
  } catch (error) {
    console.error('Error reading article files:', error);
    return [];
  }
} 