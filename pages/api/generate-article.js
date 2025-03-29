/**
 * Generate Article API Endpoint
 * 
 * This API route handles requests to generate new articles on demand.
 * Supports both GET and POST methods:
 * - GET: /api/generate-article?topic=Topic Name
 * - POST: /api/generate-article with JSON body { topic: "Topic Name" }
 * 
 * The endpoint calls the generateArticle function from our Gemini script
 * and returns the article information including title, slug, and filename.
 */

import { generateArticleApi } from '../../scripts/generate-article-gemini';

// API endpoint for generating articles
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, additionalInfo } = req.body;

    // Validate inputs
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // In a production app, this would call an AI service to generate content
    // For now, we'll simulate the generation process
    
    console.log(`Generating article for topic: ${topic}`);
    console.log(`Additional info: ${additionalInfo || 'None provided'}`);
    
    // Simulate API processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a simulated response
    const articleData = {
      title: `Understanding ${topic} in Today's World`,
      excerpt: `Discover the latest insights and trends about ${topic}. This comprehensive guide covers everything you need to know about ${topic} in ${new Date().getFullYear()}.`,
      content: `# Understanding ${topic} in Today's World\n\nIn today's rapidly evolving landscape, ${topic} has become increasingly important...\n\n## Why ${topic} Matters\n\nExperts agree that ${topic} will continue to shape our future in profound ways...\n\n## Key Trends in ${topic}\n\n1. Innovation and disruption\n2. Technological integration\n3. Sustainable practices\n\n## The Future of ${topic}\n\nAs we look ahead, it's clear that ${topic} will continue to transform industries and create new opportunities...`,
      topic,
      generated: true,
      timestamp: new Date().toISOString()
    };

    // Return the generated article
    return res.status(200).json({ 
      success: true,
      article: articleData
    });
  } catch (error) {
    console.error('Article generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Configure longer timeout for article generation (5 minutes)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: false,
    externalResolver: true,
  },
}; 