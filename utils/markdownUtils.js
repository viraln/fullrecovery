import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrism from 'rehype-prism-plus';

/**
 * Converts markdown to HTML with enhancements like syntax highlighting and auto-linked headings
 * @param {string} markdown - The markdown content to convert
 * @returns {Promise<string>} - The HTML content
 */
export async function markdownToHtml(markdown) {
  try {
    if (!markdown || typeof markdown !== 'string') {
      console.warn('Invalid markdown provided to markdownToHtml:', typeof markdown);
      return '';
    }

    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
      .use(rehypePrism, { ignoreMissing: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    return result.toString();
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Fall back to plain text
    return `<div class="markdown-content">
      <p>Error rendering content. Please try again later.</p>
      <pre>${markdown.substring(0, 500)}...</pre>
    </div>`;
  }
}

/**
 * Extracts heading structure from markdown content to create a table of contents
 * @param {string} markdown - The markdown content
 * @returns {Array} Array of heading objects with text and level
 */
export function extractTableOfContents(markdown) {
  try {
    if (!markdown || typeof markdown !== 'string') {
      console.error('extractTableOfContents: Invalid content provided', typeof markdown);
      return [];
    }

    // Regex to find all headings (## Heading)
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings = [];
    let match;

    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      
      // Only include headings level 2-4 (## to ####)
      if (level >= 2 && level <= 4) {
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-'); // Replace spaces with hyphens
        
        headings.push({
          text,
          level,
          id
        });
      }
    }

    return headings;
  } catch (error) {
    console.error('Error extracting table of contents:', error);
    return [];
  }
} 