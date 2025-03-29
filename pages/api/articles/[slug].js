import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export default async function handler(req, res) {
  const { slug } = req.query;
  
  try {
    // Find the corresponding file in the content/articles directory
    const files = fs.readdirSync(path.join(process.cwd(), 'content/articles'));
    
    // Look for a file that matches the slug
    let matchedFile = null;
    for (const filename of files) {
      try {
        // Skip directories
        const filePath = path.join(process.cwd(), 'content/articles', filename);
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) continue;
        
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContents);
        
        if (data.slug === slug || filename.replace(/\.md$/, '') === slug) {
          matchedFile = {
            filename,
            filePath,
            frontMatter: data
          };
          break;
        }
      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
      }
    }
    
    if (!matchedFile) {
      return res.status(404).json({ 
        error: 'Article not found',
        slug 
      });
    }
    
    // Read the file content
    const fileContents = fs.readFileSync(matchedFile.filePath, 'utf8');
    const { content, data: frontMatter } = matter(fileContents);
    
    // Return article data without the full content (to reduce payload size)
    return res.status(200).json({
      frontMatter,
      excerpt: frontMatter.excerpt || '',
      slug: frontMatter.slug || matchedFile.filename.replace(/\.md$/, ''),
      wordCount: content.split(/\s+/).length
    });
  } catch (error) {
    console.error('Error in article API:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch article',
      message: error.message
    });
  }
} 