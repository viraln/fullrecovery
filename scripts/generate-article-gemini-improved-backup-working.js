require('dotenv').config();
/**
 * Gemini Article Generator
 * 
 * This script generates high-quality, viral, SEO-optimized articles using Google's Gemini API.
 * 
 * Fixed issues:
 * - Updated the API endpoint from v1beta to v1 to match current Gemini API requirements
 * - Fixed the model name to use gemini-1.5-flash for better content generation
 * - Improved content parsing with more flexible regex patterns to handle various response formats
 * - Enhanced error handling for API responses
 * - Used proper request structure with role:'user' in the content object
 * 
 * Usage:
 * - Generate article on specific topic: node scripts/generate-article-gemini.js "Topic"
 * - Generate trending article in category: node scripts/generate-article-gemini.js "" "Category"
 * - Generate random trending article: node scripts/generate-article-gemini.js
 */
const fetch = require("node-fetch");
const fs = require("fs").promises;
const path = require("path");

// Constants
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';
const GEMINI_MODEL = 'gemini-1.5-flash'; // Using Gemini 1.5 Flash for better content generation

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retry = async (fn, retries = 5, initialDelay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            const delay = initialDelay * Math.pow(2, i);
            console.log(`Attempt ${i + 1} failed, retrying in ${delay/1000} seconds...`);
            await sleep(delay);
        }
    }
};

const sanitizeTitle = (text) => {
    // First, convert to lowercase and replace special characters
    const sanitized = text
        .toLowerCase()
        // Replace special characters with empty string
        .replace(/[^\w\s-]/g, '')
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove consecutive hyphens
        .replace(/-+/g, '-')
        .trim();
    
    // If title is still very long, trim it but preserve words
    if (sanitized.length > 100) {
        // Find the last hyphen within the first 100 chars
        const lastHyphenPos = sanitized.substring(0, 100).lastIndexOf('-');
        
        // If we found a hyphen, cut at that position, otherwise use 100 chars
        return lastHyphenPos > 50 ? sanitized.substring(0, lastHyphenPos) : sanitized.substring(0, 100);
    }
    
    return sanitized;
};

// Viral headline patterns based on research
const viralHeadlinePatterns = [
    "X Ways to [Achieve Desired Outcome]",
    "How to [Solve Problem] in [Timeframe]",
    "The Ultimate Guide to [Topic]",
    "Why [Conventional Wisdom] Is Wrong About [Topic]",
    "X Secrets [Authority] Doesn't Want You to Know About [Topic]",
    "What Nobody Tells You About [Topic]",
    "X [Topic] Trends to Watch in [Year]",
    "The Future of [Topic]: X Predictions for [Year]",
    "X Things You Need to Know About [Recent Development]",
    "How [Person/Company] Achieved [Impressive Result] Using [Method]"
];

// Placeholder images by category - keeping existing code
const placeholders = {
  // Technology Categories
  'Quantum Computing': [
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1510751007277-36932aac9ebd?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?auto=format&fit=crop&w=800&q=60'
  ],
  'Artificial Intelligence': [
    'https://images.unsplash.com/photo-1677442136019-21780ecad995',
    'https://images.unsplash.com/photo-1675557009875-436f7a7da77a',
    'https://images.unsplash.com/photo-1676277791608-ac54525aa94d'
  ],
  'Blockchain': [
    'https://images.unsplash.com/photo-1642784353782-b51b677fa381',
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0',
    'https://images.unsplash.com/photo-1639322537228-f710d846310a'
  ],
  'Gaming': [
    'https://images.unsplash.com/photo-1542751371-adc38448a05e',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420',
    'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8'
  ],
  
  // Business & Finance
  'Business': [
    'https://images.unsplash.com/photo-1664575602554-2087b04935a5',
    'https://images.unsplash.com/photo-1664575602276-acd073f104c1',
    'https://images.unsplash.com/photo-1664575602807-e28d84337529'
  ],
  'Finance': [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3',
    'https://images.unsplash.com/photo-1638913662252-70efce1e60a7',
    'https://images.unsplash.com/photo-1638913662180-aaa9e10c163f'
  ],
  
  // Science & Health
  'Science': [
    'https://images.unsplash.com/photo-1628595351029-c2bf17511435',
    'https://images.unsplash.com/photo-1628595351029-c2bf17511435',
    'https://images.unsplash.com/photo-1628595351029-c2bf17511435'
  ],
  'Health': [
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528'
  ],
  
  // Entertainment & Media
  'Entertainment': [
    'https://images.unsplash.com/photo-1603739903239-8b6e64c3b185',
    'https://images.unsplash.com/photo-1603739903239-8b6e64c3b185',
    'https://images.unsplash.com/photo-1603739903239-8b6e64c3b185'
  ],
  'Movies': [
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1'
  ],
  
  // Add more categories as needed...
};

