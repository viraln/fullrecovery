import { useEffect } from 'react';
import { cachedFetch } from '../utils/lazyFetch';

/**
 * DataPrefetcher component that preloads critical data in the background
 * to improve perceived performance
 */
export default function DataPrefetcher() {
  useEffect(() => {
    const prefetchData = async () => {
      try {
        // Start cache preload - this should run first but in background
        fetch('/api/preload-cache', { 
          priority: 'low',
        }).catch(err => console.log('Cache preload running in background'));
          
        // Preload the first page of articles - high priority but cached
        await cachedFetch('/api/articles/page/1?limit=20')
          .catch(err => console.log('First page preload running'));
        
        // Queue up the next page for fast pagination response
        setTimeout(() => {
          cachedFetch('/api/articles/page/2?limit=20')
            .catch(() => {/* silent fail */});
        }, 5000);
      } catch (error) {
        // Silent fail - this is just prefetching
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => prefetchData(), { timeout: 2000 });
      } else {
        setTimeout(prefetchData, 1000);
      }
    }

    return () => {/* No cleanup needed */};
  }, []);

  // This component doesn't render anything
  return null;
} 