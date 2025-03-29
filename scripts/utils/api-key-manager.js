/**
 * API Key Manager
 * 
 * This utility manages multiple API keys with automatic rotation and fallback.
 * It supports both Gemini and Unsplash API keys, making API requests more reliable.
 * 
 * Features:
 * - Loads multiple API keys from environment variables
 * - Automatically rotates through keys when making requests
 * - Falls back to alternative keys when one fails
 * - Tracks failed keys to avoid reusing them in the same session
 * - Supports retrying failed requests
 * 
 * Usage:
 * ```
 * const { getGeminiApiKey, getUnsplashApiKey, makeGeminiRequest, makeUnsplashRequest } = require('./utils/api-key-manager');
 * 
 * // Get the current API key
 * const geminiKey = getGeminiApiKey();
 * 
 * // Make a request with automatic retry and fallback
 * const response = await makeGeminiRequest(url, options);
 * ```
 */

require('dotenv').config();

// Initialize key collections
const geminiKeys = [];
const unsplashKeys = [];

// Track failed keys to avoid reusing them immediately
const failedGeminiKeys = new Set();
const failedUnsplashKeys = new Set();

// Current key indices
let currentGeminiKeyIndex = 0;
let currentUnsplashKeyIndex = 0;

// Key prefix patterns for environment variables
const GEMINI_KEY_PATTERN = /^GEMINI_API_KEY(_\d+)?$/;
const UNSPLASH_KEY_PATTERN = /^UNSPLASH_ACCESS_KEY(_\d+)?$/;

/**
 * Initialize the API key manager by loading keys from environment variables
 */
function initialize() {
  // Reset collections
  geminiKeys.length = 0;
  unsplashKeys.length = 0;
  failedGeminiKeys.clear();
  failedUnsplashKeys.clear();
  
  // Load Gemini API keys
  Object.keys(process.env).forEach(key => {
    if (GEMINI_KEY_PATTERN.test(key) && process.env[key]) {
      geminiKeys.push(process.env[key]);
    }
  });
  
  // Load Unsplash API keys
  Object.keys(process.env).forEach(key => {
    if (UNSPLASH_KEY_PATTERN.test(key) && process.env[key]) {
      unsplashKeys.push(process.env[key]);
    }
  });
  
  // Add keys without index if they don't exist yet
  if (process.env.GEMINI_API_KEY && !geminiKeys.includes(process.env.GEMINI_API_KEY)) {
    geminiKeys.push(process.env.GEMINI_API_KEY);
  }
  
  if (process.env.UNSPLASH_ACCESS_KEY && !unsplashKeys.includes(process.env.UNSPLASH_ACCESS_KEY)) {
    unsplashKeys.push(process.env.UNSPLASH_ACCESS_KEY);
  }
  
  // Log results
  console.log(`API Key Manager: Loaded ${geminiKeys.length} Gemini API keys`);
  console.log(`API Key Manager: Loaded ${unsplashKeys.length} Unsplash API keys`);
}

// Initialize on module load
initialize();

/**
 * Get the next available Gemini API key
 * @returns {string|null} The API key or null if none available
 */
function getGeminiApiKey() {
  if (geminiKeys.length === 0) {
    console.warn('No Gemini API keys available!');
    return null;
  }
  
  // Find a key that hasn't failed recently
  let attempts = 0;
  while (attempts < geminiKeys.length) {
    const key = geminiKeys[currentGeminiKeyIndex];
    
    // Move to the next key for the next call (round-robin)
    currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % geminiKeys.length;
    
    // Skip keys that have failed recently
    if (failedGeminiKeys.has(key)) {
      attempts++;
      continue;
    }
    
    return key;
  }
  
  // If all keys have failed, clear the failure tracking and try again
  if (failedGeminiKeys.size > 0) {
    console.warn('All Gemini API keys have failed. Resetting and trying again...');
    failedGeminiKeys.clear();
    return geminiKeys[0];
  }
  
  return geminiKeys[0];
}

/**
 * Get the next available Unsplash API key
 * @returns {string|null} The API key or null if none available
 */
function getUnsplashApiKey() {
  if (unsplashKeys.length === 0) {
    console.warn('No Unsplash API keys available!');
    return null;
  }
  
  // Find a key that hasn't failed recently
  let attempts = 0;
  while (attempts < unsplashKeys.length) {
    const key = unsplashKeys[currentUnsplashKeyIndex];
    
    // Move to the next key for the next call (round-robin)
    currentUnsplashKeyIndex = (currentUnsplashKeyIndex + 1) % unsplashKeys.length;
    
    // Skip keys that have failed recently
    if (failedUnsplashKeys.has(key)) {
      attempts++;
      continue;
    }
    
    return key;
  }
  
  // If all keys have failed, clear the failure tracking and try again
  if (failedUnsplashKeys.size > 0) {
    console.warn('All Unsplash API keys have failed. Resetting and trying again...');
    failedUnsplashKeys.clear();
    return unsplashKeys[0];
  }
  
  return unsplashKeys[0];
}

