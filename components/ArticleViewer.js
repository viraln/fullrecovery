import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import CopyToClipboard from 'react-copy-to-clipboard';

// Function to create slug from heading text
const createSlug = (text) => {
  if (typeof text !== 'string') {
    // Handle cases where text might be a React element
    text = text.toString();
  }
  return text
    .toLowerCase()
    .replace(/[^a-z0-9- ]/g, '') // Remove special characters except hyphens and spaces
    .trim()
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
};

// Function to extract headings from markdown content
export const extractTableOfContents = (content) => {
  const headings = [];
  const lines = content.split('\n');
  
  lines.forEach(line => {
    // Match both standard markdown headings and HTML headings
    const markdownMatch = line.match(/^(##|###)\s+(.+)$/);
    const htmlMatch = line.match(/<h([2-3])[^>]*>(.*?)<\/h\1>/);
    
    if (markdownMatch) {
      const level = markdownMatch[1].length - 1; // 2 for ##, 3 for ###
      const text = markdownMatch[2].trim();
      const slug = createSlug(text);
      headings.push({ text, slug, level });
    } else if (htmlMatch) {
      const level = parseInt(htmlMatch[1], 10);
      const text = htmlMatch[2].replace(/<[^>]+>/g, '').trim(); // Remove any HTML tags inside heading
      const slug = createSlug(text);
      headings.push({ text, slug, level });
    }
  });
  
  return headings;
};

const ArticleViewer = ({ content }) => {
  const [copySuccess, setCopySuccess] = useState({});
  const [imageLoaded, setImageLoaded] = useState({});
  const [currentSection, setCurrentSection] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    // Add scroll margin and smooth scrolling to all headings
    const style = document.createElement('style');
    style.textContent = `
      html {
        scroll-behavior: smooth;
      }
      h2, h3 {
        scroll-margin-top: 100px;
      }
      .prose h2, .prose h3 {
        position: relative;
      }
      .prose h2 .anchor-link, .prose h3 .anchor-link {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        margin-left: 0.5rem;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .prose h2:hover .anchor-link, .prose h3:hover .anchor-link {
        opacity: 1;
      }
      
      /* Enhanced Typography */
      .prose {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 1.125rem;
        line-height: 1.8;
        color: #374151;
      }
      
      /* Callout Styles */
      .callout-tip, .callout-info, .callout-warning, .callout-expert, .callout-quote {
        margin: 2rem 0;
        padding: 1.5rem;
        border-radius: 0.5rem;
        position: relative;
        border-left: 4px solid;
        background-color: #fafafa;
        box-shadow: 0 2px 4px rgba(0,0,0,0.04);
      }
      
      .callout-tip { border-color: #10B981; background-color: #ECFDF5; }
      .callout-info { border-color: #3B82F6; background-color: #EFF6FF; }
      .callout-warning { border-color: #F59E0B; background-color: #FFFBEB; }
      .callout-expert { border-color: #6366F1; background-color: #EEF2FF; }
      .callout-quote { border-color: #8B5CF6; background-color: #F5F3FF; }
      
      .callout-header {
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
        font-weight: 600;
      }
      
      .callout-icon {
        margin-right: 0.5rem;
        font-size: 1.25rem;
      }
      
      .callout-title {
        font-size: 1.125rem;
        color: #111827;
      }
      
      .callout-content {
        color: #4B5563;
      }
      
      /* Table Styles */
      .table-container {
        overflow-x: auto;
        margin: 2rem 0;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      }
      
      .table-container table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .table-container th {
        background-color: #F3F4F6;
        font-weight: 600;
        text-align: left;
        padding: 0.75rem 1rem;
      }
      
      .table-container td {
        padding: 0.75rem 1rem;
        border-top: 1px solid #E5E7EB;
      }
      
      .table-container tr:nth-child(even) {
        background-color: #F9FAFB;
      }
      
      /* Table of Contents */
      .table-of-contents {
        background-color: #F9FAFB;
        padding: 1.5rem;
        border-radius: 0.5rem;
        margin-bottom: 2rem;
        border: 1px solid #E5E7EB;
      }
      
      /* Key Takeaways */
      .key-takeaways {
        background-color: #EFF6FF;
        border-left: 4px solid #3B82F6;
        padding: 1.5rem;
        border-radius: 0.5rem;
        margin: 2rem 0;
      }
      
      .key-takeaways h2 {
        margin-top: 0;
        color: #1E40AF;
        font-size: 1.5rem;
      }
      
      .key-takeaways ul {
        margin-bottom: 0;
      }
      
      .key-takeaways li {
        margin-bottom: 0.5rem;
      }
      
      /* Fancy Quote */
      .fancy-quote {
        background-color: #F5F3FF;
        padding: 2rem;
        border-radius: 0.5rem;
        margin: 2rem 0;
        position: relative;
        font-style: italic;
        box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      }
      
      .fancy-quote:before {
        content: '"';
        position: absolute;
        top: -1rem;
        left: 1rem;
        font-size: 4rem;
        color: #8B5CF6;
        opacity: 0.2;
        font-family: Georgia, serif;
      }
      
      .fancy-quote p {
        font-size: 1.25rem;
        color: #4B5563;
        position: relative;
        z-index: 1;
      }
      
      .fancy-quote cite {
        display: block;
        font-weight: 600;
        margin-top: 1rem;
        text-align: right;
        font-style: normal;
        color: #6D28D9;
      }
      
      /* FAQ Styles */
      .faq-container {
        margin: 2rem 0;
      }
      
      .faq-item {
        border: 1px solid #E5E7EB;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        overflow: hidden;
      }
      
      .faq-question {
        padding: 1.25rem;
        font-weight: 600;
        cursor: pointer;
        background-color: #F9FAFB;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .faq-question:after {
        content: '+';
        font-size: 1.25rem;
        color: #6D28D9;
      }
      
      .faq-item[open] .faq-question:after {
        content: '−';
      }
      
      .faq-answer {
        padding: 0 1.25rem 1.25rem 1.25rem;
      }
      
      /* Figure and Figcaption */
      figure {
        margin: 2rem 0;
      }
      
      figcaption {
        text-align: center;
        font-size: 0.875rem;
        color: #6B7280;
        margin-top: 0.75rem;
        font-style: italic;
      }
      
      /* Content Split Layout */
      .content-split {
        display: flex;
        flex-wrap: wrap;
        gap: 2rem;
        margin: 2rem 0;
      }
      
      .split-left, .split-right {
        flex: 1 1 300px;
      }
      
      /* Resource Cards */
      .resource-cards {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        margin: 2rem 0;
      }
      
      .resource-card {
        flex: 1 1 300px;
        border: 1px solid #E5E7EB;
        border-radius: 0.5rem;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .resource-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 6px rgba(0,0,0,0.08);
      }
      
      .resource-card-content {
        padding: 1.5rem;
      }
      
      .resource-card-content h3 {
        margin-top: 0;
        font-size: 1.25rem;
      }
      
      .resource-card-action {
        padding: 1rem 1.5rem;
        background-color: #F9FAFB;
        border-top: 1px solid #E5E7EB;
      }
      
      .resource-card-action a {
        display: inline-block;
        color: #4F46E5;
        font-weight: 500;
      }
      
      /* Code block with copy button */
      .code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: #1E1E1E;
        color: #E5E7EB;
        padding: 0.5rem 1rem;
        border-top-left-radius: 0.5rem;
        border-top-right-radius: 0.5rem;
        font-family: monospace;
        font-size: 0.875rem;
      }
      
      .copy-button {
        background: transparent;
        border: none;
        color: #E5E7EB;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      
      .copy-button:hover {
        background-color: rgba(255,255,255,0.1);
      }
      
      /* Reading Progress */
      .reading-progress-container {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 50;
        background-color: white;
        border-radius: 2rem;
        padding: 0.5rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        opacity: 0;
        transform: translateY(1rem);
        transition: opacity 0.3s, transform 0.3s;
      }
      
      .reading-progress-container.visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      @media (max-width: 768px) {
        .content-split {
          flex-direction: column;
        }
        
        .resource-cards {
          flex-direction: column;
        }
      }
    `;
    document.head.appendChild(style);

    // Add IDs to headings for TOC
    setTimeout(() => {
      const articleHeadings = document.querySelectorAll('.prose h2, .prose h3');
      articleHeadings.forEach(heading => {
        if (!heading.id) {
          const headingText = heading.textContent;
          heading.id = createSlug(headingText);
        }
      });
    }, 100);

    // Handle hash change to scroll to the correct position
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          const headerOffset = 100;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    };

    // Handle initial hash if present
    if (window.location.hash) {
      setTimeout(handleHashChange, 100);
    }

    // Track current visible section for active TOC highlighting
    const observeHeadings = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setCurrentSection(entry.target.id);
            }
          });
        },
        { rootMargin: '-100px 0px -70% 0px' }
      );

      const headings = document.querySelectorAll('h2[id], h3[id]');
      headings.forEach((heading) => {
        observer.observe(heading);
      });

      return () => {
        headings.forEach((heading) => {
          observer.unobserve(heading);
        });
      };
    };

    // Show reading progress when scrolled down
    const showReadingProgress = () => {
      const progressContainer = document.querySelector('.reading-progress-container');
      if (progressContainer) {
        const handleScroll = () => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          if (scrollTop > 400) {
            progressContainer.classList.add('visible');
          } else {
            progressContainer.classList.remove('visible');
          }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
      }
      // Return a no-op function if the progress container isn't found
      return () => {};
    };

    // Update reading progress bar
    const updateReadingProgress = () => {
      const progressBar = document.getElementById('reading-progress');
      const article = document.querySelector('article');
      
      if (progressBar && article) {
        const handleScroll = () => {
          const scrollTop = window.scrollY;
          const scrollHeight = article.scrollHeight;
          const clientHeight = document.documentElement.clientHeight;
          
          const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100;
          progressBar.innerHTML = `${Math.round(scrollPercent)}% read`;
        };
        
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
      }
      // Return a no-op function if the progress bar or article isn't found
      return () => {};
    };

    // Initialize all features
    const cleanupObserver = observeHeadings();
    const cleanupProgress = showReadingProgress();
    const cleanupProgressBar = updateReadingProgress();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      style.remove();
      window.removeEventListener('hashchange', handleHashChange);
      cleanupObserver();
      cleanupProgress();
      cleanupProgressBar();
    };
  }, [content]);

  const handleCopyCode = (codeString, id) => {
    setCopySuccess({ ...copySuccess, [id]: true });
    setTimeout(() => {
      setCopySuccess({ ...copySuccess, [id]: false });
    }, 2000);
  };

  const handleImageLoad = (id) => {
    setImageLoaded({ ...imageLoaded, [id]: true });
  };

  const components = {
    h2: ({ node, children, ...props }) => {
      const id = createSlug(children);
      return (
        <h2 id={id} {...props}>
          {children}
          <a href={`#${id}`} className="anchor-link" aria-hidden="true">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
            </svg>
          </a>
        </h2>
      );
    },
    h3: ({ node, children, ...props }) => {
      const id = createSlug(children);
      return (
        <h3 id={id} {...props}>
          {children}
          <a href={`#${id}`} className="anchor-link" aria-hidden="true">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
            </svg>
          </a>
        </h3>
      );
    },
    p: (props) => {
      // Check if children contains an image tag to avoid nesting issues
      const hasImageChild = React.Children.toArray(props.children).some(child => {
        return React.isValidElement(child) && (child.type === 'img' || (typeof child.type === 'function' && child.type.name === 'img'));
      });
      
      if (hasImageChild) {
        // Just render the children without wrapping in a paragraph to avoid DOM nesting violations
        return <>{props.children}</>;
      }
      
      // Normal paragraph rendering
      return <p className="mb-6 text-gray-700 leading-relaxed">{props.children}</p>;
    },
    ul: (props) => <ul className="list-disc list-inside mb-6 space-y-2 pl-4" {...props} />,
    ol: (props) => <ol className="list-decimal list-inside mb-6 space-y-2 pl-4" {...props} />,
    li: (props) => <li className="text-gray-700 pl-2" {...props} />,
    a: (props) => (
      <a
        {...props}
        className="text-indigo-600 font-medium hover:text-indigo-800 underline decoration-2 decoration-indigo-200 underline-offset-2 hover:decoration-indigo-400 transition-all duration-200"
        target={props.href?.startsWith('http') ? '_blank' : undefined}
        rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      />
    ),
    blockquote: (props) => {
      // Check if it's our fancy quote format
      if (props.className === 'fancy-quote') {
        return <div {...props} />;
      }
      
      return (
        <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-6 text-gray-700 italic bg-gray-50 rounded-r-lg">
          {props.children}
        </blockquote>
      );
    },
    img: (props) => {
      // Create a simplified image component without all the loading state complexity
      // This will help avoid hydration issues and ensure images display properly
      const imgUrl = props.src;
      
      // Only use placeholder for missing images
      if (!imgUrl || imgUrl.includes('placeholder')) {
        return (
          <span className="block my-8 bg-gray-100 rounded-lg flex items-center justify-center h-64">
            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
        );
      }
      
      // Return a simple image with appropriate styling - using span instead of div to prevent nesting issues
      return (
        <span className="block my-8 overflow-hidden rounded-lg shadow-md">
          <img
            {...props}
            className="w-full h-auto object-cover rounded-lg"
            alt={props.alt || "Article image"}
            loading="lazy"
          />
        </span>
      );
    },
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
      
      if (inline) {
        return <code className="bg-gray-100 px-1.5 py-0.5 rounded-md text-sm font-mono text-indigo-700" {...props}>{children}</code>;
      }
      
      return (
        <div>
          <div className="code-header">
            <span>{match ? match[1] : 'code'}</span>
            <CopyToClipboard text={String(children).replace(/\n$/, '')} onCopy={() => handleCopyCode(String(children), codeId)}>
              <button className="copy-button">
                {copySuccess[codeId] ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </CopyToClipboard>
          </div>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match ? match[1] : 'text'}
            PreTag="div"
            className="rounded-b-lg !mt-0"
            showLineNumbers
            wrapLines
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    },
    table: (props) => {
      // Always wrap tables in a responsive container
      return (
        <div className="overflow-x-auto my-8 border rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 table-auto" {...props} />
        </div>
      );
    },
    thead: (props) => <thead className="bg-gray-50" {...props} />,
    th: (props) => <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider border border-gray-200" {...props} />,
    td: (props) => <td className="px-6 py-4 text-sm text-gray-700 border border-gray-200" {...props} />,
    tr: (props) => <tr className="hover:bg-gray-50 even:bg-gray-50" {...props} />,
    // Handle custom components
    div: (props) => {
      if (props.className?.includes('callout-')) {
        return <div {...props} />;
      }
      if (props.className === 'table-container') {
        return (
          <div {...props} className="table-container">
            {props.children}
          </div>
        );
      }
      if (props.className === 'table-of-contents') {
        return (
          <div {...props} className="bg-gray-50 p-6 rounded-xl my-8 border border-gray-100 shadow-sm">
            {props.children}
          </div>
        );
      }
      if (props.className === 'key-takeaways') {
        return (
          <div {...props} className="bg-indigo-50 p-6 rounded-xl my-8 border-l-4 border-indigo-500 shadow-sm">
            {props.children}
          </div>
        );
      }
      if (props.className === 'faq-container') {
        return <div {...props} className="space-y-4 my-8" />;
      }
      if (props.className === 'content-split') {
        return <div {...props} className="grid md:grid-cols-2 gap-8 my-8" />;
      }
      if (props.className === 'resource-cards') {
        return <div {...props} className="grid md:grid-cols-2 gap-6 my-8" />;
      }
      if (props.className === 'reading-progress-container') {
        return (
          <div {...props} className="fixed bottom-6 right-6 bg-white rounded-full py-1 px-4 shadow-lg z-50 hidden md:block transition-opacity duration-300">
            {props.children}
          </div>
        );
      }
      return <div {...props} />;
    },
    details: (props) => {
      if (props.className === 'faq-item') {
        return (
          <details {...props} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-4">
            {props.children}
          </details>
        );
      }
      return <details {...props} />;
    },
    summary: (props) => {
      if (props.className === 'faq-question') {
        return (
          <summary {...props} className="flex justify-between items-center p-4 cursor-pointer font-medium text-gray-900 hover:bg-gray-50">
            {props.children}
          </summary>
        );
      }
      return <summary {...props} />;
    },
    figure: (props) => (
      <figure {...props} className="my-8" />
    ),
    figcaption: (props) => (
      <figcaption {...props} className="text-center text-sm text-gray-500 mt-2 italic" />
    )
  };

  // Try rendering the content, catch errors
  const renderContent = () => {
    try {
      // If we previously had an error but the component is re-rendered,
      // give it another chance to render correctly
      if (hasError) {
        setHasError(false);
        setErrorDetails(null);
      }
      
      // Proceed with normal rendering
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      );
    } catch (error) {
      console.error('Error rendering article content:', error);
      
      // Update error state
      setHasError(true);
      setErrorDetails(error.toString());
      
      // Return a fallback UI
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Article Rendering Error</h3>
          <p className="text-gray-700 mb-4">
            We encountered an issue while rendering this article content. The error has been logged.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-3 bg-white rounded border border-red-100">
              <p className="text-sm font-mono text-red-500">{error.toString()}</p>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="article-content">
      {renderContent()}
    </div>
  );
};

export default ArticleViewer; 