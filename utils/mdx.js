// This code runs only on the server side
// fs and path modules are only available on the server side
// We'll use dynamic imports to avoid errors on the client side

// Mark this function as server-side only
export const getAllPosts = async (options = {}) => {
  const { page = 1, limit = 50, paginate = true } = options;
  
  // Only include server-side code when running on the server
  if (typeof window === 'undefined') {
    try {
      // Dynamically import server-only modules
      const fs = await import('fs');
      const path = await import('path');
      const matter = await import('gray-matter');
      
      const postsDirectory = path.default.join(process.cwd(), 'content/articles');
      console.log('Looking for posts in directory:', postsDirectory);
      
      // Check if directory exists
      if (!fs.default.existsSync(postsDirectory)) {
        console.warn(`Posts directory not found: ${postsDirectory}`);
        console.log('Current working directory:', process.cwd());
        // Try to list parent directory contents to debug
        try {
          const contentDir = path.default.join(process.cwd(), 'content');
          if (fs.default.existsSync(contentDir)) {
            console.log('Content directory exists, listing contents:');
            console.log(fs.default.readdirSync(contentDir));
          } else {
            console.log('Content directory does not exist, listing project root:');
            console.log(fs.default.readdirSync(process.cwd()));
          }
        } catch (e) {
          console.error('Error listing directories:', e);
        }
        return paginate ? { 
          posts: [], 
          pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } 
        } : [];
      }
      
      const filenames = fs.default.readdirSync(postsDirectory);
      console.log(`Found ${filenames.length} files in posts directory`);
      console.log('First few filenames:', filenames.slice(0, 5));

      // Apply pagination if requested
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedFilenames = paginate 
        ? filenames.slice(startIndex, Math.min(endIndex, filenames.length))
        : filenames;
      
      const posts = await Promise.all(paginatedFilenames.map(async (filename) => {
        try {
          const filePath = path.default.join(postsDirectory, filename);
          const fileContents = fs.default.readFileSync(filePath, 'utf8');
          
          // Try to parse the frontmatter
          let data, content, excerpt;
          try {
            const result = matter.default(fileContents, { excerpt: true });
            data = result.data;
            content = result.content;
            excerpt = result.excerpt;
          } catch (parseError) {
            console.error(`Error parsing frontmatter in ${filename}:`, parseError);
            
            // Attempt to fix common YAML issues and retry
            let fixedContents = fileContents;
            // Remove Markdown formatting from frontmatter
            const frontmatterMatch = fileContents.match(/^---\n([\s\S]*?)\n---/);
            if (frontmatterMatch) {
              let frontmatter = frontmatterMatch[1];
              // Replace Markdown bold and italic formatting
              frontmatter = frontmatter.replace(/\*\*([^*]+)\*\*/g, '"$1"');
              frontmatter = frontmatter.replace(/\*([^*]+)\*/g, '"$1"');
              
              // Ensure all string values are quoted
              frontmatter = frontmatter.replace(/^([^:]+):\s*([^"\n{][^"\n]*[^"\n}])$/gm, '$1: "$2"');
              
              fixedContents = fileContents.replace(/^---\n([\s\S]*?)\n---/, `---\n${frontmatter}\n---`);
              
              try {
                const result = matter.default(fixedContents, { excerpt: true });
                data = result.data;
                content = result.content;
                excerpt = result.excerpt;
                console.log(`Successfully fixed and parsed frontmatter in ${filename}`);
              } catch (retryError) {
                // If fixing failed, use placeholder data
                console.error(`Failed to fix frontmatter in ${filename}:`, retryError);
                data = {
                  title: `Error parsing ${filename}`,
                  date: new Date().toISOString(),
                  slug: filename.replace(/\.md$/, '')
                };
                content = fileContents;
                excerpt = '';
              }
            }
          }

          // Calculate reading time
          const wordsPerMinute = 200;
          const wordCount = content.split(/\s+/g).length;
          const readingTime = Math.ceil(wordCount / wordsPerMinute);

          // Ensure date is properly formatted as ISO string
          const date = typeof data.date === 'string' ? data.date : 
                      data.date instanceof Date ? data.date.toISOString() :
                      new Date().toISOString();

          // Use a specific Unsplash photo if no image is provided
          const defaultImage = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60';

          // Calculate if the post is new (less than 7 days old)
          const isNew = (new Date() - new Date(date)) < 7 * 24 * 60 * 60 * 1000;

          // Extract slug from front matter or filename
          let slug;
          if (data.slug) {
            // Use the slug from front matter if available
            slug = data.slug;
          } else {
            // Extract slug from filename
            // Handle files with timestamp prefixes like 2025-03-20T14:42:46.336Z-my-article-slug.md
            const filenameWithoutExt = filename.replace(/\.mdx?$/, '');
            const timestampMatch = filenameWithoutExt.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-(.+)$/);
            
            if (timestampMatch) {
              // Extract the part after the timestamp
              slug = timestampMatch[1];
            } else {
              // If no timestamp prefix, use the whole filename without extension
              slug = filenameWithoutExt;
            }
          }

          // Process categories from frontmatter
          let categories = [];
          
          // If categories are explicitly defined in frontmatter
          if (data.categories) {
            if (Array.isArray(data.categories)) {
              categories = data.categories.map(cat => 
                typeof cat === 'string' ? cat : cat.name || ''
              ).filter(Boolean);
            } else if (typeof data.categories === 'string') {
              categories = [data.categories];
            }
          }
          
          // Add the main category if it exists and isn't already included
          if (data.category && !categories.includes(data.category)) {
            categories.unshift(data.category);
          }
          
          // Extract topics and subtopics from categories or keywords
          const topics = [];
          const subtopics = [];
          
          // Define main topic categories for matching
          const mainTopics = ['tech', 'ai', 'science', 'climate', 'business', 'innovation', 'gaming', 'lifestyle'];
          
          // Process categories and place them in topics or subtopics
          categories.forEach(cat => {
            const normalizedCat = cat.toLowerCase();
            // Check if this category is a main topic
            if (mainTopics.includes(normalizedCat)) {
              topics.push(normalizedCat);
            } else {
              // Check if it's a subtopic (contains a main topic as substring)
              const matchingTopic = mainTopics.find(topic => normalizedCat.includes(topic));
              if (matchingTopic) {
                topics.push(matchingTopic);
                subtopics.push(normalizedCat);
              } else {
                // If it doesn't match any main topic, treat as a standalone topic
                topics.push(normalizedCat);
              }
            }
          });
          
          // Also check keywords for additional topic matches
          if (data.keywords && Array.isArray(data.keywords)) {
            data.keywords.forEach(keyword => {
              const normalizedKeyword = keyword.toLowerCase();
              const matchingTopic = mainTopics.find(topic => normalizedKeyword.includes(topic));
              if (matchingTopic && !topics.includes(matchingTopic)) {
                topics.push(matchingTopic);
              }
            });
          }

          return {
            slug,
            title: data.title || filename.replace(/\.md$/, ''),
            date,
            image: data.image || data.images?.[0] || defaultImage,
            excerpt: excerpt || '',
            readingTime: data.readingTime || readingTime,
            category: data.category || 'Tech',
            categories: Array.from(new Set(categories)),
            topics: Array.from(new Set(topics)),
            subtopics: Array.from(new Set(subtopics)),
            isNew,
            status: isNew ? 'new' : 'published',
          };
        } catch (fileError) {
          // If there's an error with this specific file, log it but continue with other files
          console.error(`Error processing file ${filename}:`, fileError);
          return null;
        }
      })).then(posts => posts.filter(Boolean)); // Remove any null entries from files with errors

      // Sort posts by date (newest first)
      const sortedPosts = posts.sort((a, b) => {
        try {
          return new Date(b.date) - new Date(a.date);
        } catch (dateError) {
          console.error('Error comparing dates:', dateError, 'a.date:', a.date, 'b.date:', b.date);
          return 0; // Keep original order if dates can't be compared
        }
      });
      
      // Return with pagination data if requested
      if (paginate) {
        return {
          posts: sortedPosts,
          pagination: {
            page,
            limit,
            total: filenames.length,
            totalPages: Math.ceil(filenames.length / limit),
            hasMore: endIndex < filenames.length
          }
        };
      }
      
      return sortedPosts;
    } catch (error) {
      console.error('Error loading blog posts:', error);
      return paginate ? {
        posts: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
      } : [];
    }
  } else {
    // Return empty array or placeholder data in client-side renders
    console.warn('getAllPosts called on the client side - returning empty array');
    return paginate ? {
      posts: [],
      pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
    } : [];
  }
};

/**
 * Convert markdown content to HTML
 */
export async function markdownToHtml(markdown) {
  if (typeof window === 'undefined') {
    try {
      // Dynamically import server-only modules
      const { remark } = await import('remark');
      const remarkHtml = await import('remark-html');
      const remarkGfm = await import('remark-gfm');
      
      const result = await remark()
        .use(remarkHtml.default)
        .use(remarkGfm.default)
        .process(markdown);
        
      return result.toString();
    } catch (error) {
      console.error('Error converting markdown to HTML:', error);
      return markdown;
    }
  } else {
    // On client-side, just return the markdown as-is
    return markdown;
  }
}

/**
 * Get post data by slug
 */
export async function getPostBySlug(slug, includeContent = false) {
  if (typeof window === 'undefined') {
    try {
      console.log(`getPostBySlug called for slug: ${slug}`);
      
      // Dynamically import server-only modules
      const fs = await import('fs');
      const path = await import('path');
      const matter = await import('gray-matter');
      
      const postsDirectory = path.default.join(process.cwd(), 'content/articles');
      console.log(`Posts directory: ${postsDirectory}`);
      console.log(`Current working directory: ${process.cwd()}`);
      
      // Check if directory exists
      if (!fs.default.existsSync(postsDirectory)) {
        console.error(`Posts directory not found: ${postsDirectory}`);
        return null;
      }
      
      // Remove file extension if present
      const realSlug = slug.replace(/\.mdx?$/, '');
      
      // Try to find the file with .md or .mdx extension
      const mdPath = path.default.join(postsDirectory, `${realSlug}.md`);
      const mdxPath = path.default.join(postsDirectory, `${realSlug}.mdx`);
      
      console.log(`Looking for files: ${mdPath} or ${mdxPath}`);
      
      let filePath;
      // First try direct match
      if (fs.default.existsSync(mdPath)) {
        filePath = mdPath;
        console.log(`Found direct match at ${mdPath}`);
      } else if (fs.default.existsSync(mdxPath)) {
        filePath = mdxPath;
        console.log(`Found direct match at ${mdxPath}`);
      } else {
        // If direct match not found, check for timestamp-prefixed files
        console.log(`Direct file not found for slug: ${slug}, checking timestamp prefixed files`);
        
        try {
          const allFiles = fs.default.readdirSync(postsDirectory);
          console.log(`Found ${allFiles.length} files in posts directory`);
          console.log(`Looking for files containing slug: ${realSlug}`);
          
          // Log some files for debugging
          console.log('First few files:', allFiles.slice(0, 3));
          
          // Find files ending with the slug
          const matchingFile = allFiles.find(file => {
            // Check if file ends with the slug (with .md or .mdx extension)
            return file.endsWith(`${realSlug}.md`) || file.endsWith(`${realSlug}.mdx`);
          });
          
          if (matchingFile) {
            filePath = path.default.join(postsDirectory, matchingFile);
            console.log(`Found matching timestamp-prefixed file: ${matchingFile}`);
            console.log(`Full path: ${filePath}`);
          } else {
            // Try to find files containing the slug somewhere in the name
            console.log(`No exact match found, looking for files containing the slug`);
            const potentialMatches = allFiles.filter(file => 
              file.includes(realSlug) && (file.endsWith('.md') || file.endsWith('.mdx'))
            );
            
            if (potentialMatches.length > 0) {
              console.log(`Found ${potentialMatches.length} potential matches:`, potentialMatches);
              // Use the first match
              filePath = path.default.join(postsDirectory, potentialMatches[0]);
              console.log(`Using first match: ${potentialMatches[0]}`);
            } else {
              console.error(`No file found for slug: ${slug}`);
              return null;
            }
          }
        } catch (error) {
          console.error(`Error searching for files: ${error}`);
          return null;
        }
      }
      
      const fileContents = fs.default.readFileSync(filePath, 'utf8');
      const { data, content } = matter.default(fileContents);
      
      // Calculate reading time
      const wordsPerMinute = 200;
      const wordCount = content.split(/\s+/g).length;
      const readingTime = Math.ceil(wordCount / wordsPerMinute);
      
      // Format the date
      const date = typeof data.date === 'string' ? data.date : 
                  data.date instanceof Date ? data.date.toISOString() :
                  new Date().toISOString();
      
      // Calculate if the post is new
      const isNew = (new Date() - new Date(date)) < 7 * 24 * 60 * 60 * 1000;
      
      // Default image
      const defaultImage = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60';
      
      // Process categories from frontmatter
      let categories = [];
      
      // If categories are explicitly defined in frontmatter
      if (data.categories) {
        if (Array.isArray(data.categories)) {
          categories = data.categories.map(cat => 
            typeof cat === 'string' ? cat : cat.name || ''
          ).filter(Boolean);
        } else if (typeof data.categories === 'string') {
          categories = [data.categories];
        }
      }
      
      // Add the main category if it exists and isn't already included
      if (data.category && !categories.includes(data.category)) {
        categories.unshift(data.category);
      }
      
      // Extract topics and subtopics from categories or keywords
      const topics = [];
      const subtopics = [];
      
      // Define main topic categories for matching
      const mainTopics = ['tech', 'ai', 'science', 'climate', 'business', 'innovation', 'gaming', 'lifestyle'];
      
      // Process categories and place them in topics or subtopics
      categories.forEach(cat => {
        const normalizedCat = cat.toLowerCase();
        // Check if this category is a main topic
        if (mainTopics.includes(normalizedCat)) {
          topics.push(normalizedCat);
        } else {
          // Check if it's a subtopic (contains a main topic as substring)
          const matchingTopic = mainTopics.find(topic => normalizedCat.includes(topic));
          if (matchingTopic) {
            topics.push(matchingTopic);
            subtopics.push(normalizedCat);
          } else {
            // If it doesn't match any main topic, treat as a standalone topic
            topics.push(normalizedCat);
          }
        }
      });
      
      // Also check keywords for additional topic matches
      if (data.keywords && Array.isArray(data.keywords)) {
        data.keywords.forEach(keyword => {
          const normalizedKeyword = keyword.toLowerCase();
          const matchingTopic = mainTopics.find(topic => normalizedKeyword.includes(topic));
          if (matchingTopic && !topics.includes(matchingTopic)) {
            topics.push(matchingTopic);
          }
        });
      }
      
      const post = {
        slug: realSlug,
        title: data.title || 'Untitled Post',
        date,
        image: data.image || data.images?.[0] || defaultImage,
        excerpt: data.excerpt || content.slice(0, 150) + '...',
        readingTime: data.readingTime || readingTime,
        category: data.category || 'Tech',
        categories: Array.from(new Set(categories)),
        topics: Array.from(new Set(topics)),
        subtopics: Array.from(new Set(subtopics)),
        isNew,
        status: isNew ? 'new' : 'published',
        metadata: {
          featured: data.featured || false,
          trending: data.trending || false
        }
      };
      
      // Add content if requested
      if (includeContent) {
        post.content = content;
      }
      
      return post;
    } catch (error) {
      console.error(`Error getting post ${slug}:`, error);
      return null;
    }
  } else {
    // On client-side, return placeholder data or fetch from an API
    console.warn(`getPostBySlug called on the client side for slug: ${slug}`);
    return null;
  }
} 