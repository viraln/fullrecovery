import { useState, useEffect, useRef, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import CompactCard from '../CompactCard'
import Link from 'next/link'
import Image from 'next/image'
import { getRelativeTime } from '../../utils/dateUtils'
import { fetchArticle, fetchArticles, cachedFetch } from '../../utils/lazyFetch'

// Track which articles have already been prefetched to avoid duplication
const prefetchedArticles = new Set();

// Batch size for prefetching
const PREFETCH_BATCH_SIZE = 5;
let pendingPrefetches = [];
let prefetchTimer = null;

// Process batch prefetching
const processPrefetchBatch = async () => {
  if (pendingPrefetches.length === 0) return;
  
  const batch = [...pendingPrefetches];
  pendingPrefetches = [];
  
  try {
    // Use our batch fetch utility
    await fetchArticles(batch);
    batch.forEach(slug => prefetchedArticles.add(slug));
    console.log(`Prefetched batch of ${batch.length} articles`);
  } catch (error) {
    console.error('Error prefetching article batch:', error);
  }
};

// Prefetch article data when a card is hovered or visible in viewport
const prefetchArticle = async (slug) => {
  if (typeof window === 'undefined') return
  
  // Skip prefetching for placeholder slugs or already prefetched articles
  if (slug.startsWith('placeholder-') || prefetchedArticles.has(slug)) {
    return;
  }
  
  try {
    // Prefetch the page navigation
    if (typeof window !== 'undefined' && window.next && window.next.router) {
      window.next.router.prefetch(`/posts/${slug}`);
    }
    
    // Add to batch prefetch queue
    pendingPrefetches.push(slug);
    prefetchedArticles.add(slug); // Mark as prefetched immediately to prevent duplicates
    
    // Clear existing timer and set a new one
    if (prefetchTimer) {
      clearTimeout(prefetchTimer);
    }
    
    // Process batch after short delay or when batch is full
    if (pendingPrefetches.length >= PREFETCH_BATCH_SIZE) {
      processPrefetchBatch();
    } else {
      prefetchTimer = setTimeout(processPrefetchBatch, 100);
    }
  } catch (error) {
    console.error('Error prefetching article:', slug, error)
  }
}

const ArticleCard = ({ post, index, observer }) => {
  const cardRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isPrefetched, setIsPrefetched] = useState(false)

  // Set up intersection observer to detect when card is visible
  useEffect(() => {
    if (!cardRef.current || !observer) return
    
    observer.observe(cardRef.current)
    
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current)
      }
    }
  }, [observer])
  
  // When card becomes visible, prefetch the article data
  useEffect(() => {
    if (isVisible && !isPrefetched && post.slug) {
      prefetchArticle(post.slug)
      setIsPrefetched(true)
    }
  }, [isVisible, isPrefetched, post.slug])

  return (
    <div 
      ref={cardRef}
      className="article-card opacity-0 transform translate-y-4 transition-all duration-500"
      style={{ 
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <Link
        href={`/posts/${post.slug}`}
        className="block h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
        onMouseEnter={() => {
          if (!isPrefetched && post.slug) {
            prefetchArticle(post.slug)
            setIsPrefetched(true)
          }
        }}
      >
        <div className="relative h-48 overflow-hidden">
          <Image
            src={post.image}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={post.image.includes('unsplash.com') || post.image.includes('http')}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="text-xs text-white/90 flex items-center space-x-2">
              <span>{post.readingTime || 3} min read</span>
              <span>•</span>
              <span>{getRelativeTime(new Date(post.date))}</span>
            </div>
          </div>
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <div className="mb-2 flex">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
              {post.category || 'Technology'}
            </span>
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {post.excerpt}
          </p>
        </div>
      </Link>
    </div>
  )
}

/**
 * InfiniteArticles component
 * Loads articles with infinite scrolling using Netlify Functions
 */
export default function InfiniteArticles({ 
  initialArticles = [], 
  topic = null, 
  subtopic = null, 
  filter = 'latest'
}) {
  // State
  const [articles, setArticles] = useState(initialArticles);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  
  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  // Load more articles when bottom is in view
  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMoreArticles();
    }
  }, [inView]);
  
  // Function to load more articles
  const loadMoreArticles = async () => {
    if (loading || !hasMore) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Build the URL with query parameters
      const baseUrl = '/.netlify/functions/infinite-articles';
      const queryParams = new URLSearchParams({
        page: page + 1,
        limit: 10,
        sort: filter
      });
      
      // Add topic and subtopic if provided
      if (topic) queryParams.append('topic', topic);
      if (subtopic) queryParams.append('subtopic', subtopic);
      
      // Fetch articles from Netlify Function
      const response = await fetch(`${baseUrl}?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch articles: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update state
      setArticles(prev => [...prev, ...data.articles]);
      setPage(page + 1);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Error loading more articles:', err);
      setError('Failed to load more articles. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle filter change from parent component
  useEffect(() => {
    // Reset and load articles with new filter
    setArticles(initialArticles);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, [filter, topic, subtopic, initialArticles]);
  
  return (
    <div className="space-y-8">
      {/* Articles grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article, index) => (
          <ArticleCard key={`${article.slug}-${index}`} article={article} />
        ))}
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="loader">
            <div className="animate-pulse flex space-x-4">
              <div className="h-12 w-12 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="text-center py-4">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => loadMoreArticles()} 
            className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Infinite scroll trigger */}
      {hasMore && !loading && (
        <div ref={ref} className="h-10 flex items-center justify-center">
          <span className="text-gray-400 text-sm">Loading more articles...</span>
        </div>
      )}
      
      {/* End of articles message */}
      {!hasMore && articles.length > 0 && (
        <div className="text-center py-8 border-t border-gray-100">
          <p className="text-gray-500">You've reached the end of the articles</p>
        </div>
      )}
      
      {/* No articles message */}
      {!loading && articles.length === 0 && (
        <div className="text-center py-12 border border-gray-200 rounded-lg bg-white">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="text-lg font-medium text-gray-900">No articles found</h3>
          <p className="text-gray-500 mt-2 mb-6">
            We couldn't find any articles matching your criteria.
          </p>
          <Link 
            href="/"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Browse All Articles
          </Link>
        </div>
      )}
    </div>
  );
}
