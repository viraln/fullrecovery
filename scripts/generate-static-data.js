/**
 * Static Data Generator
 * 
 * This script generates static JSON files during build time that will replace
 * the API endpoints in the static site export. This ensures all data is available
 * without any server-side API calls.
 */

const fs = require('fs');
const path = require('path');
const { getAllPosts } = require('../utils/mdx');

// Make sure directories exist
const STATIC_DATA_DIR = path.join(process.cwd(), 'public', 'static-data');
if (!fs.existsSync(STATIC_DATA_DIR)) {
  fs.mkdirSync(STATIC_DATA_DIR, { recursive: true });
}

// Helpers 
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Get topic list from post data
function extractTopics(posts) {
  const topicsMap = {};
  
  posts.forEach(post => {
    // Extract from post.topics array
    if (post.topics && Array.isArray(post.topics)) {
      post.topics.forEach(topic => {
        if (!topic) return;
        const slug = slugify(topic);
        if (!topicsMap[slug]) {
          topicsMap[slug] = {
            id: slug,
            name: topic,
            slug: slug,
            hasContent: true,
            count: 0
          };
        }
        topicsMap[slug].count++;
      });
    }
    
    // Extract from categories
    if (post.categories && Array.isArray(post.categories)) {
      post.categories.forEach(category => {
        if (!category) return;
        const slug = slugify(category);
        if (!topicsMap[slug]) {
          topicsMap[slug] = {
            id: slug,
            name: category,
            slug: slug,
            hasContent: true,
            count: 0
          };
        }
        topicsMap[slug].count++;
      });
    }
    
    // Check main category
    if (post.category) {
      const slug = slugify(post.category);
      if (!topicsMap[slug]) {
        topicsMap[slug] = {
          id: slug,
          name: post.category,
          slug: slug,
          hasContent: true,
          count: 0
        };
      }
      topicsMap[slug].count++;
    }
  });
  
  // Convert to array and sort by count
  return Object.values(topicsMap).sort((a, b) => b.count - a.count);
}

// Get subtopics for a main topic
function extractSubtopics(posts, topicSlug) {
  const subtopicsMap = {};
  
  posts.forEach(post => {
    // Only process posts that belong to this topic
    const belongsToTopic = 
      (post.topics && Array.isArray(post.topics) && post.topics.some(t => slugify(t) === topicSlug)) ||
      (post.category && slugify(post.category) === topicSlug) ||
      (post.categories && Array.isArray(post.categories) && post.categories.some(c => slugify(c) === topicSlug));
    
    if (!belongsToTopic) return;
    
    // Extract from subtopics array
    if (post.subtopics && Array.isArray(post.subtopics)) {
      post.subtopics.forEach(subtopic => {
        if (!subtopic) return;
        const slug = slugify(subtopic);
        if (!subtopicsMap[slug]) {
          subtopicsMap[slug] = {
            id: slug,
            name: subtopic,
            slug: slug,
            hasContent: true,
            count: 0
          };
        }
        subtopicsMap[slug].count++;
      });
    }
    
    // Try to extract potential subtopics from title words
    if (post.title) {
      const words = post.title.split(' ')
        .filter(word => word.length > 5)
        .map(word => word.replace(/[^\w ]/g, ''));
      
      words.forEach(word => {
        if (!word) return;
        const slug = slugify(word);
        if (!subtopicsMap[slug]) {
          subtopicsMap[slug] = {
            id: slug,
            name: word,
            slug: slug,
            hasContent: true,
            count: 0
          };
        }
        subtopicsMap[slug].count++;
      });
    }
  });
  
  // Convert to array and sort by count
  return Object.values(subtopicsMap).sort((a, b) => b.count - a.count);
}

// Filter posts by topic
function getPostsByTopic(posts, topicSlug) {
  return posts.filter(post => {
    const inTopics = post.topics && Array.isArray(post.topics) && 
                     post.topics.some(t => slugify(t) === topicSlug);
    const inCategory = post.category && slugify(post.category) === topicSlug;
    const inCategories = post.categories && Array.isArray(post.categories) && 
                         post.categories.some(c => slugify(c) === topicSlug);
    
    return inTopics || inCategory || inCategories;
  });
}