// Default images if no category match
const defaultImages = [
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
  'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107'
];

// Trending topics by category for better relevance
const trendingTopics = {
  'Technology': ['AI Ethics', 'Web3', 'Metaverse', 'Machine Learning', 'Edge Computing', 'Quantum Computing'],
  'Business': ['Remote Work', 'Digital Transformation', 'Sustainable Business', 'Startup Culture', 'Economic Trends'],
  'Health': ['Biohacking', 'Mental Health Tech', 'Telemedicine', 'Personalized Medicine', 'Wellness Apps'],
  'Finance': ['Cryptocurrency', 'Decentralized Finance', 'ESG Investing', 'Fintech Revolution', 'Financial Independence'],
  'Entertainment': ['Streaming Wars', 'Creator Economy', 'Virtual Events', 'NFTs in Media', 'Social Audio'],
  'Science': ['Space Exploration', 'Climate Technologies', 'Genomics', 'Renewable Energy', 'Nanotechnology'],
  'Lifestyle': ['Digital Minimalism', 'Sustainable Living', 'Plant-Based Diets', 'Travel Technology', 'Smart Homes']
};

function getMultipleImages(topic) {
  const categoryImages = placeholders[topic] || defaultImages;
  console.log(`Using placeholder images for topic: ${topic}`);
  return categoryImages;
}

// Update the searchUnsplashImages function to include image optimization parameters
async function searchUnsplashImages(query, count = 1) {
    if (!UNSPLASH_ACCESS_KEY) {
        throw new Error('Unsplash API key not found in environment variables');
    }

    try {
        // Request more images than needed to ensure enough unique options
        const requestCount = count * 3; 
        const response = await fetch(
            `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=${requestCount}&orientation=landscape`,
            {
                headers: {
                    'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.results.map(photo => ({
            id: photo.id, // Add ID to track unique images
            url: getOptimizedImageUrl(photo.urls.regular), // Use optimized URL
            width: photo.width,
            height: photo.height,
            credit: {
                name: photo.user.name,
                username: photo.user.username,
                link: photo.user.links.html
            }
        }));
    } catch (error) {
        console.error('Fetching images from Unsplash:', error);
        return null;
    }
}

// Helper function to optimize image URLs
function getOptimizedImageUrl(url) {
    // Add quality and format parameters to the Unsplash URL
    // This optimizes the image size and improves loading performance
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}q=80&fm=jpg&w=1080&fit=max`;
}

// Generate a title from a topic when one can't be extracted from Gemini's response
function generateTitle(topic) {
    console.log('Generating a title for:', topic);
    
    // Clean up topic formatting
    const cleanTopic = topic.replace(/^\w+:\s*/, '').trim();
    
    // Create engaging title patterns with the topic
    const titleTemplates = [
        `${cleanTopic}: The Ultimate Guide for 2025`,
        `10 Revolutionary Ways ${cleanTopic} Will Transform Your Life`,
        `Why ${cleanTopic} Is the Next Big Thing You Can't Ignore`,
        `The Surprising Truth About ${cleanTopic} Experts Won't Tell You`,
        `How ${cleanTopic} Is Changing Everything: A Deep Dive`,
        `${cleanTopic} Mastery: Essential Strategies for Success`,
        `The Future of ${cleanTopic}: Trends and Predictions`,
        `${cleanTopic} vs. Traditional Approaches: What's Better?`,
        `7 Game-Changing Facts About ${cleanTopic} You Need to Know`,
        `Unlocking the Power of ${cleanTopic}: Expert Insights`
    ];
    
    // Select a random title template
    const randomIndex = Math.floor(Math.random() * titleTemplates.length);
    const generatedTitle = titleTemplates[randomIndex];
    
    console.log('Generated title:', generatedTitle);
    return generatedTitle;
}

