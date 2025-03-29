// host-fix.js - Fixes host validation issues from third-party services

(function() {
  if (typeof window === 'undefined') return;
  
  // Create a more resilient console implementation that ignores certain errors
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  
  // List of error patterns to suppress
  const suppressPatterns = [
    'Host validation failed',
    'Host is not supported',
    'Host is not valid or supported',
    'Host is not in insights whitelist',
    'Failed to execute \'clone\' on \'Response\''
  ];
  
  // Override console.error to filter out noise
  console.error = function(...args) {
    // Check if the error message contains any of our suppress patterns
    const errorString = args.join(' ');
    if (suppressPatterns.some(pattern => errorString.includes(pattern))) {
      // Silently ignore these specific errors
      return;
    }
    
    // Pass through all other errors to the original console.error
    originalConsoleError.apply(console, args);
  };
  
  // Override console.log to filter out noise
  console.log = function(...args) {
    // Check if this is one of the messages we want to suppress
    if (args.length > 0 && typeof args[0] === 'string') {
      if (suppressPatterns.some(pattern => args[0].includes(pattern))) {
        return; // Skip logging this message
      }
    }
    
    // Pass through to the original console.log
    originalConsoleLog.apply(console, args);
  };
  
  // Add a global error handler for uncaught service worker errors
  window.addEventListener('error', function(event) {
    // Check if this is a service worker related error
    if (event.message && event.message.includes('clone') && event.message.includes('Response')) {
      // Prevent the error from showing in console
      event.preventDefault();
      return true;
    }
    
    // Let other errors go through normally
    return false;
  }, true);
  
  // Add an unhandled promise rejection handler
  window.addEventListener('unhandledrejection', function(event) {
    // Check if this is a service worker related rejection
    if (event.reason && 
        ((typeof event.reason.message === 'string' && event.reason.message.includes('clone')) ||
         (typeof event.reason === 'string' && event.reason.includes('clone')))) {
      // Prevent the rejection from showing in console
      event.preventDefault();
      return true;
    }
    
    // Let other rejections go through normally
    return false;
  }, true);
  
  console.log('Host validation error suppression active');
})(); 