// API fallback for static site builds
// This script generates mock data for API requests when running in static mode

(function() {
  console.log('[API Fallback] Static site mode - Installing API fallback');

  // Helper functions for generating mock data
  const generateRandomString = (length = 8) => {
    return Math.random().toString(36).substring(2, length + 2);
  };

  const ensureString = (value, defaultValue = '') => {
    return typeof value === 'string' ? value : defaultValue;
  };

  const ensureNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return !isNaN(num) ? num : defaultValue;
  };

  const ensureArray = (value, defaultValue = []) => {
    return Array.isArray(value) ? value : defaultValue;
  };

  const ensureBoolean = (value, defaultValue = false) => {
    return typeof value === 'boolean' ? value : defaultValue;
  };

  const randomDate = () => {
    const start = new Date('2022-01-01');
    const end = new Date();
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
  };
  
  // Generate random post data
  const generatePostData = (count = 20, withDetails = false) => {
    const categories = ['Technology', 'AI', 'Web Development', 'Design', 'Business', 'Productivity', 'Future'];
    const authors = ['John Doe', 'Jane Smith', 'David Johnson', 'Sarah Williams', 'Michael Brown'];
    
    return Array.from({ length: count }, (_, i) => {
      // Generate a safe title that always exists and is a string
      const title = `Article ${i + 1}: ${generateRandomString(20)}`;
      
      // Generate a safe slug from the title
      const slug = `article-${i + 1}-${generateRandomString(8)}`;
      
      // Base post object with complete properties
      const post = {
        id: i + 1,
        title: title,
        slug: slug,
        excerpt: `This is a summary of article ${i + 1}. It provides a brief overview of the content.`,
        content: withDetails ? `# ${title}\n\nThis is the full content of article ${i + 1}. It contains detailed information about the topic.` : undefined,
        date: randomDate(),
        image: `https://picsum.photos/seed/${slug}/800/600`,
        category: categories[Math.floor(Math.random() * categories.length)],
        categories: [categories[Math.floor(Math.random() * categories.length)], categories[Math.floor(Math.random() * categories.length)]],
        author: authors[Math.floor(Math.random() * authors.length)],
        readingTime: Math.floor(Math.random() * 15) + 3,
        views: Math.floor(Math.random() * 1000) + 100,
        trending: Math.random() > 0.7,
        featured: Math.random() > 0.8,
        popular: Math.random() > 0.6,
        timeToRead: Math.floor(Math.random() * 15) + 3,
        keywords: ['technology', 'trends', 'innovation'],
        topic: {
          name: categories[Math.floor(Math.random() * categories.length)],
          slug: `topic-${Math.floor(Math.random() * 5) + 1}`
        },
        subtopic: {
          name: `Subtopic ${Math.floor(Math.random() * 3) + 1}`,
          slug: `subtopic-${Math.floor(Math.random() * 3) + 1}`
        }
      };
      
      return post;
    });
  };
  
  // Generate topic data with subtopics
  const generateTopicData = (slug) => {
    // Ensure slug is a string
    const safeSlug = ensureString(slug, 'default-topic');
    
    const topicNames = {
      'artificial-intelligence': 'Artificial Intelligence',
      'blockchain': 'Blockchain',
      'cybersecurity': 'Cybersecurity',
      'web-development': 'Web Development',
      'data-science': 'Data Science',
      'default-topic': 'Technology'
    };
    
    // Generate subtopics for this topic
    const generateSubtopics = () => {
      const subtopicsMap = {
        'artificial-intelligence': [
          { id: 'machine-learning', name: 'Machine Learning', slug: 'machine-learning', icon: '🤖', hasContent: true },
          { id: 'neural-networks', name: 'Neural Networks', slug: 'neural-networks', icon: '🧠', hasContent: true },
          { id: 'computer-vision', name: 'Computer Vision', slug: 'computer-vision', icon: '👁️', hasContent: true }
        ],
        'blockchain': [
          { id: 'cryptocurrencies', name: 'Cryptocurrencies', slug: 'cryptocurrencies', icon: '💰', hasContent: true },
          { id: 'smart-contracts', name: 'Smart Contracts', slug: 'smart-contracts', icon: '📝', hasContent: true },
          { id: 'defi', name: 'DeFi', slug: 'defi', icon: '🏦', hasContent: true }
        ],
        'default-topic': [
          { id: 'gadgets', name: 'Gadgets', slug: 'gadgets', icon: '📱', hasContent: true },
          { id: 'software', name: 'Software', slug: 'software', icon: '💻', hasContent: true },
          { id: 'innovation', name: 'Innovation', slug: 'innovation', icon: '💡', hasContent: true }
        ]
      };
      
      return subtopicsMap[safeSlug] || subtopicsMap['default-topic'];
    };
    
    return {
      id: safeSlug,
      name: topicNames[safeSlug] || 'Technology Topic',
      slug: safeSlug,
      description: `Explore the latest developments in ${topicNames[safeSlug] || 'technology'}.`,
      icon: '🔥',
      image: `https://picsum.photos/seed/${safeSlug}/800/600`,
      subtopics: generateSubtopics(),
      articles: generatePostData(10),
      hasContent: true
    };
  };
  
  // Generate subtopic data
  const generateSubtopicData = (topicSlug, subtopicSlug) => {
    // Ensure slugs are strings
    const safeTopicSlug = ensureString(topicSlug, 'default-topic');
    const safeSubtopicSlug = ensureString(subtopicSlug, 'default-subtopic');
    
    const subtopicNames = {
      'machine-learning': 'Machine Learning',
      'neural-networks': 'Neural Networks',
      'computer-vision': 'Computer Vision',
      'cryptocurrencies': 'Cryptocurrencies',
      'smart-contracts': 'Smart Contracts',
      'default-subtopic': 'Technology Subtopic'
    };
    
    return {
      id: safeSubtopicSlug,
      name: subtopicNames[safeSubtopicSlug] || 'Technology Subtopic',
      slug: safeSubtopicSlug,
      description: `Explore the latest developments in ${subtopicNames[safeSubtopicSlug] || 'this technology area'}.`,
      icon: '🔥',
      image: `https://picsum.photos/seed/${safeSubtopicSlug}/800/600`,
      parentTopic: {
        slug: safeTopicSlug,
        name: safeTopicSlug.replace(/-/g, ' ')
      },
      articles: generatePostData(8),
      hasContent: true
    };
  };

  // Mock API responses
  const mockResponses = [
    // Home page content
    {
      pattern: /\/api\/articles$/,
      handler: () => ({
        articles: generatePostData(12),
        totalPages: 10
      })
    },
    
    // Article pages by pagination
    {
      pattern: /\/api\/articles\/page\/(\d+)/,
      handler: (url, matches) => {
        const page = parseInt(matches[1]) || 1;
        
        // Extract search params if any
        const searchParams = new URLSearchParams(url.split('?')[1] || '');
        const limit = parseInt(searchParams.get('limit') || '20');
        
        return {
          articles: generatePostData(limit),
          currentPage: page,
          totalPages: 10
        };
      }
    },
    
    // Single article
    {
      pattern: /\/api\/article\/([^\/\?]+)/,
      handler: (url, matches) => {
        const slug = matches[1] || 'default-article';
        
        const article = generatePostData(1, true)[0];
        article.slug = slug;
        article.title = `Article: ${slug.replace(/-/g, ' ')}`;
        
        return {
          article,
          related: generatePostData(3)
        };
      }
    },
    
    // Topics list
    {
      pattern: /\/api\/topics$/,
      handler: () => ({
        topics: [
          { id: 'artificial-intelligence', name: 'Artificial Intelligence', slug: 'artificial-intelligence', hasContent: true },
          { id: 'blockchain', name: 'Blockchain', slug: 'blockchain', hasContent: true },
          { id: 'cybersecurity', name: 'Cybersecurity', slug: 'cybersecurity', hasContent: true },
          { id: 'web-development', name: 'Web Development', slug: 'web-development', hasContent: true },
          { id: 'data-science', name: 'Data Science', slug: 'data-science', hasContent: true }
        ]
      })
    },
    
    // Single topic pattern 1
    {
      pattern: /\/api\/topic\/([^\/\?]+)/,
      handler: (url, matches) => ({
        topic: generateTopicData(matches[1])
      })
    },
    
    // Single topic pattern 2
    {
      pattern: /\/api\/topics\/([^\/\?]+)$/,
      handler: (url, matches) => ({
        topic: generateTopicData(matches[1])
      })
    },
    
    // Subtopic pattern 1
    {
      pattern: /\/api\/subtopic\/([^\/]+)\/([^\/\?]+)/,
      handler: (url, matches) => ({
        subtopic: generateSubtopicData(matches[1], matches[2])
      })
    },
    
    // Subtopic pattern 2
    {
      pattern: /\/api\/topics\/([^\/]+)\/([^\/\?]+)/,
      handler: (url, matches) => ({
        subtopic: generateSubtopicData(matches[1], matches[2])
      })
    },
    
    // Preload cache
    {
      pattern: /\/api\/preload-cache/,
      handler: () => ({
        success: true,
        message: 'Cache preloaded successfully (mock)'
      })
    }
  ];

  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(url, options) {
    try {
      // Only intercept API requests
      if (typeof url === 'string' && url.includes('/api/')) {
        console.log(`[API Fallback] Intercepting API request: ${url}`);
        
        // Find a matching handler
        let responseData = null;
        for (const handler of mockResponses) {
          const matches = url.match(handler.pattern);
          if (matches) {
            try {
              responseData = handler.handler(url, matches);
              break;
            } catch (error) {
              console.error(`[API Fallback] Error in handler for ${url}:`, error);
              // Continue to next handler or use default response
            }
          }
        }
        
        // If no specific handler found or handler returned null, return a generic response
        if (!responseData) {
          console.log(`[API Fallback] No specific handler for ${url}, returning generic data`);
          responseData = {
            articles: generatePostData(10),
            currentPage: 1,
            totalPages: 5
          };
        } else {
          // Log what we're returning
          console.log(`[API Fallback] Returning mock data for ${url}`);
        }
        
        // Return a mock response
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => responseData
            });
          }, 300); // Add a small delay to mimic network request
        });
      }
      
      // For non-API requests, use the original fetch
      return originalFetch.apply(this, arguments);
    } catch (error) {
      console.error('[API Fallback] Error in fetch interceptor:', error);
      
      // Return a graceful error response
      return new Promise(resolve => {
        resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal server error' })
        });
      });
    }
  };
  
  console.log('[API Fallback] API fallback initialized successfully');
})(); 