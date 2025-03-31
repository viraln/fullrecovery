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
      
      /* Enhanced Typography for Modern Feel */
      .prose {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 1.125rem;
        line-height: 1.8;
        color: #1F2937;
      }
      
      .prose h2 {
        font-size: 2rem;
        margin-top: 2.5rem;
        margin-bottom: 1.5rem;
        font-weight: 800;
        background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        display: inline-block;
      }
      
      .prose h3 {
        font-size: 1.5rem;
        margin-top: 2rem;
        margin-bottom: 1.25rem;
        font-weight: 700;
        color: #4F46E5;
      }
      
      /* Modern Callout Styles with Gradients */
      .callout-tip, .callout-info, .callout-warning, .callout-expert, .callout-quote {
        margin: 2.5rem 0;
        padding: 1.5rem;
        border-radius: 1rem;
        position: relative;
        border-left: none;
        background-color: #fff;
        box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      
      .callout-tip:hover, .callout-info:hover, .callout-warning:hover, .callout-expert:hover, .callout-quote:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 30px rgba(0,0,0,0.08);
      }
      
      .callout-tip { 
        background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
        border-top: 5px solid #10B981;
      }
      .callout-info { 
        background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
        border-top: 5px solid #3B82F6;
      }
      .callout-warning { 
        background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
        border-top: 5px solid #F59E0B;
      }
      .callout-expert { 
        background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
        border-top: 5px solid #6366F1;
      }
      .callout-quote { 
        background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
        border-top: 5px solid #8B5CF6;
      }
      
      .callout-header {
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
        font-weight: 700;
      }
      
      .callout-icon {
        margin-right: 0.75rem;
        font-size: 1.5rem;
      }
      
      .callout-title {
        font-size: 1.25rem;
        color: #111827;
        letter-spacing: -0.025em;
      }
      
      .callout-content {
        color: #4B5563;
      }
      
      /* Fun Emoji List Styles */
      .emoji-list {
        list-style-type: none;
        padding-left: 1rem;
      }
      
      .emoji-list li {
        position: relative;
        padding-left: 2rem;
        margin-bottom: 1rem;
      }
      
      .emoji-list li::before {
        position: absolute;
        left: 0;
        top: 0;
        font-size: 1.25rem;
      }
      
      .emoji-list.key li::before { content: "🔑"; }
      .emoji-list.sparkles li::before { content: "✨"; }
      .emoji-list.check li::before { content: "✅"; }
      .emoji-list.alert li::before { content: "⚠️"; }
      .emoji-list.idea li::before { content: "💡"; }
      .emoji-list.star li::before { content: "⭐"; }
      
      /* Modern Table Styles */
      .table-container {
        overflow-x: auto;
        margin: 2.5rem 0;
        border-radius: 1rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        border: none;
      }
      
      .table-container table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        overflow: hidden;
      }
      
      .table-container th {
        background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%);
        color: white;
        font-weight: 600;
        text-align: left;
        padding: 1rem 1.5rem;
        border: none;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        font-size: 0.875rem;
      }
      
      .table-container th:first-child {
        border-top-left-radius: 0.5rem;
      }
      
      .table-container th:last-child {
        border-top-right-radius: 0.5rem;
      }
      
      .table-container td {
        padding: 1rem 1.5rem;
        border: none;
        border-bottom: 1px solid #E5E7EB;
        color: #374151;
      }
      
      .table-container tr:last-child td {
        border-bottom: none;
      }
      
      .table-container tr:nth-child(even) {
        background-color: #F9FAFB;
      }
      
      .table-container tr:hover {
        background-color: #F3F4F6;
      }
      
      /* Vibrant Reading Progress Bar */
      .reading-progress-container {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 50;
        background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%);
        color: white;
        border-radius: 2rem;
        padding: 0.5rem 1.25rem;
        box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
        opacity: 0;
        transform: translateY(1rem);
        transition: opacity 0.3s, transform 0.3s;
        font-weight: 600;
        letter-spacing: 0.05em;
      }
      
      .reading-progress-container.visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      /* Fun Image Effects */
      .prose img {
        border-radius: 1rem;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      }
      
      .prose img:hover {
        transform: scale(1.02);
        box-shadow: 0 15px 30px rgba(0,0,0,0.15);
      }
      
      /* Fix image hover effect - remove transform that causes jumps */
      .prose img {
        border-radius: 1rem;
        transition: box-shadow 0.3s ease, filter 0.3s ease;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      }
      
      .prose img:hover {
        transform: none;
        box-shadow: 0 15px 30px rgba(0,0,0,0.15);
        filter: brightness(1.05);
      }
      
      /* Fix bullet point hover */
      .prose ul li:hover {
        transform: none;
      }
      
      .prose ol li:hover {
        transform: none;
      }
      
      /* Fix blockquote hover */
      blockquote:hover {
        transform: none !important;
      }
      
      /* Fix any remaining transform hover effects */
      .prose p:hover,
      .emoji-list-item:hover,
      .callout-tip:hover, 
      .callout-info:hover, 
      .callout-warning:hover, 
      .callout-expert:hover, 
      .callout-quote:hover,
      .social-button:hover,
      .toc-item:hover,
      .interactive-element:hover,
      .modern-button:hover,
      .scroll-to-top:hover {
        transform: none !important;
      }
      
      /* Add subtle hover effects that don't cause layout shifts */
      .emoji-list-item:hover {
        color: #1e293b;
      }
      
      .modern-button:hover,
      .social-button:hover,
      .interactive-element:hover {
        box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15);
        filter: brightness(1.05);
      }
      
      /* Fun Fact Box hover - no transform */
      .fun-fact:hover,
      .amazing-stat:hover,
      .mind-blown:hover {
        transform: none;
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.08);
      }
      
      /* Modern Blockquote Design */
      blockquote {
        background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
        border-radius: 1rem;
        padding: 1.5rem 2rem;
        margin: 2.5rem 0;
        position: relative;
        box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        border-left: none !important;
        border-top: 5px solid #8B5CF6;
      }
      
      blockquote::before {
        content: """;
        position: absolute;
        top: -1.5rem;
        left: 1.5rem;
        font-size: 5rem;
        color: #8B5CF6;
        opacity: 0.2;
        font-family: Georgia, serif;
        line-height: 1;
      }
      
      blockquote p {
        font-size: 1.125rem;
        color: #4B5563;
        position: relative;
        z-index: 1;
        font-style: italic;
      }
      
      /* Interactive Elements */
      .interactive-element {
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .interactive-element:hover {
        transform: translateY(-3px);
      }
      
      /* Tooltip Styling */
      .tooltip {
        position: relative;
        display: inline-block;
        cursor: help;
        border-bottom: 1px dotted #6366F1;
      }
      
      .tooltip .tooltip-text {
        visibility: hidden;
        width: 200px;
        background-color: #1F2937;
        color: #fff;
        text-align: center;
        border-radius: 0.5rem;
        padding: 0.75rem;
        position: absolute;
        z-index: 1;
        bottom: 125%;
        left: 50%;
        margin-left: -100px;
        opacity: 0;
        transition: opacity 0.3s;
        font-size: 0.875rem;
        pointer-events: none;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      }
      
      .tooltip .tooltip-text::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #1F2937 transparent transparent transparent;
      }
      
      .tooltip:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
      }
      
      @media (max-width: 768px) {
        .content-split {
          flex-direction: column;
        }
        
        .resource-cards {
          flex-direction: column;
        }
        
        .prose h2 {
          font-size: 1.75rem;
        }
        
        .prose h3 {
          font-size: 1.3rem;
        }
        
        .callout-tip, .callout-info, .callout-warning, .callout-expert, .callout-quote {
          padding: 1.25rem;
        }
      }
      
      /* Reading Progress Animation */
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }
      
      @keyframes celebrate {
        0% { background: linear-gradient(90deg, #3730A3 0%, #6366F1 100%); }
        20% { background: linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%); }
        40% { background: linear-gradient(90deg, #EC4899 0%, #F43F5E 100%); }
        60% { background: linear-gradient(90deg, #EF4444 0%, #F59E0B 100%); }
        80% { background: linear-gradient(90deg, #10B981 0%, #3B82F6 100%); }
        100% { background: linear-gradient(90deg, #6366F1 0%, #4F46E5 100%); }
      }
      
      /* Even gentler shake animation */
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-0.3px); }
        75% { transform: translateX(0.3px); }
      }
      
      /* Smoother pulse animation */
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }
      
      /* Smoother bounce animation */
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-1px); }
      }
      
      /* Minimize wave animation */
      @keyframes wave {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-0.5px); }
      }
      
      /* Ensure all hover effects don't use transforms */
      .prose img:hover,
      .prose h2:hover, 
      .prose h3:hover,
      .prose p:hover,
      .prose ul li:hover,
      .prose ol li:hover,
      .callout-tip:hover, 
      .callout-info:hover, 
      .callout-warning:hover, 
      .callout-expert:hover, 
      .callout-quote:hover,
      .fun-fact:hover,
      .amazing-stat:hover,
      .mind-blown:hover,
      .highlight-box:hover,
      .footnote:hover,
      blockquote:hover,
      .emoji-list-item:hover {
        transform: none !important;
        transition: box-shadow 0.3s ease, color 0.3s ease, filter 0.3s ease;
      }
      
      /* Replace emoji animations with non-transform based effects */
      .emoji-list-item.fire .emoji-bullet { 
        animation: none; 
        filter: brightness(1.1);
      }
      .emoji-list-item.idea .emoji-bullet { 
        text-shadow: 0 0 5px rgba(255, 255, 0, 0.5); 
        animation: none;
      }
      .emoji-list-item.warning .emoji-bullet { 
        animation: none;
        color: #F59E0B;
      }
      .emoji-list-item.star .emoji-bullet { 
        animation: none;
        filter: brightness(1.2);
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

    // Add scroll-to-top button
    const createScrollToTopButton = () => {
      // Create the button element
      const scrollButton = document.createElement('div');
      scrollButton.className = 'scroll-to-top';
      scrollButton.innerHTML = '↑';
      scrollButton.setAttribute('title', 'Scroll to top');
      document.body.appendChild(scrollButton);
      
      // Show button when scrolled down
      const handleButtonVisibility = () => {
        if (window.scrollY > 300) {
          scrollButton.classList.add('visible');
        } else {
          scrollButton.classList.remove('visible');
        }
      };
      
      // Scroll to top when clicked
      scrollButton.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
      
      window.addEventListener('scroll', handleButtonVisibility);
      
      // Initial check
      handleButtonVisibility();
      
      return () => {
        window.removeEventListener('scroll', handleButtonVisibility);
        if (scrollButton.parentNode) {
          scrollButton.parentNode.removeChild(scrollButton);
        }
      };
    };
    
    // Process text for highlights
    const processTextHighlights = () => {
      const articleParagraphs = document.querySelectorAll('.prose p');
      
      articleParagraphs.forEach(paragraph => {
        // Look for text patterns that should be highlighted
        // Example: ==text to highlight==
        const content = paragraph.innerHTML;
        const highlightedContent = content.replace(/==([^=]+)==/g, '<span class="highlight">$1</span>');
        
        if (content !== highlightedContent) {
          paragraph.innerHTML = highlightedContent;
        }
        
        // Look for potential footnote references like [1], [2], etc.
        const footnoteContent = paragraph.innerHTML.replace(/\[(\d+)\]/g, '<span class="footnote" title="See footnote $1">[$1]</span>');
        
        if (paragraph.innerHTML !== footnoteContent) {
          paragraph.innerHTML = footnoteContent;
        }
      });
    };

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
          const roundedPercent = Math.min(100, Math.max(0, Math.round(scrollPercent)));
          
          // Add emoji indicators based on progress
          let emoji = "🚀";
          if (roundedPercent > 75) {
            emoji = "🏁";
          } else if (roundedPercent > 50) {
            emoji = "⭐";
          } else if (roundedPercent > 25) {
            emoji = "💪";
          }
          
          progressBar.innerHTML = `${emoji} ${roundedPercent}% read`;
          
          // Add visual effects for key milestones
          if (roundedPercent === 25 || roundedPercent === 50 || 
              roundedPercent === 75 || roundedPercent === 100) {
            // Add a brief animation to the progress bar
            progressBar.classList.add('progress-milestone');
            setTimeout(() => {
              progressBar.classList.remove('progress-milestone');
            }, 1000);
            
            // Only show milestone message for 100%
            if (roundedPercent === 100 && !progressBar.hasAttribute('data-completed')) {
              progressBar.setAttribute('data-completed', 'true');
              progressBar.innerHTML = `🎉 You did it! 100%`;
              
              // Add confetti effect (would need a confetti library for full implementation)
              const progressContainer = document.querySelector('.reading-progress-container');
              if (progressContainer) {
                progressContainer.classList.add('celebration');
                setTimeout(() => {
                  progressContainer.classList.remove('celebration');
                  progressBar.innerHTML = `${emoji} ${roundedPercent}% read`;
                }, 3000);
              }
            }
          }
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
    const cleanupScrollButton = createScrollToTopButton();
    
    // Process text highlights after a short delay to ensure content is loaded
    setTimeout(() => {
      processTextHighlights();
      processSpecialTextPatterns();
    }, 500);

    // Process special text patterns for enhanced interactivity
    const processSpecialTextPatterns = () => {
      const articleParagraphs = document.querySelectorAll('.prose p');
      
      articleParagraphs.forEach(paragraph => {
        let content = paragraph.innerHTML;
        
        // Process fun facts: !FUN FACT: text!
        content = content.replace(
          /!FUN FACT: ([^!]+)!/g, 
          '<div class="fun-fact"><span class="fun-fact-label">✨ FUN FACT</span><span class="fun-fact-content">$1</span></div>'
        );
        
        // Process amazing stats: !STAT: text!
        content = content.replace(
          /!STAT: ([^!]+)!/g, 
          '<div class="amazing-stat"><span class="stat-label">📊 AMAZING STAT</span><span class="stat-content">$1</span></div>'
        );
        
        // Process "mind-blown" reactions: !MIND BLOWN: text!
        content = content.replace(
          /!MIND BLOWN: ([^!]+)!/g, 
          '<div class="mind-blown"><span class="mind-blown-label">🤯 MIND BLOWN</span><span class="mind-blown-content">$1</span></div>'
        );
        
        // Process text waves (for emphasis): ~text~
        content = content.replace(
          /~([^~]+)~/g,
          '<span class="text-wave">$1</span>'
        );
        
        if (content !== paragraph.innerHTML) {
          paragraph.innerHTML = content;
        }
      });
      
      // Add CSS for the new elements
      const style = document.createElement('style');
      style.textContent = `
        /* Fun Fact Box */
        .fun-fact {
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
          border-radius: 1rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          border-left: 4px solid #6366F1;
        }
        
        .fun-fact:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
        }
        
        /* Replace with non-transforming hover effect */
        .fun-fact:hover {
          transform: none;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
        }
        
        .fun-fact::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0) 70%);
          opacity: 0;
          transition: opacity 1s ease;
          z-index: 0;
        }
        
        .fun-fact:hover::before {
          opacity: 1;
          animation: pulse-bg 3s infinite;
        }
        
        .fun-fact-label {
          display: block;
          font-weight: 700;
          color: #6366F1;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        
        .fun-fact-content {
          position: relative;
          z-index: 1;
          display: block;
          font-size: 1.1rem;
        }
        
        /* Amazing Stat Box */
        .amazing-stat {
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
          border-radius: 1rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          border-left: 4px solid #10B981;
        }
        
        .amazing-stat:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%);
        }
        
        /* Replace with non-transforming hover effect */
        .amazing-stat:hover {
          transform: none;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%);
        }
        
        .stat-label {
          display: block;
          font-weight: 700;
          color: #10B981;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        
        .stat-content {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
        }
        
        /* Mind Blown Box */
        .mind-blown {
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(251, 113, 133, 0.1) 100%);
          border-radius: 1rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          border-left: 4px solid #F43F5E;
        }
        
        .mind-blown:hover {
          transform: translateY(-5px) rotate(1deg);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
          background: linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(251, 113, 133, 0.15) 100%);
        }
        
        /* Replace with non-transforming hover effect */
        .mind-blown:hover {
          transform: none;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
          background: linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(251, 113, 133, 0.15) 100%);
        }
        
        .mind-blown-label {
          display: block;
          font-weight: 700;
          color: #F43F5E;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        
        .mind-blown-content {
          display: block;
          font-size: 1.1rem;
        }
        
        /* Text Wave Animation */
        @keyframes wave {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-4px); }
          75% { transform: translateY(4px); }
        }
        
        .text-wave {
          display: inline-block;
          color: #6366F1;
          font-weight: 600;
          animation: wave 2s ease-in-out infinite;
          animation-delay: calc(0.1s * var(--i, 0));
        }
        
        /* Make each character of text wave animate separately */
        .text-wave span {
          display: inline-block;
        }
        
        @keyframes pulse-bg {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);
      
      // Apply character-by-character animation to text waves
      document.querySelectorAll('.text-wave').forEach(el => {
        const text = el.textContent;
        let html = '';
        
        for (let i = 0; i < text.length; i++) {
          html += `<span style="--i: ${i};">${text[i]}</span>`;
        }
        
        el.innerHTML = html;
      });
    };
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      style.remove();
      window.removeEventListener('hashchange', handleHashChange);
      cleanupObserver();
      cleanupProgress();
      cleanupProgressBar();
      cleanupScrollButton();
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
        <h2 id={id} {...props} className="group">
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
        <h3 id={id} {...props} className="group">
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
    p: ({ node, ...props }) => { 
      // Check if children contains an image tag to avoid nesting issues
      const hasImageChild = React.Children.toArray(props.children).some(child => {
        return React.isValidElement(child) && (child.type === 'img' || (typeof child.type === 'function' && child.type.name === 'img'));
      });
      
      if (hasImageChild) {
        // Just render the children without wrapping in a paragraph to avoid DOM nesting violations
        return <>{props.children}</>;
      }
      
      // Get content as string
      let content = '';
      if (typeof props.children === 'string') {
        content = props.children;
      } else {
        // Check if this paragraph is a caption (contains only an em/italic element or text followed by em/italic)
        const children = React.Children.toArray(props.children);
        
        // Case 1: Paragraph with single em element
        if (children.length === 1 && React.isValidElement(children[0]) && children[0].type === 'em') {
          const emText = children[0].props.children?.toString() || '';
          
          // Check if it's an attribution caption
          if (emText.includes('Photo by') || emText.includes('Source:') || emText.match(/on \[.*?\]/)) {
            // It might have description text before attribution
            const attributionIndex = Math.max(
              emText.indexOf('Photo by') !== -1 ? emText.indexOf('Photo by') : Infinity,
              emText.indexOf('Source:') !== -1 ? emText.indexOf('Source:') : Infinity
            );
            
            // Check for "on [Platform]" pattern
            const onMatch = emText.match(/ on (Unsplash|Pexels|Pixabay|Flickr|Getty|Shutterstock)/i);
            let onIndex = onMatch ? emText.indexOf(onMatch[0]) : Infinity;
            
            // If there's an "on [Platform]" but no "Photo by", find the best starting point
            // Look for a name preceding it (capital letter words)
            if (onMatch && attributionIndex === Infinity) {
              // Find all names with capital letters that might be the photographer
              const beforeOnText = emText.substring(0, onIndex);
              const potentialNames = beforeOnText.match(/[A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+/g);
              
              if (potentialNames && potentialNames.length > 0) {
                // Take the last name match as it's most likely the photographer
                const lastName = potentialNames[potentialNames.length - 1];
                const nameIndex = beforeOnText.lastIndexOf(lastName);
                
                if (nameIndex !== -1) {
                  // Found a potential name, show "Photo by [Name] on [Platform]"
                  return (
                    <p className="text-center text-xs text-gray-500 mt-2 italic">
                      <em>Photo by {lastName}{onMatch[0]}</em>
                    </p>
                  );
                }
              }
              
              // If we got this far, we found "on Platform" but no clear name
              if (onIndex > 0 && onIndex < emText.length - 5) {
                // Just start at "on [Platform]" - it's better than showing the description
                return (
                  <p className="text-center text-xs text-gray-500 mt-2 italic">
                    <em>Source:{onMatch[0]}</em>
                  </p>
                );
              }
            }
            
            // If we found attribution and it's not at the start (has description before it)
            if (attributionIndex !== Infinity && attributionIndex > 0) {
              const attributionText = emText.substring(attributionIndex);
              return (
                <p className="text-center text-xs text-gray-500 mt-2 italic">
                  <em>{attributionText}</em>
                </p>
              );
            }
            
            // Just attribution, show as is
            return (
              <p className="text-center text-xs text-gray-500 mt-2 italic">
                {children}
              </p>
            );
          }
          
          // If it looks like a descriptive caption (no attribution info), hide it
          if (!emText.includes('Photo by') && !emText.includes('Source:') && !emText.match(/on \[.*?\]/)) {
            return null;
          }
        }
      }
      
      // Check if the content is an emoji list item
      if (typeof content === 'string') {
        // Use a simpler emoji detection approach that doesn't rely on Unicode property escapes
        const emojiListMatch = content.match(/^(\*|\-)\s+([^\s\w])\s+(.+)$/);
        
        if (emojiListMatch) {
          const emoji = emojiListMatch[2];
          const text = emojiListMatch[3];
          
          return (
            <div className="emoji-list-item">
              <span className="emoji-bullet">{emoji}</span>
              <span>{text}</span>
            </div>
          );
        }
      }
      
      // Normal paragraph rendering
      return <p className="mb-6 text-gray-700 leading-relaxed">{props.children}</p>;
    },
    em: (props) => {
      const textContent = props.children?.toString() || '';
      
      // If this contains attribution info
      if (textContent.includes('Photo by') || textContent.includes('Source:') || textContent.match(/on \[.*?\]/)) {
        // Check if there's a description before the attribution
        const attributionIndex = Math.max(
          textContent.indexOf('Photo by') !== -1 ? textContent.indexOf('Photo by') : Infinity,
          textContent.indexOf('Source:') !== -1 ? textContent.indexOf('Source:') : Infinity
        );
        
        // If we found an attribution marker and it's not at the start of the text
        if (attributionIndex !== Infinity && attributionIndex > 0) {
          // Extract only the attribution part
          const attributionText = textContent.substring(attributionIndex);
          return <em>{attributionText}</em>;
        }
        
        // This is just an attribution caption, keep it
        return <em {...props} />;
      }
      
      // If it looks like a descriptive caption
      if (textContent.startsWith('A ') || textContent.startsWith('An ') || textContent.startsWith('The ')) {
        // Check if the parent is already handling this
        const parentType = props.node?.parent?.type;
        if (parentType === 'paragraph' && 
            !textContent.includes('Photo by') && 
            !textContent.includes('Source:') && 
            !textContent.match(/on \[.*?\]/)) {
          // This is likely a descriptive caption, hide it
          return null;
        }
      }
      
      // Regular emphasis
      return <em className="italic" {...props} />;
    },
    ul: (props) => {
      // Check for emoji list classes
      const className = props.className || '';
      if (className.includes('emoji-')) {
        const emojiClass = className.match(/emoji-(\w+)/)?.[0] || '';
        return <ul className={`emoji-list ${emojiClass}`} {...props} />;
      }
      return <ul className="list-disc list-inside mb-6 space-y-2 pl-4" {...props} />;
    },
    ol: (props) => <ol className="list-decimal list-inside mb-6 space-y-3 pl-4" {...props} />,
    li: ({ node, ...props }) => {
      // Check if the content contains an emoji bullet
      const content = React.Children.toArray(props.children).join('');
      // Use a simpler approach to detect emoji characters that's more compatible
      const emojiMatch = content.match(/^([^\s\w])\s+(.+)$/);
      
      if (emojiMatch) {
        const emoji = emojiMatch[1];
        const text = emojiMatch[2];
        
        return (
          <li className={`emoji-list-item ${getEmojiClass(emoji)}`}>
            <span className="emoji-bullet">{emoji}</span>
            <span>{text}</span>
          </li>
        );
      }
      
      return <li {...props} />;
    },
    a: (props) => {
      // Check for tooltip class
      if (props.className?.includes('tooltip')) {
        const tooltipText = props['data-tooltip'] || 'Tooltip';
        return (
          <span className="tooltip">
            <a
              {...props}
              className="text-indigo-600 font-medium hover:text-indigo-800 no-underline"
              target={props.href?.startsWith('http') ? '_blank' : undefined}
              rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {props.children}
            </a>
            <span className="tooltip-text">{tooltipText}</span>
          </span>
        );
      }
      
      return (
      <a
        {...props}
        className="text-indigo-600 font-medium hover:text-indigo-800 underline decoration-2 decoration-indigo-200 underline-offset-2 hover:decoration-indigo-400 transition-all duration-200"
        target={props.href?.startsWith('http') ? '_blank' : undefined}
        rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      />
      );
    },
    blockquote: (props) => {
      // Check if it's an expert tip/quote
      const text = props.children?.toString().toLowerCase() || '';
      if (
        text.includes('expert') || 
        text.includes('pro tip') || 
        text.includes('did you know') ||
        props.className === 'fancy-quote'
      ) {
        let icon = "💡";
        let title = "Expert Insight";
        
        if (text.includes('pro tip')) {
          icon = "🔍";
          title = "Pro Tip";
        } else if (text.includes('did you know')) {
          icon = "🎓";
          title = "Did You Know?";
      }
      
      return (
          <blockquote {...props} className="!my-8">
            <div className="font-bold flex items-center mb-2">
              <span className="mr-2 text-xl">{icon}</span> {title}
            </div>
            {props.children}
          </blockquote>
        );
      }
      
      return (
        <blockquote>
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
      
      // Extract photographer attribution information from data attributes
      const photographerName = props['data-photographer'] || props.photographer;
      const photographerUrl = props['data-photographer-url'] || props.photographerUrl;
      const sourceWebsite = props['data-source'] || props.source;
      const sourceUrl = props['data-source-url'] || props.sourceUrl;
      
      return (
        <span className="block my-8">
          <span className="overflow-hidden rounded-lg block">
            <img
              {...props}
              className="w-full h-auto object-cover rounded-lg"
              alt={props.alt || "Article image"}
              loading="lazy"
              onLoad={() => handleImageLoad(props.id)}
            />
          </span>
          {(photographerName || sourceWebsite) && (
            <span className="text-xs text-gray-500 italic mt-2 block text-right">
              {photographerName && (
                <>
                  Photo by: {photographerUrl ? (
                    <a 
                      href={photographerUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-indigo-600 transition-colors"
                    >
                      {photographerName}
                    </a>
                  ) : (
                    <span>{photographerName}</span>
                  )}
                </>
              )}
              {photographerName && sourceWebsite && " / "}
              {sourceWebsite && (
                <>
                  Source: {sourceUrl ? (
                    <a 
                      href={sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-indigo-600 transition-colors"
                    >
                      {sourceWebsite}
                    </a>
                  ) : (
                    <span>{sourceWebsite}</span>
                  )}
                </>
              )}
            </span>
          )}
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
    figcaption: (props) => {
      // Check if the figcaption contains attribution information
      const captionText = props.children ? props.children.toString() : '';
      
      // Extract only the attribution part (anything after "Photo by" or similar patterns)
      const attributionRegex = /(Photo by|Source:|Image by|Credit:|Courtesy of)(.+)$/i;
      const attributionMatch = captionText.match(attributionRegex);
      
      if (attributionMatch) {
        // Only show the attribution part
        return (
          <figcaption {...props} className="text-center text-xs text-gray-500 mt-2 italic">
            {attributionMatch[0]}
          </figcaption>
        );
      } else if (captionText.includes('Photo by') || captionText.includes('Source')) {
        // If there's attribution somewhere in the text but regex didn't catch it
        const photoByIndex = captionText.indexOf('Photo by');
        const sourceIndex = captionText.indexOf('Source');
        
        let startIndex = -1;
        if (photoByIndex !== -1) startIndex = photoByIndex;
        else if (sourceIndex !== -1) startIndex = sourceIndex;
        
        if (startIndex !== -1) {
          return (
            <figcaption {...props} className="text-center text-xs text-gray-500 mt-2 italic">
              {captionText.substring(startIndex)}
            </figcaption>
          );
        }
      }
      
      // If no attribution is found, look for "on" patterns like "on Unsplash"
      if (captionText.includes(' on ')) {
        const parts = captionText.split(' on ');
        const lastPart = parts[parts.length - 1];
        
        // If the last part looks like a source (e.g., Unsplash, Pexels, etc.)
        if (/Unsplash|Pexels|Pixabay|Flickr|Getty|Shutterstock/i.test(lastPart)) {
          // Try to find a name before "on"
          const namePart = parts[parts.length - 2];
          if (namePart) {
            const nameWords = namePart.split(' ');
            // Get the last few words, which are likely the photographer name
            const probableName = nameWords.slice(Math.max(0, nameWords.length - 3)).join(' ');
            return (
              <figcaption {...props} className="text-center text-xs text-gray-500 mt-2 italic">
                Photo by {probableName} on {lastPart}
              </figcaption>
            );
          }
          
          return (
            <figcaption {...props} className="text-center text-xs text-gray-500 mt-2 italic">
              Source: {lastPart}
            </figcaption>
          );
        }
      }
      
      // No attribution found, hide the caption completely
      return null;
    }
  };

  // Add this function to map emojis to special classes
  const getEmojiClass = (emoji) => {
    const emojiMap = {
      '🔥': 'fire',
      '💡': 'idea',
      '⚠️': 'warning',
      '✅': 'success',
      '❌': 'error',
      '⭐': 'star',
      '📝': 'note',
      '📊': 'chart',
      '🧠': 'brain',
      '🏆': 'trophy',
      '👍': 'thumbs-up',
      '👎': 'thumbs-down',
      '❤️': 'heart',
      '😊': 'smile',
      '🤔': 'thinking',
      '😲': 'surprised',
      '🎯': 'target',
      '🚀': 'rocket',
      '⏱️': 'timer',
      '💪': 'strength'
    };
    
    return emojiMap[emoji] || '';
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
      
      // Preprocess the content to handle various formatting elements
      let processedContent = content;
      
      // 1. Process emoji lists
      // Match markdown lists with specific emoji prefixes
      const listItemPrefix = /^(\*|\-)\s+/;
      
      // Helper function to determine the correct emoji class
      const getEmojiClass = (emoji) => {
        const emojiMap = {
          '🔑': 'key',
          '⚡': 'sparkles',
          '✅': 'check',
          '⚠️': 'alert',
          '💡': 'idea',
          '⭐': 'star',
        };
        // Expanded emoji list with visual mapping
        const emojiCategories = {
          '📱': 'tech',
          '🚀': 'speed',
          '🧠': 'mind',
          '🔍': 'search',
          '💻': 'computer',
          '📊': 'data',
          '🔮': 'future',
          '🌟': 'star',
          '🎯': 'target',
          '📈': 'growth'
        };
        
        return emojiMap[emoji] || emojiCategories[emoji] || 'key';
      };
      
      // Process lines one by one instead of using regex with Unicode
      const lines = processedContent.split('\n');
      let inEmojiList = false;
      let currentEmojiType = null;
      let listStartIndex = -1;
      let listEndIndex = -1;
      
      // First pass: identify emoji lists
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prefixMatch = line.match(listItemPrefix);
        
        // Check if this line is a list item with an emoji
        if (prefixMatch) {
          // Check if the line contains an emoji after the prefix
          const afterPrefix = line.substring(prefixMatch[0].length);
          // Look for common emojis used in lists
          const emojis = ['🔑', '⚡', '✅', '⚠️', '💡', '⭐', '📱', '🚀', '🧠', '🔍', '💻', '📊', '🔮', '🌟', '🎯', '📈'];
          
          // Find if any emoji is present at the start of the text after the prefix
          const emojiMatch = emojis.find(emoji => afterPrefix.trimStart().startsWith(emoji));
          
          if (emojiMatch) {
            // We found an emoji list item
            if (!inEmojiList) {
              // Start a new emoji list
              inEmojiList = true;
              currentEmojiType = emojiMatch;
              listStartIndex = i;
            } else if (currentEmojiType !== emojiMatch) {
              // End previous list and start a new one with different emoji
              // Process the previous list
              const emojiClass = getEmojiClass(currentEmojiType);
              // Wrap lines with the emoji class
              lines[listStartIndex] = `{:.emoji-${emojiClass}}\n${lines[listStartIndex]}`;
              
              // Start a new list
              currentEmojiType = emojiMatch;
              listStartIndex = i;
            }
            // Update the end index of the current list
            listEndIndex = i;
          } else if (inEmojiList) {
            // A list item without emoji after an emoji list - end the emoji list
            const emojiClass = getEmojiClass(currentEmojiType);
            lines[listStartIndex] = `{:.emoji-${emojiClass}}\n${lines[listStartIndex]}`;
            inEmojiList = false;
          }
        } else if (inEmojiList && line.trim() === '') {
          // Empty line after emoji list - end the list
          const emojiClass = getEmojiClass(currentEmojiType);
          lines[listStartIndex] = `{:.emoji-${emojiClass}}\n${lines[listStartIndex]}`;
          inEmojiList = false;
        }
      }
      
      // Handle case where emoji list is at the end of the content
      if (inEmojiList) {
        const emojiClass = getEmojiClass(currentEmojiType);
        lines[listStartIndex] = `{:.emoji-${emojiClass}}\n${lines[listStartIndex]}`;
      }
      
      // Reassemble the content
      processedContent = lines.join('\n');
      
      // 2. Process expert tips and callouts
      const expertTipRegex = />[\s\n]*\*\*(EXPERT\s+(?:TIP|INSIGHT)|PRO\s+TIP|DID\s+YOU\s+KNOW\?)\:\*\*\s+(.*?)(?:\n\n|\n[^>]|$)/gis;
      processedContent = processedContent.replace(expertTipRegex, (match, label, content) => {
        // Determine callout type based on label
        let calloutType = 'expert';
        if (label.includes('PRO TIP')) {
          calloutType = 'tip';
        } else if (label.includes('DID YOU KNOW')) {
          calloutType = 'info';
        }
        
        // Format as a blockquote with the appropriate label
        return `> **${label}:** ${content.trim()}\n\n`;
      });
      
      // 3. Find patterns of image followed by multiple italic paragraphs and keep only attribution
      const imageWithMultiCaptionRegex = /!\[(.*?)\]\((.*?)\)[\r\n]+\*(.*?)\*[\r\n]+\*(Photo by.*?|Source:.*?|Credit:.*?|Courtesy of.*?)\*/gs;
      processedContent = processedContent.replace(imageWithMultiCaptionRegex, (match, alt, url, description, attribution) => {
        return `![${alt}](${url})\n*${attribution}*`;
      });
      
      // 4. Process tooltips in text (format: [text]{tooltip info})
      const tooltipRegex = /\[([^\]]+)\]\{([^}]+)\}/g;
      processedContent = processedContent.replace(tooltipRegex, (match, text, tooltip) => {
        return `<span class="tooltip">${text}<span class="tooltip-text">${tooltip}</span></span>`;
      });
      
      // 5. Enhance tables with automatic formatting
      const tableRegex = /\|(.+)\|\n\|([\s\-:]+)\|\n((?:\|.+\|\n)+)/g;
      processedContent = processedContent.replace(tableRegex, (match) => {
        return `<div class="table-container">\n${match}</div>`;
      });
      
      // Add reading progress indicator if not already present
      if (!processedContent.includes('reading-progress-container')) {
        processedContent += `\n\n<div class="reading-progress-container">
  <div id="reading-progress" class="reading-progress"></div>
</div>`;
      }
      
      // Proceed with normal rendering
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={components}
        >
          {processedContent}
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