/**
 * Mark a Gemini API key as failed
 * @param {string} key The API key to mark as failed
 */
function markGeminiKeyAsFailed(key) {
  if (key && geminiKeys.includes(key)) {
    failedGeminiKeys.add(key);
    console.warn(`Marked Gemini API key as failed. ${failedGeminiKeys.size}/${geminiKeys.length} keys are currently marked as failed.`);
  }
}

/**
 * Mark an Unsplash API key as failed
 * @param {string} key The API key to mark as failed
 */
function markUnsplashKeyAsFailed(key) {
  if (key && unsplashKeys.includes(key)) {
    failedUnsplashKeys.add(key);
    console.warn(`Marked Unsplash API key as failed. ${failedUnsplashKeys.size}/${unsplashKeys.length} keys are currently marked as failed.`);
  }
}

/**
 * Make a request to the Gemini API with automatic key rotation and retry
 * @param {string} url The base URL (without the API key)
 * @param {Object} options Fetch options
 * @param {number} maxRetries Maximum number of retries
 * @returns {Promise<Object>} The response object
 */
async function makeGeminiRequest(url, options = {}, maxRetries = 3) {
  let attempts = 0;
  let lastError = null;
  
  while (attempts < maxRetries) {
    const apiKey = getGeminiApiKey();
    
    if (!apiKey) {
      throw new Error('No valid Gemini API keys available');
    }
    
    // Add API key to URL if needed
    const fullUrl = url.includes('?key=') ? url : `${url}?key=${apiKey}`;
    
    try {
      const response = await fetch(fullUrl, options);
      
      // Check for rate limiting or authorization errors
      if (response.status === 429 || response.status === 403) {
        console.warn(`Gemini API key error (${response.status}): ${await response.text()}`);
        markGeminiKeyAsFailed(apiKey);
        attempts++;
        continue;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // If it's a network error or 5xx server error, retry with the same key
      if (error.name === 'TypeError' || (error.message && error.message.includes('status') && parseInt(error.message.match(/\d+/)[0]) >= 500)) {
        console.warn(`Network or server error: ${error.message}. Retrying...`);
      } else {
        // For other errors, mark the key as failed
        markGeminiKeyAsFailed(apiKey);
      }
      
      attempts++;
      
      // Wait before retrying
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }
  
  throw lastError || new Error(`Failed to make Gemini API request after ${maxRetries} attempts`);
}

/**
 * Make a request to the Unsplash API with automatic key rotation and retry
 * @param {string} url The URL endpoint
 * @param {Object} options Fetch options
 * @param {number} maxRetries Maximum number of retries
 * @returns {Promise<Object>} The response object
 */
async function makeUnsplashRequest(url, options = {}, maxRetries = 3) {
  let attempts = 0;
  let lastError = null;
  
  while (attempts < maxRetries) {
    const apiKey = getUnsplashApiKey();
    
    if (!apiKey) {
      throw new Error('No valid Unsplash API keys available');
    }
    
    // Set up authorization header
    const headers = {
      ...(options.headers || {}),
      'Authorization': `Client-ID ${apiKey}`
    };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // Check for rate limiting or authorization errors
      if (response.status === 429 || response.status === 403) {
        console.warn(`Unsplash API key error (${response.status}): ${await response.text()}`);
        markUnsplashKeyAsFailed(apiKey);
        attempts++;
        continue;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Unsplash API error (${response.status}): ${errorText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // If it's a network error or 5xx server error, retry with the same key
      if (error.name === 'TypeError' || (error.message && error.message.includes('status') && parseInt(error.message.match(/\d+/)[0]) >= 500)) {
        console.warn(`Network or server error: ${error.message}. Retrying...`);
      } else {
        // For other errors, mark the key as failed
        markUnsplashKeyAsFailed(apiKey);
      }
      
      attempts++;
      
      // Wait before retrying
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }
  
  throw lastError || new Error(`Failed to make Unsplash API request after ${maxRetries} attempts`);
}

module.exports = {
  getGeminiApiKey,
  getUnsplashApiKey,
  makeGeminiRequest,
  makeUnsplashRequest,
  initialize,
  // Export for testing and advanced usage
  markGeminiKeyAsFailed,
  markUnsplashKeyAsFailed
}; 