// Update the getFeaturedImage function to also return optimized URLs
async function getFeaturedImage(topic, keywords) {
    try {
        // Try to get a featured image using the title and top keywords
        const searchQuery = `${topic} ${keywords.slice(0, 3).join(' ')}`;
        console.log(`Fetching featured image for: ${searchQuery}`);
        
        const response = await fetch(
            `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=30&orientation=landscape`,
            {
                headers: {
                    'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Filter for high-quality images (prefer featured/popular)
        const highQualityImages = data.results
            .filter(img => 
                img.width >= 1200 && 
                img.height >= 800 && 
                (img.likes > 10 || img.featured))
            .slice(0, 5);
        
        if (highQualityImages.length > 0) {
            const selectedImage = highQualityImages[Math.floor(Math.random() * highQualityImages.length)];
            return {
                url: getOptimizedImageUrl(selectedImage.urls.regular),
                width: selectedImage.width,
                height: selectedImage.height,
                credit: {
                    name: selectedImage.user.name,
                    username: selectedImage.user.username,
                    link: selectedImage.user.links.html
                }
            };
        }
        
        // Fallback to any image if no high-quality ones are found
        if (data.results.length > 0) {
            const selectedImage = data.results[0];
            return {
                url: getOptimizedImageUrl(selectedImage.urls.regular),
                width: selectedImage.width,
                height: selectedImage.height,
                credit: {
                    name: selectedImage.user.name,
                    username: selectedImage.user.username,
                    link: selectedImage.user.links.html
                }
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching featured image:', error);
        return null;
    }
}

// Create SEO-friendly slugs from titles - improve to preserve more of the title
function createSlug(title) {
    // Step 1: Convert to lowercase and remove special characters
    let slug = title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim();
    
    // Step 2: Keep more of the title for better SEO and readability
    // Remove common "stop words" that don't add SEO value
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as'];
    
    // Split into words
    let words = slug.split(/\s+/);
    
    // If we have a very long title, keep more important words
    if (words.length > 12) {
        // Filter out stop words if we can maintain at least 8 words
        const filteredWords = words.filter(word => !stopWords.includes(word));
        
        // Only use filtered words if we still have enough for a good slug
        if (filteredWords.length >= 8) {
            words = filteredWords;
        }
        
        // Either way, limit to first 12 words for reasonable length but preserve more meaning
        words = words.slice(0, 12);
    }
    
    // Step 3: Join with hyphens and clean up consecutive hyphens
    slug = words.join('-').replace(/-+/g, '-');
    
    return slug;
}

// Process content to add proper formatting, anchors, and table of contents markers
function processArticleContent(content, title) {
    // Create a cleaner, more formatted version of the content
    let processedContent = content;
    
    // 1. Extract title, social_snippet and excerpt (if provided in the format)
    const titleMatch = processedContent.match(/^#\s+(.+)$/m) || processedContent.match(/^TITLE:\s*(.+)$/m);
    const excerptMatch = processedContent.match(/^EXCERPT:\s*(.+?)(?:\n|$)/m) || processedContent.match(/^META_DESCRIPTION:\s*(.+?)(?:\n|$)/m);
    const socialMatch = processedContent.match(/^SOCIAL_SNIPPET:\s*(.+?)(?:\n|$)/m);

    // Remove these markers if they exist
    if (titleMatch) processedContent = processedContent.replace(/^#\s+(.+)$/m, '').replace(/^TITLE:\s*(.+)$/m, '');
    if (excerptMatch) processedContent = processedContent.replace(/^EXCERPT:\s*(.+?)(?:\n|$)/m, '').replace(/^META_DESCRIPTION:\s*(.+?)(?:\n|$)/m, '');
    if (socialMatch) processedContent = processedContent.replace(/^SOCIAL_SNIPPET:\s*(.+?)(?:\n|$)/m, '');
    
    // 2. Clean up whitespace and ensure consistent headings
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n'); // Replace multiple line breaks with double line breaks
    processedContent = processedContent.replace(/^#\s+/gm, '## '); // Convert any top-level heading to h2
    
    // 3. Make sure headings have proper ID attributes for linking
    const headings = [];
    processedContent = processedContent.replace(/^##\s+(.+)$/gm, (match, heading) => {
        const slug = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const uniqueSlug = `section-${slug}`;
        headings.push({ text: heading, slug: uniqueSlug });
        return `## ${heading}`;
    });
    
    // 4. Add a table of contents if there are multiple headings
    if (headings.length > 3) {
        const tocMarkup = `
## Table of Contents

${headings.map(h => `- [${h.text}](#${h.slug})`).join('\n')}

`;
        // Add the TOC after the first paragraph
        const firstParagraphEnd = processedContent.indexOf('\n\n');
        if (firstParagraphEnd !== -1) {
            processedContent = 
                processedContent.substring(0, firstParagraphEnd + 2) + 
                tocMarkup + 
                processedContent.substring(firstParagraphEnd + 2);
        }
    }
    
    // 5. Add "Key Points" section after intro if it doesn't exist and isn't already provided
    if (!processedContent.includes('## Key Points') && 
        !processedContent.includes('## Key Takeaways') && 
        headings.length > 0) {
        
        const firstBreakIndex = processedContent.indexOf('\n\n', 500);
        if (firstBreakIndex !== -1) {
            // Generate a more substantive key points section based on headings
            const keyPointItems = headings.map(h => {
                const basePoint = `Discover ${h.text.toLowerCase()} and why it matters`;
                return basePoint;
            });
            
            // Add additional general points
            keyPointItems.push('Practical strategies and actionable insights you can implement today');
            keyPointItems.push('Expert perspectives on the latest developments in this field');
            
            const keyPoints = `
## Key Points

${keyPointItems.map(point => `* ${point}`).join('\n')}

`;
            processedContent = 
                processedContent.substring(0, firstBreakIndex + 2) + 
                keyPoints + 
                processedContent.substring(firstBreakIndex + 2);
        }
    }
    
    // 6. Format images properly - use pure Markdown for images
    processedContent = processedContent.replace(/!\[(.*?)\]\((.*?)\)/g, '![$1]($2)');
    
    // 7. Format Pro Tips and Expert Insights boxes with Markdown blockquotes
    processedContent = processedContent.replace(/\*\*Pro Tip:([^*]+)\*\*/g, 
        '> **💡 Pro Tip**\n> \n> $1\n');
    
    processedContent = processedContent.replace(/\*\*Expert Insight:([^*]+)\*\*/g, 
        '> **👨‍💼 Expert Insight**\n> \n> $1\n');
    
    // 8. Handle FAQ formatting with pure Markdown (only if FAQs exist)
    if (content.includes('**Q:') || content.includes('Q:')) {
        // Create a markdown FAQ section
        processedContent = processedContent.replace(/\*\*Q:(.*?)\*\*\s*\*\*A:(.*?)\*\*/gs, 
                                         '**Q:$1**\n\n**A:$2**\n\n');
        
        // Wrap all FAQ items in a section header
        if (processedContent.includes('**Q:')) {
            // Find the first FAQ item
            const faqStart = processedContent.indexOf('**Q:');
            if (faqStart !== -1) {
                // Find where FAQs end (next heading or end of content)
                let faqEnd = processedContent.indexOf('##', faqStart);
                if (faqEnd === -1) faqEnd = processedContent.length;
                
                // Extract FAQ section
                const faqSection = processedContent.substring(faqStart, faqEnd);
                
                // Replace with wrapped version
                processedContent = processedContent.substring(0, faqStart) + 
                    '## Frequently Asked Questions\n\n' + 
                    faqSection + 
                    processedContent.substring(faqEnd);
            }
        }
    }
    
    // 9. Enhance blockquotes with cleaner formatting
    processedContent = processedContent.replace(/>\s+(.+?)(?=\n|$)/gm, '> $1');
    
    // 10. Replace [IMAGE] markers with markdown image placeholders
    processedContent = processedContent.replace(/\[IMAGE\](?:\s*Caption:\s*([^\n]+))?/g, (match, caption) => {
        if (caption) {
            return `![${caption}](https://via.placeholder.com/800x400?text=Image+will+be+loaded+here)\n*${caption}*`;
        }
        return `![Image Placeholder](https://via.placeholder.com/800x400?text=Image+will+be+loaded+here)`;
    });
    
    // 11. Simplify code blocks
    processedContent = processedContent.replace(/```([^`]+)```/g, '```\n$1\n```');
    
    return processedContent;
}

// Create social sharing links for multiple platforms
function createSocialShareLinks(title, slug, socialSnippet) {
    // Clean up the snippet text and fix formatting for MDX compatibility
    let cleanSnippet = socialSnippet
        .replace(/^["']|["']$/g, '').trim()
        // Convert markdown emphasis to HTML for MDX compatibility
        .replace(/(?<!\*)\*([^\*]+)\*(?!\*)/g, "<em>$1</em>");
    
    // Apply MDX escaping to ensure compatibility
    cleanSnippet = escapeForMdx(cleanSnippet);
    
    // Create a URL-encoded version for sharing (without HTML tags)
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(cleanSnippet.replace(/<\/?em>/g, '').replace(/&#33;/g, '!').replace(/&#42;/g, '*'));
    const encodedUrl = encodeURIComponent(`https://Trendiingz.com/posts/${slug}`);
    
    // Create markup for social sharing buttons - using HTML instead of markdown links
    return `

<h2>Share This Article</h2>

<div class="social-share-container">
  <a href="https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}" target="_blank" rel="noopener noreferrer" class="social-share-link twitter">
    Share on Twitter
  </a>
  
  <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener noreferrer" class="social-share-link facebook">
    Share on Facebook
  </a>
  
  <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedText}" target="_blank" rel="noopener noreferrer" class="social-share-link linkedin">
    Share on LinkedIn
  </a>
  
  <a href="https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}" target="_blank" rel="noopener noreferrer" class="social-share-link reddit">
    Share on Reddit
  </a>

  <a href="https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}" target="_blank" rel="noopener noreferrer" class="social-share-link whatsapp">
    Share on WhatsApp
  </a>
  
  <span class="social-share-copy" data-clipboard-text="${encodedUrl}">
    Copy Link
  </span>
</div>

<!-- For Instagram/TikTok sharing -->
<div class="mobile-share-container">
  <p>To share on Instagram or TikTok:</p>
  <ol>
    <li>Copy this link: <code>Trendiingz.com/posts/${slug}</code></li>
    <li>Open Instagram or TikTok and paste in your profile or story</li>
  </ol>
</div>

<blockquote>
  <p>${cleanSnippet}</p>
</blockquote>
`;
}

async function generateArticle(topic, retryCount = 0) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not found in environment variables');
    }

    // Prevent infinite retry loops
    if (retryCount > 3) {
        console.error('Maximum retry attempts reached. Using best available content.');
    }

    // Get SEO keywords first to inform our article generation
    console.log('Generating SEO keywords for:', topic);
    const seoKeywords = await generateSEOKeywords(topic);
    console.log('Generated keywords:', seoKeywords.join(', '));

    // Replace with more viral-focused instructions
    const prompt = `Create an ULTRA-VIRAL, deeply engaging and highly shareable article about ${topic} for our tech/lifestyle blog "Trendiingz".
The article must be comprehensive, authoritative, and packed with unique insights that readers can't find elsewhere.

TITLE REQUIREMENTS:
- Create an irresistibly clickable, ultra-viral title that drives massive engagement
- Use curiosity, value proposition, or emotional triggers to make readers NEED to click
- Incorporate numbers, powerful words, or intriguing questions that stand out in feeds
- Optimize title length (60-80 characters) for social sharing and click-through rates
- Ensure the title clearly promises exceptional value while remaining authentic

CONTENT REQUIREMENTS:
- Word count: 1500-2500 words (must be comprehensive and detailed)
- Begin with a powerful, pattern-interrupting hook that compels continued reading
- Structure with 5-7 detailed sections with clear ## subheadings
- Each section should dive DEEP into its topic with thorough examination
- Include expert perspectives, relevant research findings, and current data points
- Support claims with specific examples, case studies, or real-world applications
- Incorporate [IMAGE] markers at 5-7 strategic points where visuals enhance understanding
- Each image should have a detailed, keyword-rich caption: "Caption: [descriptive text with contextual relevance]"
- Use **bold text** strategically to highlight critical insights and key takeaways
- Include multiple well-structured bulleted lists for easy scanning and information retention
- Add 2-3 unique "Pro Tip" or "Expert Insight" boxes with actionable, valuable advice
- Include a dedicated "Key Takeaways" or "Implementation Guide" section near the end
- End with a powerful conclusion and compelling call-to-action
- Focus on delivering genuinely unique perspectives, surprising insights, and valuable information readers can't find elsewhere

QUALITY ENHANCEMENT REQUIREMENTS:
- Dive DEEP into each aspect instead of surface-level coverage
- Provide specific, actionable advice rather than general guidance
- Answer the REAL questions readers have about this topic
- Address potential objections or counterarguments with nuance
- Include practical examples that illustrate key points
- Consider both beginner and advanced perspectives on the topic
- Add contextual information about why this topic matters NOW

IMPORTANT FORMATTING GUIDELINES:
- Use proper Markdown formatting throughout for consistent rendering
- Structure content with a logical progression of ideas
- Use clean ## headings with descriptive titles for easy navigation
- Keep paragraphs concise and readable (3-5 sentences max)
- Never repeat content or ideas unnecessarily
- Ensure smooth transitions between sections for natural flow
- DO NOT include FAQ sections unless specifically relevant to the topic

SOCIAL_SNIPPET: Write a 1-2 sentence shareable quote from the article that would perform exceptionally well on social media – something genuinely thought-provoking or surprising.`;

    const response = await retry(async () => {
        // Updated API endpoint format to match Gemini's requirements
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // Updated request body format for Gemini API
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.85,  // Slightly higher temperature for more creativity and detail
                    maxOutputTokens: 12000,  // Increased token limit to accommodate longer content
                    topP: 0.92,
                    topK: 40
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_ONLY_HIGH"
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0].text) {
            throw new Error(`Invalid API response format: ${JSON.stringify(data)}`);
        }
        
        const content = data.candidates[0].content.parts[0].text;
        console.log('API Response received. Content length:', content.length || 0);
        
        return content;
    });

    // Extract content sections based on formatting
    const titleMatch = response.match(/^#\s+(.+)$/m) || response.match(/^TITLE:\s*(.+)$/m);
    const excerptMatch = response.match(/^EXCERPT:\s*(.+?)(?:\n|$)/m) || response.match(/^META_DESCRIPTION:\s*(.+?)(?:\n|$)/m);
    const socialMatch = response.match(/^SOCIAL_SNIPPET:\s*(.+?)(?:\n|$)/m);

    // Use extracted or generate title/excerpt if not found
    const title = titleMatch ? titleMatch[1].trim() : generateTitle(topic);
    const excerpt = excerptMatch 
        ? excerptMatch[1].trim() 
        : response.split('\n').filter(line => line.trim().length > 0 && !line.startsWith('#') && !line.startsWith('TITLE:'))[0]?.trim() || 
          `Discover the latest insights about ${topic} and why it matters in today's rapidly evolving landscape.`;
    const socialSnippet = socialMatch ? socialMatch[1].trim() : 
        `The most surprising thing about ${topic} isn't what most people think. Find out what experts really say about this game-changing topic.`;
    
    // Clean excerpt for YAML frontmatter
    const cleanExcerpt = cleanForYaml(excerpt);
    const cleanMetaDescription = cleanForYaml(excerpt).slice(0, 155) + '...';
    
    // Generate metadata
    const slug = createSlug(title);
    const readingTime = calculateReadingTime(response);
    
    // Process the main content
    let mainContent = response;
    
    // Validate content and retry if needed
    const isValid = validateArticleContent(mainContent, title, excerpt);
    
    if (!isValid && retryCount < 3) {
        console.log('⚠️ Content failed validation. Retrying generation...');
        // Recursive call with a retry count to avoid infinite loops
        return generateArticle(topic, retryCount + 1);
    }
    
    // Search for and download images for the article
    console.log('Searching for images for the article...');
    console.log(`Searching for featured image with ${seoKeywords.slice(0, 3).join(', ')}...`);
    const featuredImage = await getFeaturedImage(topic, seoKeywords.slice(0, 3));
    
    // Get additional images for the article content
    const additionalImages = await searchUnsplashImages(topic, 5) || getMultipleImages(topic);
    
    // Process content with enhanced formatting and structure
    mainContent = processArticleContent(mainContent, title);
    
    // Replace image placeholders with actual images
    if (additionalImages && additionalImages.length > 0) {
    let imageIndex = 0;
        mainContent = mainContent.replace(/!\[(?:Image Placeholder|.*?)\]\(https:\/\/via\.placeholder\.com.*?\)(?:\n\*.*?\*)?/g, 
            (match) => {
                if (imageIndex >= additionalImages.length) {
                    imageIndex = 0; // Cycle back to the first image if we run out
                }
                
                const image = additionalImages[imageIndex++];
                
                // Extract caption if present
                const captionMatch = match.match(/!\[(.*?)\]/) || match.match(/\n\*(.*?)\*/);
                const captionText = captionMatch ? captionMatch[1].trim() : '';
                
                if (captionText && captionText !== 'Image Placeholder') {
                    return `![${captionText}](${image.url})\n*${captionText} (Photo by ${image.credit.name} on Unsplash)*`;
                }
                
                return `![${topic} image](${image.url})\n*Photo by ${image.credit.name} on Unsplash*`;
            }
        );
    }
    
    // Generate social sharing links
    const socialLinks = createSocialShareLinks(title, slug, socialSnippet);
    mainContent += `\n\n${socialLinks}`;
    
    // Create enhanced frontmatter with properly escaped values
    const frontmatter = {
        title,
        date: getCurrentDate(),
        slug,
        excerpt: cleanExcerpt,
        metaDescription: cleanMetaDescription,
        category: topic.split(':')[0].trim(),
        status: 'new',
        trending: true,
        featured: Math.random() > 0.7, // Make some articles featured
        image: featuredImage ? featuredImage.url : (additionalImages && additionalImages.length > 0 ? additionalImages[0].url : defaultImages[0]),
        imageAlt: title,
        imageCredit: featuredImage 
            ? `Photo by ${featuredImage.credit.name} on Unsplash`
            : (additionalImages && additionalImages.length > 0 
                ? `Photo by ${additionalImages[0].credit.name} on Unsplash` 
                : "Photo from Unsplash"),
        keywords: seoKeywords,
        readingTime,
        socialShare: cleanForYaml(socialSnippet), // Clean social snippet for YAML
        generatedBy: 'Gemini'
    };

    // Format the final content
    const finalContent = `---
${Object.entries(frontmatter)
    .map(([key, value]) => {
        if (Array.isArray(value)) {
            return `${key}: [${value.map(item => `"${String(item).replace(/"/g, '\\"')}"`).join(', ')}]`;
        }
        // Wrap strings containing special characters in quotes and escape quotes
        if (typeof value === 'string') {
            // Always wrap strings in quotes for consistency and escape any quotes within
            return `${key}: "${String(value).replace(/"/g, '\\"')}"`;
        }
        return `${key}: ${value}`;
    })
    .join('\n')}
