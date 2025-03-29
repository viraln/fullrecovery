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

export default function InfiniteArticles({ posts = [], initialPosts = [], hasMore = true, isLoadingMore = false, onLoadMore = null }) {
  const [localPosts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMoreState, setHasMore] = useState(hasMore)
  const [visiblePosts, setVisiblePosts] = useState([])
  const loadingRef = useRef(false)
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px'
  })

  // Initialize localPosts from initialPosts when component mounts
  useEffect(() => {
    if (initialPosts.length > 0 && localPosts.length === 0) {
      // Sort by date (newest first) before setting
      const sortedInitialPosts = [...initialPosts].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      setPosts(sortedInitialPosts);
    }
  }, [initialPosts, localPosts.length])

  // Update hasMoreState when hasMore prop changes
  useEffect(() => {
    setHasMore(hasMore)
  }, [hasMore])

  // Update loading state when isLoadingMore prop changes
  useEffect(() => {
    setLoading(isLoadingMore)
  }, [isLoadingMore])

  const loadMorePosts = useCallback(async () => {
    if (loading || loadingRef.current || !hasMoreState) return
    
    // If a custom onLoadMore function is provided, use it
    if (typeof onLoadMore === 'function') {
      onLoadMore()
      return
    }
    
    try {
      loadingRef.current = true
      setLoading(true)
      
      // Use our cached fetch utility instead of direct fetch
      const nextPage = page + 1
      const data = await cachedFetch(`/api/articles/page/${nextPage}?limit=20`)
      
      if (!data.articles || data.articles.length === 0) {
        setHasMore(false)
      } else {
        // Sort new articles by date (newest first) before adding to existing posts
        const sortedNewArticles = [...data.articles].sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        );
        setPosts(prevPosts => {
          // Merge and ensure all posts are sorted by date
          const combinedPosts = [...prevPosts, ...sortedNewArticles];
          return combinedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        });
        setPage(nextPage)
        // Update hasMore based on pagination data
        setHasMore(data.pagination.hasMore)
        
        // Prefetch next page in advance
        if (data.pagination.hasMore) {
          setTimeout(() => {
            cachedFetch(`/api/articles/page/${nextPage + 1}?limit=20`)
              .catch(() => {/* silent fail */});
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error loading more posts:', error)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [page, loading, hasMoreState, onLoadMore])

  useEffect(() => {
    if (inView) {
      loadMorePosts()
    }
  }, [inView, loadMorePosts])

  // If no posts data is provided, use some placeholder posts
  const displayPosts = posts.length > 0 ? posts : localPosts.length > 0 ? localPosts : initialPosts.length > 0 ? initialPosts : [
    {
      slug: 'placeholder-1',
      title: 'Getting Started with Next.js: The Ultimate Guide',
      excerpt: 'Learn how to build modern web applications with Next.js, from setup to deployment.',
      date: new Date().toISOString(),
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=60',
      readingTime: 5,
      category: 'Web Dev',
      isNew: true
    },
    {
      slug: 'placeholder-2',
      title: 'React 18 Features That Will Change How You Write Components',
      excerpt: 'Explore the latest features in React 18 and how they improve performance and developer experience.',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=60',
      readingTime: 8,
      category: 'React',
      trending: true
    },
    {
      slug: 'placeholder-3',
      title: 'Machine Learning for JavaScript Developers',
      excerpt: 'Discover how to implement machine learning in your web applications using TensorFlow.js.',
      date: new Date(Date.now() - 86400000 * 4).toISOString(),
      image: 'https://images.unsplash.com/photo-1655720031554-a929595ffad7?auto=format&fit=crop&w=800&q=60',
      readingTime: 12,
      category: 'AI & ML',
      isNew: false
    }
  ]

  // Use visiblePosts state for prefetching
  useEffect(() => {
    // Only prefetch if we have visible posts
    if (visiblePosts.length === 0) return;
    
    // Create a stable reference to the current displayPosts
    const currentPosts = [...displayPosts];
    
    // Prefetch articles that are visible
    visiblePosts.forEach(index => {
      if (currentPosts[index]?.slug) {
        prefetchArticle(currentPosts[index].slug)
      }
    })
    // Remove displayPosts from dependency array to prevent infinite rerenders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePosts])

  // Create an intersection observer for visibility detection
  const observer = useRef(
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              // When a card becomes visible
              if (entry.isIntersecting) {
                // Add animation class to make visible
                entry.target.classList.add('opacity-100', 'translate-y-0')
                
                // Find the article card element
                const cardElement = entry.target.closest('.article-card')
                if (cardElement && cardElement.parentNode) {
                  const cardIndex = Array.from(cardElement.parentNode.children).indexOf(cardElement)
                  // Mark it as visible for prefetching - use a more stable approach
                  setVisiblePosts(prev => {
                    // Only update if needed to avoid unnecessary renders
                    if (cardIndex >= 0 && !prev.includes(cardIndex)) {
                      // Create a new array only when we need to add a new index
                      const newIndexes = [...prev, cardIndex];
                      // Sort the indexes to ensure stable comparisons
                      return newIndexes.sort((a, b) => a - b);
                    }
                    return prev; // No change needed
                  })
                }
              }
            })
          },
          { threshold: 0.1 }
        )
      : null
  )
  
  // The useInView hook already handles the intersection observation
  useEffect(() => {
      // This effect is kept empty to maintain dependency arrays
      // but we rely on the inView state from useInView hook
    },
    [loading, hasMoreState, loadMorePosts, loadMoreRef]
  )

  return (
    <div className="infinite-scroll-container">
      <div className="explore-section py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
            Explore More
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPosts.map((post, index) => (
              <ArticleCard 
                key={`article-card-${post.slug}-${index}`}
                post={post}
                index={index}
                observer={observer.current}
              />
            ))}
          </div>
          
          {(hasMoreState || loading) && (
            <div 
              ref={loadMoreRef}
              className="loading-indicator flex justify-center my-8"
            >
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                <button 
                  onClick={() => typeof onLoadMore === 'function' ? onLoadMore() : loadMorePosts()} 
                  className="load-more-button px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                >
                  Load More
                </button>
              )}
            </div>
          )}
          
          {!hasMoreState && localPosts.length > 0 && (
            <div className="text-center py-4 text-sm text-gray-500">
              You've reached the end of the list
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