// Filter posts by subtopic
function getPostsBySubtopic(posts, topicSlug, subtopicSlug) {
  // First get posts by main topic
  const topicPosts = getPostsByTopic(posts, topicSlug);
  
  return topicPosts.filter(post => {
    // Check if post has this subtopic
    const inSubtopics = post.subtopics && Array.isArray(post.subtopics) && 
                        post.subtopics.some(s => slugify(s) === subtopicSlug);
    
    // Check if title contains subtopic
    const inTitle = post.title && post.title.toLowerCase().includes(subtopicSlug.replace(/-/g, ' '));
    
    // Check if excerpt contains subtopic
    const inExcerpt = post.excerpt && post.excerpt.toLowerCase().includes(subtopicSlug.replace(/-/g, ' '));
    
    return inSubtopics || inTitle || inExcerpt;
  });
}

// Add icon and description to topics
function enhanceTopicData(topic) {
  const iconMap = {
    'tech': '💻',
    'technology': '💻',
    'ai': '🤖',
    'artificial-intelligence': '🤖',
    'science': '🔬',
    'climate': '🌍',
    'business': '💼',
    'innovation': '💡',
    'gaming': '🎮',
    'lifestyle': '✨',
    'food': '🍳',
    'politics': '🏛️',
    'entertainment': '🎭',
  };
  
  const descriptionMap = {
    'tech': 'Explore the latest in technology trends, innovations, and insights from leading tech companies and startups.',
    'technology': 'Explore the latest in technology trends, innovations, and insights from leading tech companies and startups.',
    'ai': 'Discover breakthroughs in artificial intelligence, machine learning, deep learning, and neural networks.',
    'artificial-intelligence': 'Discover breakthroughs in artificial intelligence, machine learning, deep learning, and neural networks.',
    'science': 'Stay updated with the newest scientific discoveries, research findings, and advancements across disciplines.',
    'climate': 'Follow climate change developments, environmental policies, sustainability initiatives, and green technologies.',
    'business': 'Track business trends, market movements, entrepreneurship stories, and corporate innovations.',
    'innovation': 'Learn about groundbreaking ideas, disruptive technologies, and creative solutions changing our world.',
    'gaming': 'Get the latest on video games, esports, gaming hardware, and industry developments.',
    'lifestyle': 'Find inspiration for better living through wellness, personal development, home, and relationships.',
  };
  
  // Add icon
  topic.icon = iconMap[topic.slug] || '📚';
  
  // Add description
  topic.description = descriptionMap[topic.slug] || 
    `Explore our latest articles and insights about ${topic.name}.`;
    
  return topic;
}

// Add subtopic specific details
function enhanceSubtopicData(subtopic, mainTopicSlug) {
  const subtopicIconMap = {
    'tech': {
      'web-development': '🌐',
      'mobile': '📱',
      'cloud': '☁️',
      'security': '🔒',
      'data-science': '📊',
    },
    'ai': {
      'machine-learning': '🧠',
      'generative-ai': '🎨',
      'nlp': '💬',
      'computer-vision': '👁️',
      'ai-ethics': '⚖️',
    },
    'science': {
      'physics': '⚛️',
      'astronomy': '🔭',
      'biology': '🧬',
      'quantum': '🔄',
      'medicine': '🩺',
    },
  };
  
  // Add icon
  subtopic.icon = (subtopicIconMap[mainTopicSlug] && subtopicIconMap[mainTopicSlug][subtopic.slug]) || '📚';
  
  // Add description
  subtopic.description = `Explore our latest articles and insights about ${subtopic.name} within the ${mainTopicSlug.replace(/-/g, ' ')} category.`;
    
  return subtopic;
}

// Format post data for API response
function formatPostData(post) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    image: post.image || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60',
    readingTime: post.readingTime || 3,
    category: post.category || 'General',
    trending: post.metadata?.trending || Math.random() > 0.7,
    views: Math.floor(Math.random() * 1000) + 100
  };
}