---

${mainContent}`;

    const filename = `${getCurrentDate()}-${slug}.md`;
    const filepath = path.join(process.cwd(), 'content', 'articles', filename);
    await fs.writeFile(filepath, finalContent, 'utf8');

    return {
        filename,
        title,
        excerpt: cleanExcerpt,
        slug,
        keywords: seoKeywords,
        socialSnippet: cleanForYaml(socialSnippet),
        generatedBy: 'Gemini'
    };
}

function getCurrentDate() {
    const date = new Date();
    // Format as ISO date string (YYYY-MM-DD) with time component, which ensures proper sorting
    return date.toISOString();
}

function extractKeywords(content, title) {
    const words = (title + ' ' + content).toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .map(word => word.replace(/[^\w\s-]/g, ''))
        .filter(word => word && !['this', 'that', 'with', 'from', 'have', 'will', 'your', 'what', 'when', 'where', 'which'].includes(word));
    
    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    return Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word)
        .filter(Boolean);
}

function calculateReadingTime(content) {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
}

// Generate an article on a trending topic within a category
async function generateTrendingArticle(category) {
    const categories = Object.keys(trendingTopics);
    const selectedCategory = category && trendingTopics[category] 
        ? category 
        : categories[Math.floor(Math.random() * categories.length)];
    
    const topics = trendingTopics[selectedCategory];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    
    console.log(`Generating trending article in category: ${selectedCategory}, topic: ${randomTopic}`);
    return generateArticle(`${selectedCategory}: ${randomTopic}`);
}

// Allow running from command line or as module
if (require.main === module) {
    const topic = process.argv[2];
    const func = topic ? generateArticle : generateTrendingArticle;
    const arg = topic || process.argv[3]; // Use category if provided as third argument
    
    func(arg)
        .then(result => {
            console.log('Article generated successfully with Gemini:');
            console.log(`Title: ${result.title}`);
            console.log(`Filename: ${result.filename}`);
            console.log(`Keywords: ${result.keywords.join(', ')}`);
            if (result.socialSnippet) {
                console.log(`Social Snippet: ${result.socialSnippet}`);
            }
        })
        .catch(error => {
            console.error('Error generating article with Gemini:', error);
            process.exit(1);
        });
}

module.exports = { 
    generateArticle, 
    generateTrendingArticle,
    generateSEOKeywords 
}; 

// Generate a list of relevant and long-tail SEO keywords for the topic using Gemini
async function generateSEOKeywords(topic, count = 10) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not found in environment variables');
    }

    const prompt = `Generate ${count} highly relevant, SEO-optimized keywords and phrases for an article about "${topic}". 
