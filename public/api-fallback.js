// api-fallback.js - Handles API failures with fallback data
// This script monitors fetch requests and provides fallback data when API endpoints fail

(function() {
  if (typeof window === 'undefined') return;
  
  console.log('API Fallback: Initializing API fallback handler');
  
  // Store original fetch function
  const originalFetch = window.fetch;
  
  // Helper function to generate a mock post
  function generateMockPost(index = 0, page = 0) {
    // Ensure index and page are valid numbers
    index = parseInt(index) || 0;
    page = parseInt(page) || 0;
    
    const categories = ['Tech', 'AI & ML', 'Science', 'Business', 'Innovation', 'Gaming', 'Lifestyle'];
    const topics = [
      ['technology', 'software', 'gadgets', 'digital-transformation'], 
      ['artificial-intelligence', 'machine-learning', 'neural-networks', 'data-science'],
      ['research', 'space', 'biology', 'physics'],
      ['startups', 'entrepreneurship', 'finance', 'marketing'],
      ['future-tech', 'sustainability', 'smart-cities', 'renewable-energy'],
      ['video-games', 'game-development', 'esports', 'gaming-culture'],
      ['health', 'wellness', 'travel', 'food']
    ];
    
    const categoryIndex = Math.abs(index % categories.length);
    const category = categories[categoryIndex];
    const topicIndex = Math.abs(index % 4);
    const topic = topics[categoryIndex][topicIndex];
    
    return {
      slug: `mock-post-${page}-${index}`,
      title: `Example ${category} Article ${page}-${index}`,
      excerpt: `This is a mock article about ${topic} created as a fallback when the API is unavailable.`,
      date: new Date(Date.now() - (index * 86400000)).toISOString(),
      image: 'https://source.unsplash.com/random/800x600/?tech',
      readingTime: 3 + (index % 5),
      category: category,
      topics: [topic],
      subtopics: [topics[categoryIndex][(index + 1) % 4]],
      metadata: {
        featured: index === 0,
        trending: index < 3
      }
    };
  }
  
  // Helper function to generate a batch of mock posts
  function generateMockPosts(count = 10, page = 0) {
    return Array.from({ length: count }, (_, i) => generateMockPost(i, page));
  }
  
  // Define patterns to match API routes
  const postsApiPattern = /^\/api\/posts(\?|$)/;
  const postsNetlifyPattern = /^\/.netlify\/functions\/posts(\?|$)/;
  const articleApiPattern = /^\/api\/articles\/([^\/]+)$/;
  const articlePageApiPattern = /^\/api\/articles\/page\/(\d+)(\?|$)/;
  const preloadCacheApiPattern = /^\/api\/preload-cache(\?|$)/;
  
  // Overriding fetch to handle API failures
  window.fetch = async function(url, options) {
    try {
      // For API routes in static export, provide fallback immediately without attempting fetch
      if (typeof url === 'string') {
        // Check if this is one of our API routes
        const isApiRoute = postsApiPattern.test(url) || 
                          postsNetlifyPattern.test(url) || 
                          articleApiPattern.test(url) ||
                          articlePageApiPattern.test(url) ||
                          preloadCacheApiPattern.test(url);
        
        if (isApiRoute) {
          console.log(`[API Fallback] Static site mode: Providing mock data for: ${url}`);
          
          // Handle /api/preload-cache endpoint
          if (preloadCacheApiPattern.test(url)) {
            return new Response(JSON.stringify({ success: true, message: "Mock preload cache" }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Handle /api/articles/page/:page endpoint
          const pageMatch = url.match(articlePageApiPattern);
          if (pageMatch) {
            const page = parseInt(pageMatch[1], 10);
            const urlObj = new URL(url, window.location.origin);
            const limit = parseInt(urlObj.searchParams.get('limit') || '20', 10);
            
            return new Response(JSON.stringify({
              articles: generateMockPosts(limit, page),
              hasMore: page < 5,
              totalArticles: 100
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Handle /api/posts endpoint
          if (postsApiPattern.test(url) || postsNetlifyPattern.test(url)) {
            // Parse query parameters
            const urlObj = new URL(url, window.location.origin);
            const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
            const limit = parseInt(urlObj.searchParams.get('limit') || '10', 10);
            
            // Generate mock posts
            const mockPosts = generateMockPosts(limit, page);
            
            // Create mock response
            return new Response(JSON.stringify({
              posts: mockPosts,
              hasMore: page < 5, // Limit to 5 pages of mock data
              totalPosts: 50
            }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
          
          // Handle /api/articles/:slug endpoint
          const articleMatch = url.match(articleApiPattern);
          if (articleMatch) {
            const slug = articleMatch[1];
            console.log(`[API Fallback] Providing mock data for article API request: ${slug}`);
            
            try {
              // Generate a more detailed article based on the slug
              let index = 0;
              let page = 0;
              
              // Try to extract numeric values from the slug if possible
              const parts = slug.split('-');
              if (parts.length > 1) {
                const numericParts = parts.filter(part => !isNaN(parseInt(part)));
                if (numericParts.length > 0) {
                  index = parseInt(numericParts[0]);
                  if (numericParts.length > 1) {
                    page = parseInt(numericParts[1]);
                  }
                }
              }
              
              const mockArticle = {
                slug: slug,
                title: `${slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
                excerpt: `This is mock content for the article "${slug.replace(/-/g, ' ')}" that couldn't be found.`,
                date: new Date(Date.now() - (index * 86400000)).toISOString(),
                image: 'https://source.unsplash.com/random/800x600/?tech',
                readingTime: 3 + (index % 5),
                category: 'Technology',
                topics: ['technology'],
                subtopics: ['web-development'],
                content: `
# ${slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

This is mock content for an article that couldn't be found. The API endpoint returned a 404 error, so this fallback content was generated instead.

## Introduction

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultrices, nunc nisl aliquet nunc, vitae aliquam nisl nunc vitae nisl.

## Main Section

- Point one about this topic
- Second important consideration
- Third key insight

## Conclusion

In conclusion, this mock article demonstrates the fallback mechanism for missing content.
                `,
                authorName: 'API Fallback Generator',
                authorBio: 'This content was automatically generated when the requested article was not found.'
              };
              
              // Create mock response
              return new Response(JSON.stringify(mockArticle), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json'
                }
              });
            } catch (error) {
              console.error('[API Fallback] Error generating mock article:', error);
              
              // Return a simpler fallback if there's an error in generating mock data
              return new Response(JSON.stringify({
                slug: slug,
                title: 'Fallback Article',
                excerpt: 'This is a basic fallback article.',
                date: new Date().toISOString(),
                image: 'https://source.unsplash.com/random/800x600/?tech',
                readingTime: 3,
                category: 'General',
                content: '# Fallback Article\n\nThis is a basic fallback article content.'
              }), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json'
                }
              });
            }
          }
        }
      }
      
      // If it's not a recognized API route, proceed with original fetch
      const response = await originalFetch(url, options);
      
      // If it's a 404 from our API routes, provide a fallback
      if (!response.ok && response.status === 404) {
        if (typeof url === 'string') {
          // We already handled the recognized API patterns above, 
          // but if we get here with a 404, just pass through the error
          return response;
        }
      }
      
      return response;
    } catch (error) {
      console.error('[API Fallback] Fetch error:', error);
      
      // For network errors, provide fallbacks
      if (typeof url === 'string') {
        // We already handle the API routes proactively above,
        // this is just an additional layer for network errors
        if (postsApiPattern.test(url) || postsNetlifyPattern.test(url)) {
          console.log(`[API Fallback] Providing mock data for failed posts API request: ${url}`);
          
          // Parse query parameters (handle string URLs)
          const urlObj = new URL(url, window.location.origin);
          const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
          const limit = parseInt(urlObj.searchParams.get('limit') || '10', 10);
          
          // Generate mock posts
          const mockPosts = generateMockPosts(limit, page);
          
          // Create mock response
          return new Response(JSON.stringify({
            posts: mockPosts,
            hasMore: page < 5,
            totalPosts: 50
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        
        // Handle article API fallback for network errors
        const articleMatch = url.match(articleApiPattern);
        if (articleMatch) {
          const slug = articleMatch[1];
          console.log(`[API Fallback] Providing mock data for failed article API request: ${slug}`);
          
          // Basic fallback that won't throw errors
          return new Response(JSON.stringify({
            slug: slug,
            title: 'Network Error Fallback',
            excerpt: 'This content was generated due to a network error.',
            date: new Date().toISOString(),
            image: 'https://source.unsplash.com/random/800x600/?tech',
            readingTime: 3,
            category: 'General',
            content: '# Network Error\n\nThis content was generated because of a network error.'
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        
        // Handle /api/articles/page/:page endpoint
        const pageMatch = url.match(articlePageApiPattern);
        if (pageMatch) {
          const page = parseInt(pageMatch[1], 10);
          
          return new Response(JSON.stringify({
            articles: generateMockPosts(20, page),
            hasMore: page < 5,
            totalArticles: 100
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Handle preload cache endpoint
        if (preloadCacheApiPattern.test(url)) {
          return new Response(JSON.stringify({ success: true, message: "Mock preload cache" }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Re-throw the error for other cases
      throw error;
    }
  };
  
  console.log('API Fallback: Handler initialized successfully');
})(); 