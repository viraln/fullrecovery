/**
 * THIS IS A TEMPLATE/BACKUP FILE AND SHOULD NOT BE USED DIRECTLY
 * The error occurs because getStaticPaths can only be used with dynamic routes ([slug].js)
 * but this file has a static name (backup-slug.js)
 * 
 * To use this template, copy its contents to [slug].js or rename it
 */

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import dynamic from 'next/dynamic';
import { getRelativeTime } from '../../utils/dateUtils';
import ArticleReactions from '../../components/ArticleReactions';
import ArticleComments from '../../components/ArticleComments';
import AdSense from '../../components/AdSense';
import { extractTableOfContents } from '../../components/ArticleViewer';
import { getRelatedArticles } from '../../utils/articleUtils';

// Dynamically import ArticleViewer with SSR disabled to avoid hydration issues
const ArticleViewer = dynamic(() => import('../../components/ArticleViewer'), {
  ssr: false
});

// Custom components for layout elements
const components = {
  AdSense: (props) => <AdSense {...props} />,
  div: (props) => {
    if (props.className?.includes('adsbygoogle')) {
      return <AdSense slot="article-mid" />;
    }
    return <div {...props} />;
  },
};

export default function Post({ frontMatter, content, slug, relatedArticles }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showShareButtons, setShowShareButtons] = useState(false);
  const contentRef = useRef(null);
  const tableOfContents = extractTableOfContents(content);

  useEffect(() => {
    // Update view count
    const updateViews = async () => {
      try {
        // In a real app, you would update the view count in your database
        console.log('View count updated for:', slug);
      } catch (error) {
        console.error('Failed to update view count:', error);
      }
    };
    updateViews();

    let ticking = false;
    // Add scroll event listener to track reading progress
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
          setScrollProgress(progress);

          // Show share buttons after user has scrolled 25% of the article
          if (progress > 25) {
            setShowShareButtons(true);
          } else {
            setShowShareButtons(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [slug]);

  // Enhanced share function
  const shareArticle = (platform) => {
    // Use window.location to get the current URL dynamically
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const url = currentUrl || `https://Trendiingz.com/posts/${slug}`;
    const text = frontMatter.title;
    const summary = frontMatter.excerpt || '';
    
    let shareUrl;
    try {
      switch (platform) {
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
          break;
        case 'linkedin':
          // Use the full LinkedIn sharing URL with all parameters
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
          break;
        case 'reddit':
          shareUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
          break;
        case 'whatsapp':
          shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
          break;
        default:
          return;
      }

      // Open the share dialog in a new window
      const width = 600;
      const height = 400;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;

      // Handle LinkedIn specifically
      if (platform === 'linkedin') {
        window.open(url, '_blank'); // First open the article in a new tab
        setTimeout(() => {
          window.open(shareUrl, 'share', 
            `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`
          );
        }, 100);
      } else {
        window.open(shareUrl, 'share',
          `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`
        );
      }
    } catch (error) {
      console.error('Error sharing article:', error);
      // Fallback: copy URL to clipboard if sharing fails
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard! You can now share it manually.');
      }).catch(() => {
        alert('Could not share article. Please try copying the URL manually.');
      });
    }
  };

  // Function to copy URL to clipboard
  const copyToClipboard = () => {
    const url = `https://Trendiingz.com/posts/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    });
  };

  // Handle scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Prepare structured data for the article
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: frontMatter.title,
    description: frontMatter.excerpt,
    image: frontMatter.image,
    datePublished: frontMatter.date,
    dateModified: frontMatter.lastModified,
    publisher: {
      '@type': 'Organization',
      name: 'Trendiingz',
      logo: {
        '@type': 'ImageObject',
        url: 'https://Trendiingz.com/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': frontMatter.url
    },
    wordCount: frontMatter.wordCount,
    keywords: frontMatter.keywords.join(', '),
    articleSection: frontMatter.category,
    inLanguage: frontMatter.locale
  };

  // Calculate read progress for the progress bar
  const progressBarStyle = {
    width: `${scrollProgress}%`
  };

  return (
    <>
      <Head>
        <title>{`${frontMatter.title} | Trendiingz - Latest Tech & Trends`}</title>
        <meta name="description" content={frontMatter.excerpt} />
        <meta name="keywords" content={frontMatter.keywords?.join(', ') || ''} />
        
        {/* Basic SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Trendiingz" />
        <link rel="canonical" href={`https://Trendiingz.com/posts/${slug}`} />
        
        {/* Open Graph */}
        <meta property="og:site_name" content="Trendiingz" />
        <meta property="og:title" content={frontMatter.title} />
        <meta property="og:description" content={frontMatter.excerpt} />
        <meta property="og:image" content={frontMatter.image} />
        <meta property="og:image:alt" content={frontMatter.imageAlt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://Trendiingz.com/posts/${slug}`} />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@Trendiingz" />
        <meta name="twitter:title" content={frontMatter.title} />
        <meta name="twitter:description" content={frontMatter.excerpt} />
        <meta name="twitter:image" content={frontMatter.image} />
        
        {/* Article Metadata */}
        <meta property="article:published_time" content={frontMatter.date} />
        <meta property="article:modified_time" content={frontMatter.lastModified} />
        <meta property="article:section" content={frontMatter.category} />
        {frontMatter.keywords?.map((keyword) => (
          <meta key={keyword} property="article:tag" content={keyword} />
        ))}

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      </Head>

      {/* Reading Progress Bar - Fixed at top */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div 
          className="h-full bg-indigo-600 transition-transform duration-150 ease-out origin-left"
          style={{ transform: `scaleX(${scrollProgress / 100})` }}
        />
      </div>

      {/* Header Navigation */}
      <header className="sticky top-0 w-full bg-white shadow-sm z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <span className="sr-only">Trendiingz</span>
                {/* Replace with your actual logo */}
                <div className="h-10 w-auto text-indigo-600 font-bold text-2xl flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                  Trendiingz
                </div>
              </Link>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-700 hover:text-indigo-600 transition-colors">
                Home
              </Link>
              <Link href="/categories" className="text-gray-700 hover:text-indigo-600 transition-colors">
                Categories
              </Link>
              <Link href="/trending" className="text-gray-700 hover:text-indigo-600 transition-colors">
                Trending
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-indigo-600 transition-colors">
                About
              </Link>
            </nav>
            <div className="flex items-center">
              <button className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors ml-4">
                Subscribe
              </button>
              <button className="md:hidden p-2 text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <article className="min-h-screen bg-white" itemScope itemType="https://schema.org/Article">
        {/* Hero Section with Gradient Overlay */}
        <div className="relative h-[70vh] min-h-[600px] w-full">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/30 z-10" />
          <Image
            src={frontMatter.image}
            alt={frontMatter.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
            itemProp="image"
          />
          <div className="absolute bottom-0 left-0 right-0 p-8 z-20 max-w-4xl mx-auto">
            <div className="space-y-4">
              {frontMatter.category && (
                <span className="inline-block bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-1 rounded-full text-sm font-medium">
                  {frontMatter.category}
                </span>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                {frontMatter.title}
              </h1>
              <div className="flex items-center space-x-4 text-white/90 text-sm md:text-base">
                <time dateTime={frontMatter.date}>
                  {new Date(frontMatter.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
                <span>•</span>
                <span>{frontMatter.readingTime} min read</span>
              </div>
            </div>
          </div>
          {frontMatter.imageCredit && (
            <small className="absolute bottom-2 right-2 text-white/75 bg-black/30 backdrop-blur-sm px-2 py-1 rounded text-xs z-20">
              Photo: {frontMatter.imageCredit}
            </small>
          )}
        </div>

        {/* Enhanced Floating Share Buttons */}
        <div className={`fixed left-4 top-1/2 transform -translate-y-1/2 z-30 transition-opacity duration-300 ${showShareButtons ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col space-y-3 bg-white/80 backdrop-blur-sm p-3 rounded-2xl shadow-lg">
            <h4 className="text-sm font-medium text-gray-600 text-center mb-2">Share</h4>
            <button 
              onClick={() => shareArticle('twitter')} 
              className="w-10 h-10 rounded-full bg-[#1DA1F2] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
              aria-label="Share on Twitter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.083 10.083 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.908 4.908 0 001.522 6.574 4.97 4.97 0 01-2.229-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.9 13.9 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63a10.045 10.045 0 002.46-2.548l-.047-.02z"/>
              </svg>
            </button>
            <button 
              onClick={() => shareArticle('facebook')} 
              className="w-10 h-10 rounded-full bg-[#4267B2] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
              aria-label="Share on Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
              </svg>
            </button>
            <button 
              onClick={() => shareArticle('linkedin')} 
              className="w-10 h-10 rounded-full bg-[#0A66C2] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
              aria-label="Share on LinkedIn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </button>
            <button 
              onClick={() => shareArticle('reddit')} 
              className="w-10 h-10 rounded-full bg-[#FF4500] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
              aria-label="Share on Reddit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
              </svg>
            </button>
            <button 
              onClick={() => shareArticle('whatsapp')} 
              className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
              aria-label="Share on WhatsApp"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </button>
            <button 
              onClick={copyToClipboard} 
              className="w-10 h-10 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
              aria-label="Copy link"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" />
              </svg>
            </button>
            <button 
              onClick={scrollToTop} 
              className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
              aria-label="Scroll to top"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dynamic Table of Contents */}
        <div className="hidden lg:block fixed right-4 top-32 w-64 z-30">
          <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
            <h3 className="font-semibold text-lg mb-3 text-gray-800">Contents</h3>
            <nav className="space-y-2 text-sm">
              {tableOfContents.map((heading, index) => (
                <a
                  key={index}
                  href={`#${heading.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(heading.slug);
                    if (element) {
                      // Update URL hash without triggering scroll
                      window.history.pushState(null, '', `#${heading.slug}`);
                      
                      // Smooth scroll to element with offset
                      const headerOffset = 100;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                      
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className={`block transition-colors ${
                    heading.level === 2
                      ? 'text-gray-800 hover:text-indigo-600'
                      : 'text-gray-600 hover:text-indigo-600 pl-4'
                  }`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Article Content */}
        <div className="max-w-4xl mx-auto px-4 py-12" ref={contentRef}>
          {/* Article Excerpt */}
          <div className="mb-12 text-xl text-gray-600 leading-relaxed border-l-4 border-indigo-500 pl-6 py-2">
            {frontMatter.excerpt}
          </div>

          {/* Main Content */}
          <div className="prose prose-lg md:prose-xl max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:text-indigo-800">
            <ArticleViewer content={content} />
          </div>

          {/* Article CTA */}
          <div className="my-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-800 mb-3">Stay updated with the latest trends</h3>
            <p className="text-gray-700 mb-6">Get exclusive content and be the first to know about new articles.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="flex-grow px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap">
                Subscribe Now
              </button>
            </div>
          </div>

          {/* Article Footer */}
          <footer className="mt-16 pt-8 border-t border-gray-100">
            <div className="flex flex-col space-y-8">
              {/* Keywords/Tags */}
              {frontMatter.keywords?.length > 0 && (
                <div>
                  <h4 className="text-sm text-gray-500 uppercase mb-3">Related Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {frontMatter.keywords.map((keyword) => (
                      <Link
                        href={`/topics/${keyword.toLowerCase().replace(/\s+/g, '-')}`}
                        key={keyword}
                        className="bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 px-4 py-2 rounded-full text-sm"
                      >
                        {keyword}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Updated */}
              <div className="text-sm text-gray-500">
                Last updated: {new Date(frontMatter.lastModified).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </footer>
        </div>

        {/* Related Articles */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">You might also like</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {relatedArticles.map((article) => (
                <Link
                  href={`/posts/${article.slug}`}
                  key={article.slug}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="relative h-48 w-full">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw"
                    />
                  </div>
                  <div className="p-6">
                    <span className="text-xs text-indigo-600 font-medium">
                      {article.category}
                    </span>
                    <h3 className="mt-2 text-xl font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="mt-2 text-gray-600 line-clamp-2">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center mt-4 text-sm text-gray-500">
                      <span>{article.readingTime} min read</span>
                      <span className="mx-2">•</span>
                      <span>{getRelativeTime(new Date(article.date))}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Reactions and Comments Section with New Styling */}
        <div className="bg-white py-16 border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-8">Join the conversation</h2>
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <ArticleReactions slug={slug} />
              <div className="mt-12 pt-8 border-t border-gray-100">
                <ArticleComments slug={slug} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="text-xl font-bold mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                  Trendiingz
                </div>
                <p className="text-gray-400 mb-4">
                  Your trusted source for the latest trends and insights in technology, business, and culture.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Explore</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/trending" className="text-gray-400 hover:text-white transition-colors">
                      Trending Now
                    </Link>
                  </li>
                  <li>
                    <Link href="/latest" className="text-gray-400 hover:text-white transition-colors">
                      Latest Articles
                    </Link>
                  </li>
                  <li>
                    <Link href="/categories" className="text-gray-400 hover:text-white transition-colors">
                      Categories
                    </Link>
                  </li>
                  <li>
                    <Link href="/topics" className="text-gray-400 hover:text-white transition-colors">
                      Topics
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Company</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Connect</h3>
                <div className="flex space-x-4 mb-4">
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.083 10.083 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.93 4.93 0 001.522 6.574 4.97 4.97 0 01-2.229-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.9 13.9 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63a9.935 9.935 0 002.46-2.548l-.047-.02z" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2 16h-2v-6h2v6zm-1-6.891c-.607 0-1.1-.496-1.1-1.109 0-.612.492-1.109 1.1-1.109s1.1.497 1.1 1.109c0 .613-.493 1.109-1.1 1.109zm8 6.891h-1.998v-2.861c0-1.881-2.002-1.722-2.002 0v2.861h-2v-6h2v1.093c.872-1.616 4-1.736 4 1.548v3.359z" />
                    </svg>
                  </a>
                </div>
                <p className="text-gray-400">
                  Subscribe to our newsletter for weekly updates
                </p>
                <div className="mt-2 flex">
                  <input 
                    type="email" 
                    placeholder="Your email" 
                    className="px-3 py-2 bg-gray-800 text-white rounded-l-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button className="bg-indigo-600 text-white px-3 py-2 rounded-r-lg hover:bg-indigo-700 transition-colors">
                    Join
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
              © {new Date().getFullYear()} Trendiingz. All rights reserved.
            </div>
          </div>
        </footer>
      </article>
    </>
  );
}

export async function getStaticPaths() {
  const files = fs.readdirSync(path.join(process.cwd(), 'content/articles'));
  
  const paths = files.map((filename) => {
    try {
      // Read the file to get the frontmatter slug
      const markdownWithMeta = fs.readFileSync(
        path.join(process.cwd(), 'content/articles', filename),
        'utf-8'
      );
      const { data } = matter(markdownWithMeta);
      
      // Use the slug from frontmatter if available, otherwise fallback to filename
      const slug = data.slug || filename.replace(/\.md$/, '');
      
      return {
        params: { slug }
      };
    } catch (error) {
      console.error(`Error processing file ${filename}:`, error);
      return null;
    }
  }).filter(Boolean); // Filter out any null entries from errors
  
  return {
    paths,
    fallback: 'blocking' // Change to blocking to handle paths that might be generated
  };
}

export async function getStaticProps({ params: { slug } }) {
  try {
    console.log('Getting static props for slug:', slug);
    const files = fs.readdirSync(path.join(process.cwd(), 'content/articles'));
    console.log('Found', files.length, 'article files');
    
    // Find the file by:
    // 1. First trying to match the frontmatter slug
    // 2. Then falling back to matching the filename
    let filePath;
    
    for (const file of files) {
      const fullPath = path.join(process.cwd(), 'content/articles', file);
      const { data } = matter(fs.readFileSync(fullPath, 'utf-8'));
      
      if (data.slug === slug) {
        filePath = file;
        console.log('Found file by frontmatter slug:', file);
        break;
      }
    }
    
    // If not found by slug in frontmatter, try filename as fallback
    if (!filePath) {
      filePath = files.find(file => file.replace(/\.md$/, '') === slug);
      if (filePath) {
        console.log('Found file by filename:', filePath);
      }
    }

    if (!filePath) {
      console.error(`Article not found for slug: ${slug}`);
      return { notFound: true };
    }

    const markdownWithMeta = fs.readFileSync(
      path.join(process.cwd(), 'content/articles', filePath),
      'utf-8'
    );

    const { data: frontMatter, content: rawContent } = matter(markdownWithMeta);
    
    // Calculate word count for SEO and reading time with safer calculation
    const safeRawContent = rawContent || '';
    const wordCount = safeRawContent.split(/\s+/g).length || 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute, minimum 1 minute

    // Get file stats for lastModified date
    const stats = fs.statSync(path.join(process.cwd(), 'content/articles', filePath));
    
    // Ensure all necessary SEO fields are present
    const serializedFrontMatter = {
      ...frontMatter,
      date: frontMatter && frontMatter.date instanceof Date 
        ? frontMatter.date.toISOString() 
        : (frontMatter?.date || new Date().toISOString()),
      lastModified: stats.mtime.toISOString(),
      wordCount,
      readingTime,
      excerpt: frontMatter?.excerpt || (safeRawContent ? safeRawContent.slice(0, 160).trim() + '...' : 'No content available'),
      keywords: frontMatter?.keywords || frontMatter?.tags || [],
      category: frontMatter?.category || 'Technology',
      image: frontMatter?.image || 'https://Trendiingz.com/default-og-image.jpg',
      imageAlt: frontMatter?.imageAlt || frontMatter?.title || 'Article image',
      imageCredit: frontMatter?.imageCredit || '',
      url: `https://Trendiingz.com/posts/${slug}`,
      locale: 'en_US'
    };

    // Get related articles
    const relatedArticles = await getRelatedArticles(frontMatter.keywords, slug, 3);

    return {
      props: {
        frontMatter: serializedFrontMatter,
        content: rawContent,
        slug,
        relatedArticles
      }
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return { notFound: true };
  }
} 