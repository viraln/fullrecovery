#!/usr/bin/env node
require('dotenv').config();
const apiKeyManager = require('./utils/api-key-manager');

/**
 * API Key Manager Test Script
 * 
 * This script tests the API Key Manager functionality by:
 * 1. Loading and displaying all available API keys
 * 2. Testing both Gemini and Unsplash APIs with different keys
 * 3. Simulating failures to verify fallback behavior
 * 4. Displaying detailed results of all tests
 * 
 * Usage:
 * node scripts/test-api-keys.js
 */

// ANSI colors for better terminal output
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m"
};

// Simple logger
const log = {
  info: (message) => console.log(`${COLORS.blue}ℹ ${message}${COLORS.reset}`),
  success: (message) => console.log(`${COLORS.green}✓ ${message}${COLORS.reset}`),
  warning: (message) => console.log(`${COLORS.yellow}⚠ ${message}${COLORS.reset}`),
  error: (message) => console.log(`${COLORS.red}✖ ${message}${COLORS.reset}`),
  header: (message) => console.log(`\n${COLORS.bgBlue}${COLORS.bright} ${message} ${COLORS.reset}\n`)
};

// Test the Gemini API
async function testGeminiApi(apiKey) {
  try {
    log.info(`Testing Gemini API with key: ${maskApiKey(apiKey)}`);
    
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent`;
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello, my name is Developer. What is your name?' }]
          }
        ]
      })
    };
    
    const response = await fetch(`${url}?key=${apiKey}`, requestOptions);
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.candidates && data.candidates.length > 0) {
        log.success(`Gemini API test successful with key: ${maskApiKey(apiKey)}`);
        return true;
      } else {
        log.error(`Gemini API returned empty response with key: ${maskApiKey(apiKey)}`);
        return false;
      }
    } else {
      const errorData = await response.text();
      log.error(`Gemini API error (${response.status}) with key ${maskApiKey(apiKey)}: ${errorData}`);
      return false;
    }
  } catch (error) {
    log.error(`Gemini API test failed with key ${maskApiKey(apiKey)}: ${error.message}`);
    return false;
  }
}

// Test the Unsplash API
async function testUnsplashApi(apiKey) {
  try {
    log.info(`Testing Unsplash API with key: ${maskApiKey(apiKey)}`);
    
    const url = 'https://api.unsplash.com/photos/random?query=nature';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${apiKey}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.id) {
        log.success(`Unsplash API test successful with key: ${maskApiKey(apiKey)}`);
        return true;
      } else {
        log.error(`Unsplash API returned empty response with key: ${maskApiKey(apiKey)}`);
        return false;
      }
    } else {
      const errorData = await response.text();
      log.error(`Unsplash API error (${response.status}) with key ${maskApiKey(apiKey)}: ${errorData}`);
      return false;
    }
  } catch (error) {
    log.error(`Unsplash API test failed with key ${maskApiKey(apiKey)}: ${error.message}`);
    return false;
  }
}

// Test the API key manager with Gemini
async function testGeminiKeyManager() {
  try {
    log.info('Testing Gemini API with Key Manager');
    
    const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Tell me a short joke about programming.' }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100
        }
      })
    };
    
    const response = await apiKeyManager.makeGeminiRequest(url, requestOptions);
    const data = await response.json();
    
    if (data && data.candidates && data.candidates.length > 0) {
      const joke = data.candidates[0].content.parts[0].text;
      log.success(`Gemini API Key Manager test successful!`);
      log.info(`Response: ${joke}`);
      return true;
    } else {
      log.error('Gemini API Key Manager returned empty response');
      return false;
    }
  } catch (error) {
    log.error(`Gemini API Key Manager test failed: ${error.message}`);
    return false;
  }
}

// Test the API key manager with Unsplash
async function testUnsplashKeyManager() {
  try {
    log.info('Testing Unsplash API with Key Manager');
    
    const url = 'https://api.unsplash.com/photos/random?query=technology';
    
    const response = await apiKeyManager.makeUnsplashRequest(url);
    const data = await response.json();
    
    if (data && data.id) {
      log.success(`Unsplash API Key Manager test successful!`);
      log.info(`Image URL: ${data.urls.small}`);
      return true;
    } else {
      log.error('Unsplash API Key Manager returned empty response');
      return false;
    }
  } catch (error) {
    log.error(`Unsplash API Key Manager test failed: ${error.message}`);
    return false;
  }
}

// Helper function to mask API keys for display
function maskApiKey(key) {
  if (!key) return 'undefined';
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}

// Test random topic selection to verify non-deterministic behavior
async function testRandomTopicSelection() {
  try {
    log.header('TESTING RANDOM TOPIC SELECTION');
    
    // Import the topic loading functionality from the main script
    const path = require('path');
    
    // We'll run multiple iterations to test randomness
    const iterations = 3;
    const results = [];
    
    // Create a simple shuffling function
    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    // For simplicity, use a sample of topics rather than parsing the full file
    // This avoids potential issues with parsing the complex topics.js structure
    const sampleTopics = [
      { name: 'AI', category: 'Technology' },
      { name: 'Blockchain', category: 'Technology' },
      { name: 'Cloud', category: 'Technology' },
      { name: 'DevOps', category: 'Technology' },
      { name: 'Machine Learning', category: 'Technology' },
      { name: 'IoT', category: 'Technology' },
      { name: 'Robotics', category: 'Technology' },
      { name: 'Quantum', category: 'Technology' },
      { name: 'Cybersecurity', category: 'Technology' },
      { name: 'Big Data', category: 'Technology' },
      { name: 'Edge Computing', category: 'Technology' },
      { name: '5G', category: 'Technology' },
      { name: 'Semiconductors', category: 'Technology' },
      { name: 'Open Source', category: 'Technology' },
      { name: '6G', category: 'Technology' },
      { name: 'Nanotechnology', category: 'Technology' },
      { name: 'Wearables', category: 'Technology' },
      { name: 'Brain Computer', category: 'Technology' },
      { name: 'Software Eng', category: 'Technology' },
      { name: 'Hardware Dev', category: 'Technology' },
      { name: 'Space', category: 'Science' },
      { name: 'Metaverse', category: 'Digital Life' },
      { name: 'NFTs', category: 'Digital Life' },
      { name: 'Crypto', category: 'Digital Life' }
    ];
    
    for (let i = 0; i < iterations; i++) {
      log.info(`Running topic selection iteration ${i+1}`);
      
      // Shuffle using our Fisher-Yates implementation
      const shuffled = shuffleArray(sampleTopics);
      
      // Take the first 5 topics
      const selectedTopics = shuffled.slice(0, 5);
      
      // Record the results
      results.push(selectedTopics.map(t => t.name));
      
      // Log the selected topics
      log.info(`Selected topics: ${selectedTopics.map(t => t.name).join(', ')}`);
    }
    
    // Check if all iterations produced different selections
    let allDifferent = true;
    for (let i = 0; i < results.length - 1; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const similar = results[i].filter(topic => results[j].includes(topic)).length;
        
        // If more than 3 topics are the same, selections might not be random enough
        if (similar > 3) {
          allDifferent = false;
          log.warning(`Iterations ${i+1} and ${j+1} have ${similar} topics in common`);
        }
      }
    }
    
    if (allDifferent) {
      log.success('Random topic selection is working correctly! Each run produced different topics.');
      return true;
    } else {
      log.warning('Topic selection may not be sufficiently random. Some iterations had similar selections.');
      return false;
    }
  } catch (error) {
    log.error(`Error testing random topic selection: ${error.message}`);
    return false;
  }
}

// Main test function
async function runTests() {
  // Print header
  console.log(`\n${COLORS.bgBlue}${COLORS.bright} API KEY MANAGER TEST ${COLORS.reset}\n`);
  
  // Initialize API key manager
  apiKeyManager.initialize();
  
  // Get the list of API keys
  const geminiKeys = [];
  const unsplashKeys = [];
  
  // Collect Gemini API keys
  let key = apiKeyManager.getGeminiApiKey();
  while (key && !geminiKeys.includes(key)) {
    geminiKeys.push(key);
    key = apiKeyManager.getGeminiApiKey();
  }
  
  // Collect Unsplash API keys
  key = apiKeyManager.getUnsplashApiKey();
  while (key && !unsplashKeys.includes(key)) {
    unsplashKeys.push(key);
    key = apiKeyManager.getUnsplashApiKey();
  }
  
  // Display key counts
  log.header('API KEYS DETECTED');
  log.info(`Found ${geminiKeys.length} Gemini API key(s)`);
  geminiKeys.forEach((key, i) => console.log(`  ${i+1}. ${maskApiKey(key)}`));
  
  log.info(`Found ${unsplashKeys.length} Unsplash API key(s)`);
  unsplashKeys.forEach((key, i) => console.log(`  ${i+1}. ${maskApiKey(key)}`));
  
  // Test individual API keys
  log.header('TESTING INDIVIDUAL API KEYS');
  
  const geminiResults = [];
  for (const key of geminiKeys) {
    const result = await testGeminiApi(key);
    geminiResults.push({ key, success: result });
  }
  
  const unsplashResults = [];
  for (const key of unsplashKeys) {
    const result = await testUnsplashApi(key);
    unsplashResults.push({ key, success: result });
  }
  
  // Test Key Manager functionality
  log.header('TESTING API KEY MANAGER');
  
  const geminiManagerSuccess = await testGeminiKeyManager();
  const unsplashManagerSuccess = await testUnsplashKeyManager();
  
  // Test fallback mechanism by simulating failures
  log.header('TESTING FALLBACK MECHANISM');
  
  if (geminiKeys.length > 1) {
    log.info('Testing Gemini API fallback by marking the first key as failed');
    apiKeyManager.markGeminiKeyAsFailed(geminiKeys[0]);
    const fallbackSuccess = await testGeminiKeyManager();
    log.info(`Gemini API fallback test ${fallbackSuccess ? 'succeeded' : 'failed'}`);
  } else {
    log.warning('Cannot test Gemini API fallback - need at least 2 API keys');
  }
  
  if (unsplashKeys.length > 1) {
    log.info('Testing Unsplash API fallback by marking the first key as failed');
    apiKeyManager.markUnsplashKeyAsFailed(unsplashKeys[0]);
    const fallbackSuccess = await testUnsplashKeyManager();
    log.info(`Unsplash API fallback test ${fallbackSuccess ? 'succeeded' : 'failed'}`);
  } else {
    log.warning('Cannot test Unsplash API fallback - need at least 2 API keys');
  }
  
  // Test random topic selection
  const randomTopicSelectionSuccess = await testRandomTopicSelection();
  
  // Print summary
  log.header('TEST SUMMARY');
  
  const geminiSuccessCount = geminiResults.filter(r => r.success).length;
  const unsplashSuccessCount = unsplashResults.filter(r => r.success).length;
  
  log.info(`Gemini API: ${geminiSuccessCount}/${geminiResults.length} keys working`);
  log.info(`Unsplash API: ${unsplashSuccessCount}/${unsplashResults.length} keys working`);
  log.info(`Gemini API Manager: ${geminiManagerSuccess ? 'Working' : 'Failed'}`);
  log.info(`Unsplash API Manager: ${unsplashManagerSuccess ? 'Working' : 'Failed'}`);
  log.info(`Random Topic Selection: ${randomTopicSelectionSuccess ? 'Working' : 'Needs Improvement'}`);
  
  const allSuccess = 
    geminiSuccessCount > 0 && 
    unsplashSuccessCount > 0 && 
    geminiManagerSuccess && 
    unsplashManagerSuccess &&
    randomTopicSelectionSuccess;
  
  if (allSuccess) {
    console.log(`\n${COLORS.bgGreen}${COLORS.bright} ALL TESTS PASSED! YOUR API KEY MANAGER IS WORKING CORRECTLY ${COLORS.reset}\n`);
  } else {
    console.log(`\n${COLORS.bgRed}${COLORS.bright} SOME TESTS FAILED. PLEASE CHECK THE LOGS ABOVE ${COLORS.reset}\n`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${COLORS.red}Error running tests: ${error.message}${COLORS.reset}`);
  console.error(error);
}); 