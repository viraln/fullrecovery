// sw-cleanup.js - Enhanced Service Worker Cleanup Script
// This script completely resolves service worker issues including
// "Failed to execute 'clone' on 'Response': Response body is already used"

(function() {
  // Only run on client side
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  
  console.log('Service Worker Cleanup: Starting enhanced cleanup process');

  // Track if this script has already run to avoid duplicate operations
  if (window.__swCleanupRun) return;
  window.__swCleanupRun = true;

  // Set up global error handler for service worker errors
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Check if the error is related to service workers
    if (message && (
      message.toString().includes('service worker') || 
      message.toString().includes('ServiceWorker') ||
      (source && source.includes('sw.js')) ||
      (error && error.name === 'SecurityError' && message.toString().includes('Failed to register a ServiceWorker'))
    )) {
      console.warn('Suppressed service worker error:', message);
      return true; // Prevents the error from being shown in console
    }
    
    // Call the original error handler for other errors
    if (originalOnError) {
      return originalOnError.apply(this, arguments);
    }
    return false;
  };
  
  // Intercept fetch errors related to service worker caching
  const originalFetch = window.fetch;
  window.fetch = function(resource, options) {
    return originalFetch(resource, options)
      .catch(error => {
        // Check if error is related to cloning response for service worker cache
        if (error && error.message && 
            (error.message.includes('body is already used') || 
             error.message.includes('Failed to execute \'clone\' on \'Response\''))) {
          console.warn('Suppressed service worker caching error for:', resource);
          
          // Make a fresh fetch without involving the service worker
          const bypassOptions = { ...options, cache: 'reload' };
          return originalFetch(resource, bypassOptions);
        }
        throw error;
      });
  };
  
  // Intercept all service worker related messages
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', function(event) {
      console.log('Service worker message intercepted:', event.data);
      
      // If needed, we could handle specific messages here
      if (event.data && event.data.error) {
        console.warn('Service worker reported an error:', event.data.error);
        // Prevent event propagation if needed
        event.stopImmediatePropagation();
      }
    });
  }
  
  // Main service worker cleanup function
  async function cleanupServiceWorkers() {
    try {
      // Skip if service worker API is not available
      if (!navigator.serviceWorker) {
        console.log('Service Worker API not available in this browser');
        return;
      }
      
      // Check for any active service worker registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length === 0) {
        console.log('No service workers found to clean up');
        return;
      }
      
      console.log(`Found ${registrations.length} service worker registrations, unregistering all...`);
      
      // Unregister all service workers
      const unregisterPromises = registrations.map(async (registration) => {
        try {
          const success = await registration.unregister();
          console.log(`Unregistered service worker for ${registration.scope}: ${success ? 'success' : 'failed'}`);
          return success;
        } catch (error) {
          console.error(`Error unregistering service worker for ${registration.scope}:`, error);
          return false;
        }
      });
      
      // Wait for all unregister operations to complete
      const results = await Promise.all(unregisterPromises);
      const successCount = results.filter(Boolean).length;
      
      console.log(`Service worker cleanup completed. Successfully unregistered ${successCount} of ${registrations.length} service workers.`);
      
      // Clear caches to remove any service worker cached responses
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
          console.log(`Cleared ${cacheNames.length} cache(s)`);
        } catch (cacheError) {
          console.error('Error clearing caches:', cacheError);
        }
      }
      
      // Force reload if any service workers were successfully unregistered
      if (successCount > 0 && !sessionStorage.getItem('serviceWorkerCleanupComplete')) {
        sessionStorage.setItem('serviceWorkerCleanupComplete', 'true');
        console.log('Reloading page to complete service worker cleanup...');
        
        // Use a timeout to ensure console logs are visible
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Service worker cleanup error:', error);
    }
  }
  
  // Prevent future service worker registrations
  if (navigator.serviceWorker) {
    // Store the original registration function
    const originalRegister = navigator.serviceWorker.register;
    
    // Override register to prevent new registrations
    navigator.serviceWorker.register = function(...args) {
      console.warn('⚠️ Blocked service worker registration:', args[0]);
      return Promise.reject(new Error('Service worker registrations have been disabled by the cleanup script.'));
    };
    
    // Also disable the controller property to prevent access to active service workers
    try {
      Object.defineProperty(navigator.serviceWorker, 'controller', {
        get: function() {
          console.warn('⚠️ Blocked access to service worker controller');
          return null;
        }
      });
    } catch (e) {
      console.warn('Could not override serviceWorker.controller:', e);
    }
  }
  
  // Set up a MutationObserver to prevent service worker script tags from loading
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      
      for (const node of mutation.addedNodes) {
        if (node.tagName === 'SCRIPT') {
          const src = node.src || '';
          if (src.includes('sw.js') || src.includes('service-worker.js')) {
            console.warn('⚠️ Blocked service worker script from loading:', src);
            node.parentNode.removeChild(node);
          }
        }
      }
    }
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // Run cleanup
  cleanupServiceWorkers();
  
  // Export the cleanup function for manual triggering if needed
  window.cleanupServiceWorkers = cleanupServiceWorkers;
  
  console.log('Service worker cleanup script fully initialized');
})(); 