Focus on a mix of:
1. High-volume head terms
2. Long-tail phrases that people actually search for
3. Question-based keywords
4. Terms with commercial intent where relevant
5. Trending terms related to ${topic}
6. Include only the keywords in a simple array, with no explanations or annotations.`;

    try {
        // Updated API endpoint format to match Gemini's requirements
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // Updated request body format for Gemini API
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 500,
                    topP: 0.95,
                    topK: 40
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0].text) {
            throw new Error(`Invalid API response format: ${JSON.stringify(data)}`);
        }
        
        const content = data.candidates[0].content.parts[0].text;
        
        // Extract keywords from the response
        // This regex looks for lists with numbers, bullet points, or just plain words
        const keywordMatches = content.match(/[\w\s-]+(?:,|$)/g) || [];
        const keywords = keywordMatches
            .map(k => k.replace(/^[•\-\d\.\s]+|,\s*$/g, '').trim())
            .filter(k => k.length > 0 && k.length < 50)
            .slice(0, count);
        
        return keywords;
    } catch (error) {
        console.error('Error generating SEO keywords:', error);
        // Fall back to basic keyword extraction if the API call fails
        return extractKeywords(topic + ' trending latest developments research', 10);
    }
}

// Validate article content and ensure it meets requirements
function validateArticleContent(content, title, excerpt) {
    // Check for minimum content length (at least 800 words)
    const words = content.split(/\s+/).length;
    if (words < 800) {
        console.warn(`WARNING: Content is too short (${words} words)`);
        return false;
    }

    // Update validation logic for longer, more detailed content
    // Check for minimum content length (now expecting 1500+ words)
    if (words < 1500) {
        console.warn(`WARNING: Content is shorter than ideal (${words} words). Aim for 1500-2500 words for comprehensive coverage.`);
        // Don't fail validation, but warn
    }
    
    // Check for multiple sections (should have at least 3)
    const sectionCount = (content.match(/^##\s+/gm) || []).length;
    if (sectionCount < 3) {
        console.warn(`WARNING: Content has too few sections (${sectionCount}). Need at least 3.`);
        return false;
    }
    
    // Check for detailed sections (should have 5+ ideally)
    if (sectionCount < 5) {
        console.warn(`NOTE: Article could benefit from more sections (${sectionCount}). Aim for 5-7 sections for thorough coverage.`);
        // Don't fail validation, but note it
    }
    
    // Check for image placeholders (should have at least 3)
    const imageCount = (content.match(/\[IMAGE\]/g) || []).length;
    if (imageCount < 3) {
        console.warn(`WARNING: Content has too few images (${imageCount}). Need at least 3.`);
        return false;
    }
    
    // Check for Pro Tips or Expert Insights (should have at least 1)
    const hasTips = content.includes('**Pro Tip:') || content.includes('**Expert Insight:');
    if (!hasTips) {
        console.warn('WARNING: Content missing Pro Tips or Expert Insights sections');
        return false;
    }
    
    // Check for bulleted lists (should have at least 2)
    const listCount = (content.match(/^\*\s+/gm) || []).length;
    if (listCount < 5) {
        console.warn(`WARNING: Content has too few list items (${listCount}). Need at least 5 for good scannability.`);
        return false;
    }
    
    // Verify there's a good conclusion section
    const hasConclusion = content.includes('## Conclusion') || 
                           content.includes('## Final Thoughts') || 
                           content.includes('## Wrapping Up') ||
                           content.includes('## In Summary') ||
                           content.includes('## Key Takeaways');
    if (!hasConclusion) {
        console.warn('WARNING: Content missing a conclusion section');
        return false;
    }
    
    // Check for title quality
    if (title.length < 30 || title.length > 100) {
        console.warn(`WARNING: Title length (${title.length} chars) is outside optimal range (30-100)`);
        return false;
    }
    
    // Check for excerpt quality
    if (excerpt && excerpt.length < 100) {
        console.warn(`WARNING: Excerpt is too short (${excerpt.length} chars). Need at least 100.`);
        return false;
    }
    
    // Check for content originality and depth
    const contentDepthMarkers = [
        "research shows",
        "according to",
        "studies indicate",
        "experts recommend",
        "case study",
        "for example",
        "specifically",
        "importantly",
        "notably"
    ];
    
    // Count how many depth markers are present
    const depthMarkerCount = contentDepthMarkers.reduce((count, marker) => {
        const regex = new RegExp(marker, 'gi');
        const matches = content.match(regex) || [];
        return count + matches.length;
    }, 0);
    
    if (depthMarkerCount < 5) {
        console.warn(`WARNING: Content may lack depth (only ${depthMarkerCount} depth markers found). Need more specific examples, research citations, or expert references.`);
        return false;
    }
    
    // Warn about potential cliché phrases that might indicate generic content
    const genericPhrases = [
        "in this day and age",
        "at the end of the day",
        "when all is said and done",
        "it goes without saying",
        "needless to say",
        "it's important to note",
        "it's worth mentioning",
        "it's no secret that"
    ];
    
    const foundGenericPhrases = genericPhrases.filter(phrase => 
        content.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (foundGenericPhrases.length > 2) {
        console.warn(`WARNING: Content contains too many generic phrases: ${foundGenericPhrases.join(', ')}`);
        return false;
    } else if (foundGenericPhrases.length > 0) {
        console.warn(`NOTE: Content contains potentially generic phrases: ${foundGenericPhrases.join(', ')}`);
        // Don't fail validation, but note it
    }
    
    // Check for FAQ section - we don't want these unless specifically requested
    const hasFAQSection = content.includes('## FAQ') || 
                          content.includes('## Frequently Asked Questions') ||
                          (content.includes('**Q:') && content.includes('**A:'));
                          
    if (hasFAQSection) {
        console.warn('NOTE: Content includes an FAQ section. These should only be included when specifically relevant to the topic.');
        // Don't fail validation, but note it
    }
    
    return true;
}

// Function to safely escape any MDX-incompatible characters in text
function escapeForMdx(text) {
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/!/g, '&#33;')
        .replace(/\*/g, '&#42;'); // Escape asterisks too
}

// Clean markdown formatting and prepare string for YAML
function cleanForYaml(text) {
    if (!text) return '';
    
    // Remove markdown formatting and other special characters that might break YAML
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold text
        .replace(/\*([^*]+)\*/g, '$1')     // Italic text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
        .replace(/`([^`]+)`/g, '$1')       // Code
        .replace(/~/g, '')                 // Strikethrough
        .replace(/\\/g, '')                // Backslashes
        .trim();
} 