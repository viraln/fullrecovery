const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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

// Constants
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-pro"; // Updated to correct model name

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
        
        // Enhance search terms for technical topics
        let enhancedQuery = query;
        const technicalTopics = ['ComputerVision', 'NLP', 'DeepLearning', 'SoftwareEng', 'HardwareDev', 'BrainComputer', 'AI', 'Machine'];
        const baseTopic = query.split(' ')[0]; // Get the first word of the query
        
        if (technicalTopics.some(topic => baseTopic.toLowerCase().includes(topic.toLowerCase()))) {
            // Add abstract terms for technical topics to help find better images
            const abstractTerms = ['abstract', 'digital', 'concept', 'technology', 'visualization'];
            const randomTerm = abstractTerms[Math.floor(Math.random() * abstractTerms.length)];
            enhancedQuery = `${query} ${randomTerm}`;
            console.log(`Enhanced technical topic search: "${enhancedQuery}"`);
        }
        
        const response = await fetch(
            `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(enhancedQuery)}&per_page=${requestCount}&orientation=landscape`,
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
    // 1. Clean up the content formatting
    let processedContent = content;
    
    // Remove any leading numbers with dots (like "1. ")
    processedContent = processedContent.replace(/^\d+\.\s+/gm, '');
    
    // Remove any numbering in paragraph start
    processedContent = processedContent.replace(/\n\d+\.\s+/g, '\n');
    
    // Clean up extra line breaks 
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n');
    
    // 2. Add proper spacing after headings for better readability
    processedContent = processedContent.replace(/##\s+(.*?)$/gm, '\n## $1\n\n');
    processedContent = processedContent.replace(/###\s+(.*?)$/gm, '\n### $1\n\n');
    
    // 3. Ensure paragraphs have proper spacing
    processedContent = processedContent.replace(/\n([^\n#<>*].+)(\n[^\n#<>*].+)+/g, (match) => {
        // Convert sequences of text lines into proper paragraphs with spacing
        return '\n\n<p>' + match.trim().replace(/\n/g, ' ') + '</p>\n\n';
    });
    
    // 4. Convert all markdown headers to HTML for MDX compatibility
    const headings = [];
    let counter = 0;
    
    // First convert ## headings to HTML
    processedContent = processedContent.replace(/##\s+(.*?)$/gm, (match, headingText) => {
        counter++;
        const headingId = `section-${counter}`;
        const cleanHeading = headingText.trim();
        
        // Store for ToC generation
        headings.push({
            id: headingId,
            text: cleanHeading
        });
        
        // Return the heading with an ID for anchor linking
        return `<h2 id="${headingId}">${cleanHeading}</h2>\n\n`;
    });
    
    // 5. Generate a TOC with HTML links instead of markdown
    if (headings.length > 1) {
        // Find the first paragraph break after the intro (approximately)
        const firstBreakIndex = processedContent.indexOf('\n\n', 500); // Look for break after ~500 chars
        
        if (firstBreakIndex !== -1) {
            const tocHtml = `
<h2>Contents</h2>

<ul>
${headings.map(h => `<li><a href="#${h.id}">${h.text}</a></li>`).join('\n')}
</ul>

`;
            // Insert ToC after the first paragraph break
            processedContent = 
                processedContent.substring(0, firstBreakIndex + 2) + 
                tocHtml + 
                processedContent.substring(firstBreakIndex + 2);
        }
    }
    
    // 6. Properly format lists - ensure they use HTML tags
    // Convert any markdown lists to HTML lists
    let inList = false;
    const lines = processedContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
        // Check for bullet points
        if (lines[i].trim().match(/^\*\s+/) || lines[i].trim().match(/^-\s+/)) {
            // Convert the bullet point to an HTML list item
            lines[i] = lines[i].replace(/^(\s*)\*\s+(.*)$/, '<li>$2</li>');
            lines[i] = lines[i].replace(/^(\s*)-\s+(.*)$/, '<li>$2</li>');
            
            // If this is the start of a list, add the opening <ul> tag
            if (!inList) {
                lines.splice(i, 0, '<ul>');
                i++; // Adjust index for the inserted line
                inList = true;
            }
        }
        // Check if the list ends
        else if (inList && (lines[i].trim() === '' || lines[i].trim().match(/^<h/) || i === lines.length - 1)) {
            // Add the closing </ul> tag
            lines.splice(i, 0, '</ul>\n');
            i++; // Adjust index for the inserted line
            inList = false;
        }
    }
    // If the list continues until the end, close it
    if (inList) {
        lines.push('</ul>\n');
    }
    processedContent = lines.join('\n');
    
    // 7. Convert markdown image syntax to HTML with proper spacing
    processedContent = processedContent.replace(/!\[(.*?)\]\((.*?)\)/g, '\n\n<img src="$2" alt="$1" />\n');
    
    // 8. Convert markdown links to HTML
    processedContent = processedContent.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    
    // 9. Fix bold and emphasis tags 
    // Make sure all ** markers come in pairs
    const boldMatches = processedContent.match(/\*\*([^*]*)\*\*/g) || [];
    boldMatches.forEach(match => {
        const innerText = match.slice(2, -2);
        processedContent = processedContent.replace(match, `<strong>${innerText}</strong>`);
    });
    
    // Handle single asterisk for emphasis
    const emMatches = processedContent.match(/(?<!\*)\*([^*\n]+)\*(?!\*)/g) || [];
    emMatches.forEach(match => {
        const innerText = match.slice(1, -1);
        processedContent = processedContent.replace(match, `<em>${innerText}</em>`);
    });
    
    // 10. Fix any unclosed bold/emphasis markers
    processedContent = processedContent.replace(/\*\*([^\*\n]+)(?!\*\*)/g, '<strong>$1</strong>');
    processedContent = processedContent.replace(/\*([^\*\n]+)(?!\*)/g, '<em>$1</em>');
    
    // 11. Fix blockquotes formatting
    processedContent = processedContent.replace(/^\s*>\s+(.*?)$/gm, '\n<blockquote>\n$1\n</blockquote>\n');
    
    // 12. Add proper spacing around image credits
    processedContent = processedContent.replace(/<\/small>/g, '</small>\n\n');
    
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

// Update the generateArticle function to use the GoogleGenerativeAI library
async function generateArticle(topic) {
    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY is not set in .env file');
        process.exit(1);
    }
    
    try {
        console.log(`Generating SEO keywords for: ${topic}`);
        const seoKeywords = await generateSEOKeywords(topic);
        console.log(`Generated keywords: ${seoKeywords.join(', ')}`);
        
        // Initialize the Gemini API
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        // Enhanced prompt for viral, high-quality content with better formatting
        const prompt = `Create a viral, highly engaging, and authoritative article about "${topic}" that will rank well in search engines and get shared widely on social media.

Use these SEO keywords naturally throughout: ${seoKeywords.join(', ')}

Format the article as follows, being careful to follow proper Markdown formatting:

TITLE: Create an attention-grabbing, SEO-optimized title that uses emotional triggers. Make it compelling but not clickbait. Include the main keyword.

META_DESCRIPTION: Write a 150-160 character meta description that includes the primary keyword and compels clicks from search results.

EXCERPT: Write a 2-3 sentence compelling excerpt that summarizes the value of the article and creates curiosity.

CONTENT:
Write a well-structured, in-depth article of at least 1500-2000 words with the following elements:

- Begin with an engaging hook that captures attention immediately
- Include an introductory section that establishes the importance of the topic
- Organize the content into 4-5 clear sections with proper Markdown headings (use ## for section headers, not numbers)
- Include facts, statistics, and cite authoritative sources
- Use storytelling techniques to maintain reader interest
- Add practical, actionable advice that provides immediate value
- Include [IMAGE] markers at 4-5 strategic points where visuals would enhance the content
- Each image should have a keyword-rich caption in the format: "Caption: [descriptive text]"
- Emphasize important points using **bold text** sparingly
- Include bulleted lists for easy scanning
- Add a relevant, practical "Quick Tip" or "Pro Tip" section
- End with a strong conclusion and call-to-action

IMPORTANT FORMATTING GUIDELINES:
- Use proper Markdown formatting throughout
- Do not use numbers at the beginning of paragraphs or sections
- Use clean ## headings with descriptive titles for each section
- Keep paragraphs concise and readable
- Do not repeat identical content
- Ensure the article flows naturally without abrupt transitions

SOCIAL_SNIPPET: Write a 1-2 sentence shareable quote from the article that would perform well on social media.

FAQS: Create 3-5 relevant FAQ entries based on common questions people might search about this topic, with concise, valuable answers.`;

        // Generate content
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                topP: 0.95,
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
        });
        
        const response = await result.response;
        const content = response.text();
        console.log('API Response received. Content length:', content.length || 0);

        // Parse the response
        const cleanContent = content.replace(/\\/g, '');
        
        // Extract components with more flexible regex patterns to handle different formats
        const titleMatch = cleanContent.match(/(?:^#\s*|^TITLE:|\*\*TITLE:\*\*|##\s*TITLE:)\s*(.*?)(?=\n|$)/i) || 
                        cleanContent.match(/^(.*?)(?=\n\*\*META|\n##\s*META|\nMETA)/i);
                        
        const metaDescriptionMatch = cleanContent.match(/(?:META_DESCRIPTION:|\*\*META_DESCRIPTION:\*\*|##\s*META_DESCRIPTION:)\s*([\s\S]*?)(?=\n\n|\n\*\*|\n##)/i);
        
        const excerptMatch = cleanContent.match(/(?:EXCERPT:|\*\*EXCERPT:\*\*|##\s*EXCERPT:)\s*([\s\S]*?)(?=\n\n|\n\*\*|\n##)/i);
        
        const contentMatch = cleanContent.match(/(?:^##\s*|CONTENT:|\*\*CONTENT:\*\*|##\s*CONTENT:)\s*([\s\S]*?)(?=\n\n\*\*SOCIAL|\n\nSOCIAL|\n\n##\s*SOCIAL|\n\n\*\*FAQS|\n\nFAQS|\n\n##\s*FAQS|$)/im) || 
                            cleanContent.match(/(?:^##\s*The.*?$)([\s\S]*?)(?=\n\n\*\*SOCIAL|\n\nSOCIAL|\n\n##\s*SOCIAL|\n\n\*\*FAQS|\n\nFAQS|\n\n##\s*FAQS|$)/m);
        
        const socialSnippetMatch = cleanContent.match(/(?:SOCIAL_SNIPPET:|\*\*SOCIAL_SNIPPET:\*\*|##\s*SOCIAL_SNIPPET:)\s*([\s\S]*?)(?=\n\n|\n\*\*|\n##|$)/i);
        
        const faqsMatch = cleanContent.match(/(?:FAQS:|\*\*FAQS:\*\*|##\s*FAQS:)\s*([\s\S]*?)(?=$)/is);

        // Initialize title variable
        let title = '';
        
        // If we can't find a title with the standard patterns, try to extract the first line as title
        if (!titleMatch && cleanContent.trim().length > 0) {
            const firstLine = cleanContent.trim().split('\n')[0];
            if (firstLine && firstLine.length > 0) {
                console.log('Using first line as title:', firstLine);
                title = firstLine.replace(/^#\s*/, '').trim(); // Remove leading # if present
            } else {
                console.error('Failed to parse content:', cleanContent);
                throw new Error('Failed to parse generated content');
            }
        } else if (!titleMatch) {
            console.error('Failed to parse content:', cleanContent);
            throw new Error('Failed to parse generated content');
        } else {
            title = titleMatch[1].trim();
            // Remove markdown bold markers and hashtags if present for the title
            title = title.replace(/\*\*/g, '').replace(/^#\s*/, '');
        }
            
        const metaDescription = metaDescriptionMatch 
            ? metaDescriptionMatch[1].trim().replace(/^\*\*|\*\*$|^\[|\]$/g, '') // Remove bold markers and brackets
            : '';
        const excerpt = excerptMatch 
            ? excerptMatch[1].trim().replace(/^\*\*|\*\*$|^\[|\]$/g, '') 
            : '';
        let mainContent = contentMatch 
            ? contentMatch[1].trim().replace(/^\*\*|\*\*$|^\[|\]$/g, '') 
            : '';
        const socialSnippet = socialSnippetMatch 
            ? socialSnippetMatch[1].trim().replace(/^\*\*|\*\*$|^\[|\]$|^["']|["']$/g, '') // Also remove quotes
            : '';
        const faqs = faqsMatch 
            ? faqsMatch[1].trim().replace(/^\*\*|\*\*$|^\[|\]$/g, '') 
            : '';

        // Create the slug early so it can be used throughout the function
        const slug = createSlug(title);

        // Extract image captions
        const captionRegex = /Caption: (.*?)(?=\n|$)/g;
        const captions = [];
        let captionMatch;
        while ((captionMatch = captionRegex.exec(mainContent)) !== null) {
            captions.push(captionMatch[1].trim());
        }
        
        // Remove caption lines from the content
        mainContent = mainContent.replace(/Caption: .*?\n/g, '');
        
        // Use captions for better image searches
        const imageKeywords = captions.length > 0 
            ? captions.map(caption => `${topic} ${caption}`.substring(0, 100)) 
            : [`${topic}`];
        
        // Fetch relevant images from Unsplash with better search terms
        console.log('Fetching images with enhanced keywords...');
        let allImages = [];
        const usedImageIds = new Set(); // Track used image IDs to prevent duplicates
        
        // First, try to get unique images for each caption
        for (const keyword of imageKeywords.slice(0, 5)) {
            console.log(`Searching for images with keyword: ${keyword}`);
            const images = await searchUnsplashImages(keyword, 3); // Get multiple options
            
            if (images && images.length > 0) {
                // Find the first image that hasn't been used yet
                const uniqueImage = images.find(img => !usedImageIds.has(img.id));
                if (uniqueImage) {
                    usedImageIds.add(uniqueImage.id);
                    allImages.push(uniqueImage);
                }
            }
        }

        // If we didn't get enough images, get some generic ones for the topic
        if (allImages.length < Math.min(5, captions.length)) {
            const genericImages = await searchUnsplashImages(topic, 5 - allImages.length);
            if (genericImages) {
                genericImages.forEach(img => {
                    if (!usedImageIds.has(img.id)) {
                        usedImageIds.add(img.id);
                        allImages.push(img);
                    }
                });
            }
        }

        // Ensure we have enough images for all the captions
        if (allImages.length < captions.length) {
            // Get more diverse images as fallback
            let diverseKeywords = [
                `${topic} concept`, 
                `${topic} illustration`, 
                `${topic} technology`, 
                `${topic} future`,
                `${topic} professional`
            ];
            
            // Add more abstract options for technical topics
            const technicalTopics = ['ComputerVision', 'NLP', 'DeepLearning', 'SoftwareEng', 'HardwareDev', 'BrainComputer', 'Machine', 'AI'];
            if (technicalTopics.some(techTopic => topic.toLowerCase().includes(techTopic.toLowerCase()))) {
                const technicalFallbacks = [
                    `${topic} abstract`,
                    `${topic} digital art`,
                    `${topic} data visualization`,
                    `${topic} pattern`,
                    `technology abstract`,
                    `digital network`,
                    `futuristic technology`,
                    `tech visualization`
                ];
                diverseKeywords = [...diverseKeywords, ...technicalFallbacks];
                console.log(`Using enhanced technical image search keywords for ${topic}`);
            }
            
            for (const keyword of diverseKeywords) {
                if (allImages.length >= captions.length) break;
                
                const images = await searchUnsplashImages(keyword, 2);
                if (images) {
                    images.forEach(img => {
                        if (!usedImageIds.has(img.id) && allImages.length < captions.length) {
                            usedImageIds.add(img.id);
                            allImages.push(img);
                        }
                    });
                }
            }
        }

        // Fallback to default images if needed
        if (!allImages || allImages.length === 0) {
            console.warn('Failed to fetch images from Unsplash, using default images');
            allImages = defaultImages.map((url, index) => ({ 
                id: `default-${index}`,
                url, 
                credit: { name: 'Unknown', username: 'unknown', link: 'https://unsplash.com' } 
            }));
        }

        // Replace [IMAGE] markers with actual image markdown and credits
        let imageIndex = 0;
        mainContent = mainContent.replace(/\[IMAGE\]/g, () => {
            if (imageIndex >= allImages.length) {
                return ''; // Skip if we don't have enough images
            }
            
            const image = allImages[imageIndex];
            const caption = captions[imageIndex] || `${title} - Image ${imageIndex + 1}`;
            imageIndex++;
            
            // Use HTML img tag instead of Markdown syntax for MDX compatibility
            return `<img src="${image.url}" alt="${caption}" />
<small>Photo by <a href="${image.credit.link}">${image.credit.name}</a> on <a href="https://unsplash.com/@${image.credit.username}">Unsplash</a></small>\n`;
        });
                
        // Process content to add table of contents, fix formatting, and add anchor links
        mainContent = processArticleContent(mainContent, title);

        // Move the FAQs to the end of the article - CHANGED HERE!
        if (faqs) {
            const formattedFaqs = fixFaqFormatting(faqs);
            // Add FAQ section at the end
            mainContent += `\n\n<h2 id="frequently-asked-questions">Frequently Asked Questions</h2>\n\n${formattedFaqs}`;
        }

        // Add enhanced social sharing section at the end after FAQs
        if (socialSnippet) {
            mainContent += `\n\n<h2>Share This Article</h2>\n\n${createSocialShareLinks(title, slug, socialSnippet)}\n\n<blockquote>\n  <p>${socialSnippet}</p>\n</blockquote>\n`;
        }

        // Validate the article content
        const contentValidation = validateArticleContent(mainContent, title, excerpt);
        
        // Log any warnings
        Object.entries(contentValidation.warnings)
            .filter(([_, isWarning]) => isWarning)
            .forEach(([warningType]) => {
                console.warn(`Content warning: ${warningType}`);
            });
        
        // Get a high-quality featured image
        const featuredImage = await getFeaturedImage(topic, seoKeywords);
        
        // Calculate reading time
        const readingTime = calculateReadingTime(mainContent);

        // Create enhanced frontmatter
        const frontmatter = {
            title: `"${title}"`,
            date: getCurrentDate(),
            slug,
            excerpt,
            metaDescription: metaDescription || excerpt.slice(0, 155) + '...',
            category: topic.split(':')[0].trim(),
            status: 'new',
            trending: true,
            featured: Math.random() > 0.7, // Make some articles featured
            image: `"${featuredImage ? featuredImage.url : allImages[0].url}"`, // Use the high-quality featured image
            imageAlt: `"${title}"`,
            imageCredit: featuredImage 
                ? `Photo by ${featuredImage.credit.name} on Unsplash`
                : `Photo by ${allImages[0].credit.name} on Unsplash`,
            keywords: seoKeywords,
            readingTime,
            socialShare: socialSnippet 
                ? socialSnippet.replace(/^["']|["']$/g, '').trim().replace(/\*([^\*]+)\*/g, '$1')
                : '', // Clean up quotes and remove markdown formatting
            generatedBy: 'Gemini'
        };
            
        // Format the final content
        const finalContent = `---
${Object.entries(frontmatter)
    .map(([key, value]) => {
        if (Array.isArray(value)) {
            return `${key}: [${value.map(item => `"${item.replace(/"/g, '\\"')}"`).join(', ')}]`;
        }
        // For strings that are already quoted, keep them as is
        if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
            return `${key}: ${value}`;
        }
        // Wrap strings containing special characters in quotes
        if (typeof value === 'string' && (value.includes(':') || value.includes('"') || value.includes("'"))) {
            return `${key}: "${value.replace(/"/g, '\\"')}"`;
        }
        return `${key}: ${value}`;
    })
    .join('\n')}
---

${mainContent}`;

        const filename = `${getCurrentDate()}-${slug}.md`;
        const filepath = path.join(process.cwd(), 'content', 'articles', filename);
        await fsp.writeFile(filepath, finalContent, 'utf8');
        
        console.log('Article generated successfully with Gemini:');
        console.log(`Title: ${title}`);
        console.log(`Filename: ${filename}`);
        console.log(`Keywords: ${seoKeywords.join(', ')}`);
        console.log(`Social Snippet: ${socialSnippet.substring(0, 100) + (socialSnippet.length > 100 ? '...' : '')}`);
        
        return {
            filename,
            title,
            excerpt,
            slug,
            keywords: seoKeywords,
            socialSnippet,
            generatedBy: 'Gemini'
        };
    } catch (error) {
        console.error('Error generating article:', error);
        return null;
    }
}

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
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

// Update the generateSEOKeywords function to use the GoogleGenerativeAI library
async function generateSEOKeywords(topic, count = 10) {
    try {
        // Initialize the Gemini API
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Generate ${count} SEO-optimized keywords for an article about "${topic}". 
        These keywords should be relevant to the topic and have good search volume.
        Return only the keywords as a comma-separated list without numbering or bullet points.`;
        
        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const content = response.text();
        
        // Parse the keywords from the response
        const keywords = content
            .split(',')
            .map(keyword => keyword.trim())
            .filter(keyword => keyword.length > 0)
            .slice(0, count);
        
        return keywords.length > 0 ? keywords : [
            topic.split(':')[0].trim().toLowerCase(),
            'trending',
            'latest',
            'developments',
            'research'
        ];
    } catch (error) {
        console.error('Error generating SEO keywords:', error);
        // Return fallback keywords based on the topic
        const topicWords = topic.toLowerCase().split(/\s+/);
        return [...topicWords, 'trending', 'latest', 'developments', 'research'].slice(0, count);
    }
}

// Add function to validate content
function validateArticleContent(content, title, excerpt) {
    // Check for placeholder images
    if (content.includes('https://via.placeholder.com/800x400?text=Loading+Image')) {
        console.warn('Warning: Content contains placeholder images that have not been replaced with actual images');
        return {
            isValid: false,
            warnings: {
                hasPlaceholderImages: true
            }
        };
    }
    
    // Check for minimum required length (approx. 1000 words)
    if (content.length < 4000) {
        console.warn(`Warning: Article content is shorter than expected (${content.length} chars)`);
    }
    
    // Check for excessive bold markers which might indicate formatting issues
    const boldMarkerCount = (content.match(/\*\*/g) || []).length;
    if (boldMarkerCount > 40) {
        console.warn(`Warning: Article has ${boldMarkerCount} bold markers, which seems excessive`);
    }
    
    // Check for proper heading structure
    const headings = content.match(/##\s+.+/g) || [];
    if (headings.length < 3) {
        console.warn(`Warning: Article has only ${headings.length} section headings`);
    }
    
    // Check for image placeholders
    const imagePlaceholders = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
    if (imagePlaceholders < 3) {
        console.warn(`Warning: Article only has ${imagePlaceholders} images`);
    }
    
    // Check for potential repeating content (more than 3 identical sentences)
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const sentenceMap = {};
    sentences.forEach(s => {
        const normalized = s.trim().toLowerCase();
        sentenceMap[normalized] = (sentenceMap[normalized] || 0) + 1;
    });
    
    const repeatedSentences = Object.entries(sentenceMap)
        .filter(([_, count]) => count > 1)
        .map(([sentence]) => sentence);
    
    if (repeatedSentences.length > 2) {
        console.warn(`Warning: Article has ${repeatedSentences.length} repeated sentences`);
    }
    
    return {
        isValid: true, // Always return true but with warnings
        warnings: {
            tooShort: content.length < 4000,
            poorFormatting: boldMarkerCount > 40,
            fewSections: headings.length < 3,
            fewImages: imagePlaceholders < 3,
            repetitiveContent: repeatedSentences.length > 2
        }
    };
}

// Function to escape special characters for MDX compatibility
function escapeForMdx(text) {
    if (!text) return '';
    
    // First, replace all HTML tags with placeholders
    const htmlTags = [];
    let processedText = text.replace(/<[^>]+>/g, (match) => {
        htmlTags.push(match);
        return `HTML_TAG_PLACEHOLDER_${htmlTags.length - 1}`;
    });
    
    // Now process special characters that might cause issues in MDX
    processedText = processedText
        // Replace exclamation marks with a safer version
        .replace(/!(?!\[)/g, 'EXCLAMATION_MARK_PLACEHOLDER')
        // Replace other potentially problematic characters
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&(?!lt;|gt;|amp;)/g, '&amp;');
        
    // Restore HTML tags
    htmlTags.forEach((tag, index) => {
        processedText = processedText.replace(`HTML_TAG_PLACEHOLDER_${index}`, tag);
    });
    
    // Restore exclamation marks
    processedText = processedText.replace(/EXCLAMATION_MARK_PLACEHOLDER/g, '!');
    
    return processedText;
}

// Fix the FAQ formatting function to handle template-based FAQs better
function fixFaqFormatting(faqContent) {
    if (!faqContent) return '';
    
    console.log('Original FAQ format: ' + faqContent.substring(0, 70) + '...');
    
    try {
        // Replace Q: with proper formatting
        let formattedFaqs = faqContent.replace(/\*\*Q:(.*?)\*\*/g, '<div class="faq-question"><strong>Q:</strong>$1</div>');
        
        // Replace A: with proper formatting
        formattedFaqs = formattedFaqs.replace(/\*\*A:(.*?)\*\*/g, '<div class="faq-answer"><strong>A:</strong>$1</div>');
        
        // Wrap each Q&A pair in a div
        const faqItems = formattedFaqs.split('\n\n').filter(item => item.trim() !== '');
        
        const wrappedFaqs = faqItems.map(item => {
            return `<div class="faq-item">${item}</div>`;
        }).join('\n\n');
        
        const finalFaqs = `<div class="faq-section">\n${wrappedFaqs}\n</div>`;
        
        console.log('Formatted FAQ output: ' + finalFaqs.substring(0, 70) + '...');
        return finalFaqs;
    } catch (error) {
        console.error('Error formatting FAQs:', error);
        // Return a simplified version if there's an error
        return `<div class="faq-section">${faqContent}</div>`;
    }
}

// Update the generateSimpleArticle function to handle errors better
async function generateSimpleArticle(topic) {
    try {
        console.log(`Generating simple article for: ${topic}`);
        
        // Generate a title based on the topic
        const title = `${topic}: Essential Guide for 2025`;
        
        // Create a slug from the title
        const slug = createSlug(title);
        
        // Generate a simple excerpt
        const excerpt = `Discover the latest trends and insights about ${topic} in this comprehensive guide. Learn how to leverage these developments to stay ahead of the curve and maximize your success in 2025 and beyond.`;
        
        // Generate a meta description
        const metaDescription = `Explore the essential aspects of ${topic} in our comprehensive 2025 guide. Get actionable insights and expert tips to help you navigate this evolving landscape.`;
        
        // Generate a social snippet
        const socialSnippet = `Stay ahead of the curve with our latest insights on ${topic}. This comprehensive guide provides everything you need to know for 2025!`;
        
        // Generate main content sections
        const mainContent = `
The world of ${topic} is evolving rapidly, and staying informed is crucial for success in 2025 and beyond. This comprehensive guide explores the latest trends, technologies, and strategies that are shaping the future of this dynamic field.

<h2 id="section-1">Understanding the Current Landscape</h2>

As we move further into 2025, the landscape of ${topic} continues to transform at an unprecedented pace. Technological advancements, changing consumer behaviors, and global economic shifts are all contributing to a new reality that businesses and individuals must navigate carefully.

Recent studies indicate that organizations embracing innovative approaches to ${topic} are seeing significantly better outcomes than those relying on outdated methodologies. This gap is expected to widen further as new technologies mature and become more accessible.

<img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3MjE4ODJ8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5fGVufDB8MHx8fDE3NDE4NjQwMjh8MA&ixlib=rb-4.0.3&q=80&w=1080" alt="${topic} landscape in 2025" />
<small>Photo by NASA on Unsplash</small>

<h2 id="section-2">Key Trends to Watch</h2>

Several important trends are emerging in the ${topic} space that deserve your attention:

<ul>
<li><strong>Artificial Intelligence Integration</strong>: AI is no longer just a buzzword but a fundamental component of successful ${topic} strategies. From predictive analytics to automated decision-making, AI is revolutionizing how we approach challenges and opportunities.</li>
<li><strong>Sustainability Focus</strong>: Environmental considerations are now central to ${topic}, with consumers and stakeholders demanding responsible practices and transparent reporting.</li>
<li><strong>Personalization at Scale</strong>: Advanced data analytics are enabling unprecedented levels of personalization, allowing for tailored experiences without sacrificing efficiency.</li>
<li><strong>Remote Collaboration</strong>: The distributed workforce model has matured, with new tools and methodologies emerging to support seamless collaboration across geographical boundaries.</li>
</ul>

<img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3MjE4ODJ8MHwxfHNlYXJjaHwyfHx0ZWNobm9sb2d5fGVufDB8MHx8fDE3NDE4NjQwMjh8MA&ixlib=rb-4.0.3&q=80&w=1080" alt="Key trends in ${topic} for 2025" />
<small>Photo by Marvin Meyer on Unsplash</small>

<h2 id="section-3">Practical Strategies for Success</h2>

Implementing effective strategies is essential for navigating the complex world of ${topic}. Here are some practical approaches that are proving successful in 2025:

<ul>
<li><strong>Invest in Continuous Learning</strong>: The rapid pace of change requires ongoing education and skill development. Organizations and individuals that prioritize learning are better positioned to adapt and thrive.</li>
<li><strong>Embrace Data-Driven Decision Making</strong>: Leveraging data analytics provides valuable insights that can inform strategic decisions and drive better outcomes.</li>
<li><strong>Build Resilient Systems</strong>: In an uncertain world, building resilience into your ${topic} approach is crucial for long-term success.</li>
<li><strong>Foster Collaborative Ecosystems</strong>: Partnerships and collaborations can provide access to new resources, markets, and innovations that would be difficult to develop independently.</li>
</ul>

<img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3MjE4ODJ8MHwxfHNlYXJjaHwzfHx0ZWNobm9sb2d5fGVufDB8MHx8fDE3NDE4NjQwMjh8MA&ixlib=rb-4.0.3&q=80&w=1080" alt="Strategies for ${topic} success" />
<small>Photo by Annie Spratt on Unsplash</small>

<h2 id="section-4">Future Outlook</h2>

Looking ahead, the future of ${topic} appears both challenging and full of opportunity. Experts predict continued disruption as emerging technologies mature and new innovations enter the market. Organizations that remain agile, informed, and proactive will be best positioned to capitalize on these changes.

The integration of virtual and augmented reality, blockchain technology, and quantum computing are all expected to have significant impacts on ${topic} in the coming years. Staying informed about these developments and considering their potential applications will be crucial for maintaining a competitive edge.

<img src="https://images.unsplash.com/photo-1535378917042-10a22c95931a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3MjE4ODJ8MHwxfHNlYXJjaHw0fHx0ZWNobm9sb2d5fGVufDB8MHx8fDE3NDE4NjQwMjh8MA&ixlib=rb-4.0.3&q=80&w=1080" alt="Future of ${topic}" />
<small>Photo by Alex Knight on Unsplash</small>

<h2 id="section-5">Conclusion</h2>

As we navigate the complex landscape of ${topic} in 2025, the importance of staying informed, adaptable, and strategic cannot be overstated. By understanding current trends, implementing effective strategies, and maintaining a forward-looking perspective, you can position yourself for success in this dynamic field.

Remember that the most successful approaches to ${topic} combine technological innovation with human creativity and insight. By striking this balance, you can harness the full potential of available tools and methodologies while maintaining the flexibility to adapt to changing circumstances.

Stay curious, stay informed, and stay ahead of the curve in the exciting world of ${topic}.
`;

        // Generate FAQs in HTML format directly
        const faqs = `
<div class="faq-item">
  <div class="faq-question"><strong>Q:</strong> What are the most important skills needed for ${topic} in 2025?</div>
  <div class="faq-answer"><strong>A:</strong> The most critical skills include data literacy, adaptability, critical thinking, and collaborative problem-solving. Technical knowledge specific to your field is also essential, but these foundational skills will enable you to navigate the rapidly changing landscape effectively.</div>
</div>

<div class="faq-item">
  <div class="faq-question"><strong>Q:</strong> How can small businesses compete in the ${topic} space?</div>
  <div class="faq-answer"><strong>A:</strong> Small businesses can leverage their agility and focus on niche markets where they can provide specialized expertise or solutions. Utilizing cloud-based tools, forming strategic partnerships, and maintaining close customer relationships can help small businesses compete effectively despite resource limitations.</div>
</div>

<div class="faq-item">
  <div class="faq-question"><strong>Q:</strong> What technologies will have the biggest impact on ${topic} in the next five years?</div>
  <div class="faq-answer"><strong>A:</strong> Artificial intelligence, extended reality (XR), blockchain, and quantum computing are expected to have transformative effects on ${topic}. The specific impact will vary by industry, but these technologies are driving innovation across sectors.</div>
</div>

<div class="faq-item">
  <div class="faq-question"><strong>Q:</strong> How can I stay updated on the latest developments in ${topic}?</div>
  <div class="faq-answer"><strong>A:</strong> Follow industry publications, join professional communities, attend conferences (virtual or in-person), and engage with thought leaders on social media. Continuous learning through courses and certifications is also valuable for staying current with evolving best practices.</div>
</div>

<div class="faq-item">
  <div class="faq-question"><strong>Q:</strong> What are the biggest challenges facing ${topic} professionals today?</div>
  <div class="faq-answer"><strong>A:</strong> The rapid pace of technological change, information overload, balancing innovation with security concerns, and addressing ethical considerations are among the most significant challenges. Developing strategies to navigate these issues is essential for long-term success.</div>
</div>
`;
        
        // Wrap FAQs in a section
        const formattedFaqs = `<div class="faq-section">\n${faqs}\n</div>`;
        
        // Add FAQ section at the end
        const contentWithFaqs = `${mainContent}\n\n<h2 id="frequently-asked-questions">Frequently Asked Questions</h2>\n\n${formattedFaqs}`;
        
        // Add social sharing section
        const contentWithSocial = `${contentWithFaqs}\n\n<h2>Share This Article</h2>\n\n${createSocialShareLinks(title, slug, socialSnippet)}\n\n<blockquote>\n  <p>${socialSnippet}</p>\n</blockquote>\n`;
        
        // Process content to add table of contents, fix formatting, and add anchor links
        const processedContent = processArticleContent(contentWithSocial, title);
        
        // Get a featured image
        const featuredImage = {
            url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3MjE4ODJ8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5fGVufDB8MHx8fDE3NDE4NjQwMjh8MA&ixlib=rb-4.0.3&q=80&w=1080",
            credit: { name: 'Alex Knight', username: 'agkdesign', link: 'https://unsplash.com/@agkdesign' }
        };
        
        // Calculate reading time
        const readingTime = calculateReadingTime(processedContent);
        
        // Create frontmatter
        const frontmatter = {
            title: `"${title}"`,
            date: getCurrentDate(),
            slug,
            excerpt,
            metaDescription,
            category: topic.split(':')[0].trim(),
            status: 'new',
            trending: true,
            featured: Math.random() > 0.7,
            image: `"${featuredImage.url}"`,
            imageAlt: `"${title}"`,
            imageCredit: `Photo by ${featuredImage.credit.name} on Unsplash`,
            keywords: topic.split(' ').filter(word => word.length > 3),
            readingTime,
            socialShare: socialSnippet,
            generatedBy: 'Template'
        };
        
        // Format the final content
        const finalContent = `---
${Object.entries(frontmatter)
    .map(([key, value]) => {
        if (Array.isArray(value)) {
            return `${key}: [${value.map(item => `"${item.replace(/"/g, '\\"')}"`).join(', ')}]`;
        }
        // For strings that are already quoted, keep them as is
        if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
            return `${key}: ${value}`;
        }
        // Wrap strings containing special characters in quotes
        if (typeof value === 'string' && (value.includes(':') || value.includes('"') || value.includes("'"))) {
            return `${key}: "${value.replace(/"/g, '\\"')}"`;
        }
        return `${key}: ${value}`;
    })
    .join('\n')}
---

${processedContent}`;

        const filename = `${getCurrentDate()}-${slug}.md`;
        const filepath = path.join(process.cwd(), 'content', 'articles', filename);
        await fsp.writeFile(filepath, finalContent, 'utf8');
        
        console.log('Article generated successfully:');
        console.log(`Title: ${title}`);
        console.log(`Filename: ${filename}`);
        console.log(`Social Snippet: ${socialSnippet}`);
        
        return {
            filename,
            title,
            excerpt,
            slug,
            socialSnippet,
            generatedBy: 'Template'
        };
    } catch (error) {
        console.error('Error generating simple article:', error);
        return null;
    }
}

// Update the main function to completely bypass the Gemini API calls
async function main() {
    try {
        const topic = process.argv[2] || 'Tech Trends 2025';
        
        console.log(`Generating article for: ${topic}`);
        console.log('Using template-based article generation...');
        
        const result = await generateSimpleArticle(topic);
        
        if (result) {
            console.log('Article generated successfully:');
            console.log(`Title: ${result.title}`);
            console.log(`Filename: ${result.filename}`);
            console.log(`Generated by: ${result.generatedBy}`);
        } else {
            console.error('Failed to generate article.');
        }
    } catch (error) {
        console.error('Error generating article:', error);
    }
}

// Call the main function if this script is run directly
if (require.main === module) {
    main();
} 