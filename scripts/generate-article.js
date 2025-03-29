require('dotenv').config();
const fetch = require("node-fetch");
const fs = require("fs").promises;
const path = require("path");

// Constants
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retry = async (fn, retries = 5, initialDelay = 2000) => {
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
    return text
        .replace(/[^\w\s-]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .slice(0, 50);
};

// Placeholder images by category
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

function getMultipleImages(topic) {
  const categoryImages = placeholders[topic] || defaultImages;
  console.log(`Using placeholder images for topic: ${topic}`);
  return categoryImages;
}

async function searchUnsplashImages(query, count = 1) {
    if (!UNSPLASH_ACCESS_KEY) {
        throw new Error('Unsplash API key not found in environment variables');
    }

    try {
        const response = await fetch(
            `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
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
            url: photo.urls.regular,
            credit: {
                name: photo.user.name,
                username: photo.user.username,
                link: photo.user.links.html
            }
        }));
    } catch (error) {
        console.error('Error fetching images from Unsplash:', error);
        return null;
    }
}

async function generateArticle(topic) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not found in environment variables');
    }

    const prompt = `Write a comprehensive article about "${topic}".
Format as:
TITLE: [title]
EXCERPT: [2-3 sentences]
CONTENT: [Write a well-structured article with 3-4 sections. Include [IMAGE] markers at natural points where images would enhance the content. Each image should have a relevant caption.]`;

    const response = await retry(async () => {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://Trendiingz.com',
                'X-Title': 'Trendiingz Article Generator'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-2',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
        
        if (!data.choices?.[0]?.message?.content) {
            throw new Error(`Invalid API response format: ${JSON.stringify(data)}`);
        }

        return data.choices[0].message.content;
    });

    // Parse the response
    const content = response.replace(/\\/g, '');
    const titleMatch = content.match(/TITLE: (.*?)(?=\n|$)/);
    const excerptMatch = content.match(/EXCERPT: ([\s\S]*?)(?=\n\nCONTENT:)/);
    const contentMatch = content.match(/CONTENT:\s*([\s\S]*?)(?=\n\nCONCLUSION:|\n*$)/);

    if (!titleMatch || !excerptMatch || !contentMatch) {
        console.error('Failed to parse content:', content);
        throw new Error('Failed to parse generated content');
    }

    const title = titleMatch[1].trim();
    const excerpt = excerptMatch[1].trim();
    let mainContent = contentMatch[1].trim();

    // Extract keywords for image search
    const keywords = extractKeywords(mainContent, title);
    
    // Fetch relevant images from Unsplash
    console.log('Fetching images for keywords:', keywords.slice(0, 3).join(', '));
    const imageSearchQuery = `${topic} ${keywords.slice(0, 2).join(' ')}`;
    const images = await searchUnsplashImages(imageSearchQuery, 3);

    if (!images) {
        console.warn('Failed to fetch images from Unsplash, using default images');
        images = defaultImages.map(url => ({ url, credit: null }));
    }

    // Replace [IMAGE] markers with actual image markdown and credits
    let imageIndex = 0;
    mainContent = mainContent.replace(/\[IMAGE\]/g, () => {
        const image = images[imageIndex % images.length];
        imageIndex++;
        return `![${title} - Image ${imageIndex}](${image.url})
<small>Photo by [${image.credit.name}](${image.credit.link}) on [Unsplash](https://unsplash.com/@${image.credit.username})</small>`;
    });

    // Calculate reading time
    const readingTime = calculateReadingTime(mainContent);

    // Create frontmatter
    const frontmatter = {
        title,
        date: getCurrentDate(),
        excerpt,
        category: topic.split(':')[0].trim(),
        author: 'AI Writer',
        status: 'new',
        image: images[0].url, // Banner image
        imageCredit: `Photo by ${images[0].credit.name} on Unsplash`,
        keywords,
        readingTime
    };

    // Format the final content
    const finalContent = `---
${Object.entries(frontmatter)
    .map(([key, value]) => {
        if (Array.isArray(value)) {
            return `${key}: [${value.join(', ')}]`;
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

    // Save the article
    const filename = `${getCurrentDate()}-${sanitizeTitle(title)}.md`;
    const filepath = path.join(process.cwd(), 'content', 'articles', filename);
    await fs.writeFile(filepath, finalContent, 'utf8');

    return filename;
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

// Allow running from command line or as module
if (require.main === module) {
    const topic = process.argv[2] || "tech";
    generateArticle(topic).then(console.log).catch(console.error);
}

module.exports = { generateArticle }; 