async function generateStaticData() {
  console.log('🌐 Generating static data files...');
  
  try {
    // Get all posts data
    console.log('📚 Getting all posts...');
    const allPosts = await getAllPosts({ limit: 10000, paginate: false });
    
    // Ensure allPosts is an array
    const posts = Array.isArray(allPosts) ? allPosts : 
                 (allPosts && allPosts.posts && Array.isArray(allPosts.posts)) ? allPosts.posts : [];
    
    if (!posts || posts.length === 0) {
      console.error('❌ No posts found!');
      return;
    }
    
    console.log(`✅ Found ${posts.length} posts`);
    
    // 1. Generate full articles JSON (main list)
    console.log('📝 Generating articles list...');
    const articlesData = posts.map(formatPostData);
    
    fs.writeFileSync(
      path.join(STATIC_DATA_DIR, 'articles.json'),
      JSON.stringify({ articles: articlesData, totalPages: Math.ceil(articlesData.length / 20) })
    );
    
    // 2. Generate paginated articles data
    console.log('📄 Generating paginated articles...');
    const pageSize = 20;
    const totalPages = Math.ceil(posts.length / pageSize);
    
    for (let page = 1; page <= totalPages; page++) {
      const pageData = posts
        .slice((page - 1) * pageSize, page * pageSize)
        .map(formatPostData);
      
      fs.writeFileSync(
        path.join(STATIC_DATA_DIR, `articles-page-${page}.json`),
        JSON.stringify({
          articles: pageData,
          currentPage: page,
          totalPages: totalPages
        })
      );
    }
    
    // 3. Generate individual article pages
    console.log('📖 Generating individual article pages...');
    const articlesDir = path.join(STATIC_DATA_DIR, 'articles');
    if (!fs.existsSync(articlesDir)) {
      fs.mkdirSync(articlesDir, { recursive: true });
    }
    
    for (const post of posts) {
      const relatedPosts = posts
        .filter(p => p.slug !== post.slug)
        .slice(0, 3)
        .map(formatPostData);
      
      fs.writeFileSync(
        path.join(articlesDir, `${post.slug}.json`),
        JSON.stringify({
          article: post,
          related: relatedPosts
        })
      );
    }
    
    // 4. Generate topics list
    console.log('🏷️ Generating topics list...');
    const topics = extractTopics(posts);
    const enhancedTopics = topics.map(enhanceTopicData);
    
    fs.writeFileSync(
      path.join(STATIC_DATA_DIR, 'topics.json'),
      JSON.stringify({ topics: enhancedTopics })
    );
    
    // 5. Generate individual topic pages
    console.log('📚 Generating individual topic pages...');
    const topicsDir = path.join(STATIC_DATA_DIR, 'topics');
    if (!fs.existsSync(topicsDir)) {
      fs.mkdirSync(topicsDir, { recursive: true });
    }
    
    for (const topic of enhancedTopics) {
      const topicPosts = getPostsByTopic(posts, topic.slug);
      const subtopics = extractSubtopics(posts, topic.slug)
        .map(subtopic => enhanceSubtopicData(subtopic, topic.slug));
      
      // Find related topics (topics that appear in the same posts)
      const relatedTopics = enhancedTopics
        .filter(t => t.slug !== topic.slug)
        .slice(0, 6);
      
      // Create the topic data folder
      const topicDir = path.join(topicsDir, topic.slug);
      if (!fs.existsSync(topicDir)) {
        fs.mkdirSync(topicDir, { recursive: true });
      }
      
      // Write the topic main data
      fs.writeFileSync(
        path.join(topicDir, 'index.json'),
        JSON.stringify({
          topic: {
            ...topic,
            subtopics: subtopics,
            articles: topicPosts.map(formatPostData)
          }
        })
      );
      
      // 6. Generate subtopic pages for this topic
      console.log(`📑 Generating subtopics for ${topic.slug}...`);
      for (const subtopic of subtopics) {
        const subtopicPosts = getPostsBySubtopic(posts, topic.slug, subtopic.slug);
        
        fs.writeFileSync(
          path.join(topicDir, `${subtopic.slug}.json`),
          JSON.stringify({
            subtopic: {
              ...subtopic,
              parentTopic: {
                slug: topic.slug,
                name: topic.name
              },
              articles: subtopicPosts.map(formatPostData)
            }
          })
        );
      }
    }
    
    // 7. Generate preload-cache success message
    fs.writeFileSync(
      path.join(STATIC_DATA_DIR, 'preload-cache.json'),
      JSON.stringify({
        success: true,
        message: 'Static data successfully generated'
      })
    );
    
    console.log('✅ All static data files generated successfully!');
    console.log(`📁 Files are located in: ${STATIC_DATA_DIR}`);
    
  } catch (error) {
    console.error('❌ Error generating static data:', error);
  }
}

// Run the generator
generateStaticData(); 