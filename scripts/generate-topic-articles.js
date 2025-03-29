#!/usr/bin/env node
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const apiKeyManager = require('./utils/api-key-manager');

/**
 * Topic to Article Generator
 * 
 * This script automatically generates articles using the generate-article-gemini.js script
 * based on topics extracted from the data/topics.js file.
 * 
 * Features:
 * - Loads topics from the data/topics.js file
 * - Supports filtering by category or topic name
 * - Allows batch processing with configurable concurrency
 * - Implements rate limiting to avoid API rate limits
 * - Support for multiple API keys with automatic fallback
 * - Detailed logging and progress tracking
 * 
 * Usage:
 * - Generate article for a specific topic: node scripts/generate-topic-articles.js --topic="AI"
 * - Generate articles for a specific category: node scripts/generate-topic-articles.js --category="Technology"
 * - Generate for trending topics: node scripts/generate-topic-articles.js --trending
 * - Generate multiple random articles: node scripts/generate-topic-articles.js --count=5
 * - Generate articles for all topics: node scripts/generate-topic-articles.js --all (caution!)
 */

// ANSI color codes for nicer terminal output
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m"
};

// Configuration with defaults
const config = {
  // Maximum concurrent article generations
  concurrency: 1,
  
  // Delay between article generations in milliseconds
  delay: 2000,
  
  // Max number of retries for article generation
  maxRetries: 3,
  
  // Timeout for a single article generation (in milliseconds)
  timeout: 5 * 60 * 1000, // 5 minutes
  
  // Path to the article generator script
  generatorScript: path.join(__dirname, 'generate-article-gemini.js'),
  
  // Path to the output directory for logs
  outputDir: path.join(__dirname, '../logs'),
  
  // Whether to log to a file
  logToFile: true,
  
  // Default log level (can be overridden by LOG_LEVEL env variable)
  logLevel: process.env.LOG_LEVEL || 'INFO',
  
  // Default bulk generation size
  bulkGenerationSize: 1000,
  
  // State file to keep track of progress for resuming bulk generation
  stateFile: path.join(__dirname, '../logs/generation-state.json'),
  
  // Whether to enable bulk mode
  bulkMode: false,
};

// Initialize logging
const logger = {
  init: async () => {
    // Create output directory if it doesn't exist
    if (config.logToFile) {
      try {
        await fs.mkdir(config.outputDir, { recursive: true });
      } catch (error) {
        console.error(`${COLORS.red}Error creating output directory:${COLORS.reset}`, error);
      }
    }
  },
  
  log: (message, level = 'INFO') => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    // Print to console with color
    switch (level) {
      case 'ERROR':
        console.error(`${COLORS.red}${formattedMessage}${COLORS.reset}`);
        break;
      case 'WARN':
        console.warn(`${COLORS.yellow}${formattedMessage}${COLORS.reset}`);
        break;
      case 'SUCCESS':
        console.log(`${COLORS.green}${formattedMessage}${COLORS.reset}`);
        break;
      case 'DEBUG':
        if (config.logLevel === 'DEBUG') {
          console.log(`${COLORS.dim}${formattedMessage}${COLORS.reset}`);
        }
        break;
      default:
        console.log(`${COLORS.blue}${formattedMessage}${COLORS.reset}`);
    }
    
    // Log to file if enabled
    if (config.logToFile) {
      const logFile = path.join(config.outputDir, `topic-generation-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFile(logFile, formattedMessage + '\n').catch(error => {
        console.error(`${COLORS.red}Error writing to log file:${COLORS.reset}`, error);
      });
    }
  },
  
  error: (message) => logger.log(message, 'ERROR'),
  warn: (message) => logger.log(message, 'WARN'),
  info: (message) => logger.log(message, 'INFO'),
  success: (message) => logger.log(message, 'SUCCESS'),
  debug: (message) => logger.log(message, 'DEBUG'),
  
  // Add a progress method for bulk generation
  progress: (current, total) => {
    const percent = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
    process.stdout.write(`\r${COLORS.blue}[${new Date().toISOString()}] Progress: ${progressBar} ${percent}% (${current}/${total})${COLORS.reset}`);
    
    if (current === total) {
      process.stdout.write('\n');
    }
  }
};

// Utility function: Proper Fisher-Yates shuffle algorithm
function shuffleArray(array) {
  const shuffled = [...array]; // Create a new array to avoid mutating the original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
  }
  return shuffled;
}

// Function to load and parse topics from the topics.js file
async function loadTopics() {
  try {
    logger.info('Loading topics from data/topics.js');
    
    // Read the topics.js file content
    const topicsFilePath = path.join(__dirname, '../data/topics.js');
    const fileContent = await fs.readFile(topicsFilePath, 'utf8');
    
    // Extract the topicCategories object using a more flexible regex
    // This matches from "export const topicCategories = {" until the last "}"
    const startMarker = 'export const topicCategories = {';
    const startIndex = fileContent.indexOf(startMarker);
    
    if (startIndex === -1) {
      throw new Error('Could not find topicCategories object in topics.js');
    }
    
    // Count opening and closing braces to find the end of the object
    let openBraces = 1; // Starting with one open brace
    let closeBraces = 0;
    let endIndex = startIndex + startMarker.length;
    
    while (openBraces !== closeBraces && endIndex < fileContent.length) {
      const char = fileContent[endIndex];
      if (char === '{') openBraces++;
      if (char === '}') closeBraces++;
      endIndex++;
    }
    
    // Extract the object string including the closing brace
    const objectStr = fileContent.substring(startIndex + startMarker.length - 1, endIndex);
    
    // Clean up the extracted string by removing comments
    const cleanedStr = objectStr
      .replace(/\/\/.*$/gm, '') // Remove single line comments
      .replace(/\/\*[\s\S]*?\*\//gm, ''); // Remove multi-line comments
    
    // Use Function constructor to safely evaluate the object
    let topicCategoriesObj;
    try {
      topicCategoriesObj = new Function(`return ${cleanedStr}`)();
    } catch (evalError) {
      logger.error(`Error evaluating topics object: ${evalError.message}`);
      // Try a simpler parsing approach as fallback
      logger.info('Attempting fallback parsing method');
      topicCategoriesObj = JSON.parse(
        cleanedStr
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3') // Add quotes around keys
      );
    }
    
    // Randomize each category's topics array for better distribution
    Object.keys(topicCategoriesObj).forEach(category => {
      if (Array.isArray(topicCategoriesObj[category])) {
        topicCategoriesObj[category] = shuffleArray(topicCategoriesObj[category]);
      }
    });
    
    // Flatten the topics and randomize the overall list
    let allTopics = [];
    
    Object.entries(topicCategoriesObj).forEach(([category, topics]) => {
      topics.forEach(topic => {
        allTopics.push({
          ...topic,
          category
        });
      });
    });
    
    // Shuffle the overall list of topics for better randomization
    allTopics = shuffleArray(allTopics);
    
    logger.success(`Loaded ${allTopics.length} topics from ${Object.keys(topicCategoriesObj).length} categories`);
    return { topicCategories: topicCategoriesObj, allTopics };
  } catch (error) {
    logger.error(`Failed to load topics: ${error.message}`);
    throw error;
  }
}

// Function to filter topics based on command line arguments
function filterTopics(allTopics, topicCategories, args) {
  // If bulk generation mode is active and no specific filters are provided
  if (args.bulk && !args.topic && !args.category && !args.trending) {
    logger.info(`Preparing for bulk generation of ${config.bulkGenerationSize} articles using all available topics`);
    // For bulk generation, we'll return all topics shuffled for better randomization
    return { topics: shuffleArray(allTopics), mode: 'bulk' };
  }
  
  // If a specific topic is requested
  if (args.topic) {
    const searchTerm = args.topic.toLowerCase();
    const filtered = allTopics.filter(topic => 
      topic.name.toLowerCase().includes(searchTerm)
    );
    
    logger.info(`Filtered to ${filtered.length} topics matching "${args.topic}"`);
    return { topics: filtered, mode: 'filtered' };
  }
  
  // If a specific category is requested
  if (args.category) {
    const categoryName = Object.keys(topicCategories).find(
      c => c.toLowerCase() === args.category.toLowerCase()
    );
    
    if (!categoryName) {
      logger.warn(`Category "${args.category}" not found. Available categories: ${Object.keys(topicCategories).join(', ')}`);
      return { topics: [], mode: 'filtered' };
    }
    
    // Shuffle topics within the selected category for better randomization
    const categoryTopics = shuffleArray(topicCategories[categoryName].map(topic => ({ ...topic, category: categoryName })));
    logger.info(`Filtered to ${categoryTopics.length} topics in category "${categoryName}"`);
    return { topics: categoryTopics, mode: 'filtered' };
  }
  
  // If trending topics are requested
  if (args.trending) {
    const trending = shuffleArray(allTopics.filter(topic => topic.hot));
    logger.info(`Filtered to ${trending.length} trending topics`);
    return { topics: trending, mode: 'filtered' };
  }
  
  // If all topics are requested
  if (args.all) {
    logger.warn(`Using all ${allTopics.length} topics - this could take a while!`);
    return { topics: shuffleArray(allTopics), mode: 'all' };
  }
  
  // If random topics are explicitly requested
  if (args.random) {
    const count = parseInt(args.count || '5', 10);
    const shuffled = shuffleArray(allTopics);
    const selected = shuffled.slice(0, count);
    
    logger.info(`Selected ${selected.length} random topics: ${selected.map(t => t.name).join(', ')}`);
    return { topics: selected, mode: 'random' };
  }
  
  // Default: random selection based on count
  const count = parseInt(args.count || '1', 10);
  const shuffled = shuffleArray(allTopics);
  const selected = shuffled.slice(0, count);
  
  logger.info(`Selected ${selected.length} random topics`);
  return { topics: selected, mode: 'random' };
}

// Function to parse command line arguments
function parseArguments() {
  const args = {};
  
  process.argv.slice(2).forEach(arg => {
    if (arg === '--trending') {
      args.trending = true;
    } else if (arg === '--all') {
      args.all = true;
    } else if (arg === '--bulk') {
      args.bulk = true;
      config.bulkMode = true;
    } else if (arg === '--random') {
      args.random = true;
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg === '--help') {
      displayHelp();
      process.exit(0);
    } else if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      args[key] = value || true;
      
      // Parse special arguments
      if (key === 'bulkSize' && value) {
        config.bulkGenerationSize = parseInt(value, 10);
      }
    }
  });
  
  return args;
}

// Help display function
function displayHelp() {
  console.log(`
${COLORS.bgBlue}${COLORS.white}${COLORS.bright} TOPIC TO ARTICLE GENERATOR - HELP ${COLORS.reset}
    
${COLORS.cyan}This script generates articles using the Gemini API based on topics from data/topics.js${COLORS.reset}

Usage:
  node scripts/generate-topic-articles.js [options]

Options:
  --topic="NAME"       Generate an article for a specific topic
  --category="NAME"    Generate articles for a specific category
  --trending           Generate articles for trending topics
  --random             Generate random articles (default selection method)
  --count=NUMBER       Number of random articles to generate (default: 1)
  --all                Generate articles for all topics (caution!)
  --bulk               Bulk generation mode
  --bulkSize=NUMBER    Number of articles to generate in bulk mode
  --force              Skip confirmation for large operations
  --help               Display this help message

Examples:
  node scripts/generate-topic-articles.js --topic="AI"
  node scripts/generate-topic-articles.js --category="Technology"
  node scripts/generate-topic-articles.js --random --count=5
  node scripts/generate-topic-articles.js --trending
  node scripts/generate-topic-articles.js --count=3 --force
  `);
}

// Function to save generation state for resumability
async function saveGenerationState(generatedCount, totalToGenerate, successfulTopics, failedTopics, remainingTopics) {
  try {
    const state = {
      timestamp: new Date().toISOString(),
      generatedCount,
      totalToGenerate,
      completed: generatedCount >= totalToGenerate,
      successfulTopics,
      failedTopics,
      remainingTopicIds: remainingTopics.map(t => `${t.category}-${t.name}`)
    };
    
    await fs.writeFile(config.stateFile, JSON.stringify(state, null, 2));
    logger.debug(`Generation state saved (${generatedCount}/${totalToGenerate})`);
  } catch (error) {
    logger.error(`Failed to save generation state: ${error.message}`);
  }
}

// Function to load previous generation state
async function loadGenerationState() {
  try {
    const fileExists = await fs.access(config.stateFile).then(() => true).catch(() => false);
    if (!fileExists) {
      return null;
    }
    
    const stateData = await fs.readFile(config.stateFile, 'utf8');
    return JSON.parse(stateData);
  } catch (error) {
    logger.error(`Failed to load generation state: ${error.message}`);
    return null;
  }
}

// Function to generate an article for a specific topic
async function generateArticleForTopic(topic, index, total) {
  return new Promise((resolve, reject) => {
    logger.info(`[${index+1}/${total}] Generating article for topic: ${topic.name} (${topic.category})`);
    
    // Use just the topic name without prepending the category
    // This prevents article titles from starting with "Category: "
    const topicString = topic.name;
    
    // Spawn a child process to run the article generation script
    const startTime = Date.now();
    const child = spawn('node', [config.generatorScript, topicString], {
      env: { ...process.env, LOG_LEVEL: config.logLevel },
    });
    
    let output = '';
    let errorOutput = '';
    
    // Collect stdout
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      // Log real-time output for better monitoring
      chunk.split('\n').forEach(line => {
        if (line.trim()) {
          logger.debug(`[${topic.name}] ${line.trim()}`);
        }
      });
    });
    
    // Collect stderr
    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      
      // Log errors in real-time
      chunk.split('\n').forEach(line => {
        if (line.trim()) {
          logger.warn(`[${topic.name}] ${line.trim()}`);
        }
      });
    });
    
    // Handle process completion
    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (code === 0) {
        // Extract useful information from the output
        const titleMatch = output.match(/Title: (.+)/);
        const filenameMatch = output.match(/Filename: (.+)/);
        
        const result = {
          topic: topic.name,
          category: topic.category,
          title: titleMatch ? titleMatch[1] : 'Unknown',
          filename: filenameMatch ? filenameMatch[1] : 'Unknown',
          duration: `${duration}s`,
        };
        
        logger.success(`[${index+1}/${total}] Article generation successful for "${topic.name}" in ${duration}s`);
        resolve(result);
      } else {
        logger.error(`[${index+1}/${total}] Article generation failed for "${topic.name}" with exit code ${code}`);
        reject(new Error(`Process exited with code ${code}\n${errorOutput}`));
      }
    });
    
    // Handle timeout
    const timeout = setTimeout(() => {
      child.kill();
      logger.error(`[${index+1}/${total}] Article generation timed out after ${config.timeout/1000}s for "${topic.name}"`);
      reject(new Error(`Timeout after ${config.timeout/1000}s`));
    }, config.timeout);
    
    // Clear timeout when process completes
    child.on('close', () => clearTimeout(timeout));
  });
}

// Function for bulk generation of articles
async function bulkGenerateArticles(allTopics, totalToGenerate) {
  const results = {
    success: [],
    failure: []
  };
  
  // Try to load previous state
  const previousState = await loadGenerationState();
  let generatedCount = 0;
  let remainingTopics = [...allTopics];
  
  // If we have a previous state and it's not completed, resume from there
  if (previousState && !previousState.completed) {
    logger.info(`Resuming previous bulk generation: ${previousState.generatedCount}/${previousState.totalToGenerate} articles already generated`);
    generatedCount = previousState.generatedCount;
    
    // Filter out already processed topics
    const processedTopicIds = new Set([
      ...previousState.successfulTopics.map(t => `${t.category}-${t.name}`),
      ...previousState.failedTopics.map(t => `${t.category}-${t.name}`)
    ]);
    
    // If we have remaining topic IDs from previous run, use those
    if (previousState.remainingTopicIds && previousState.remainingTopicIds.length > 0) {
      const remainingTopicIds = new Set(previousState.remainingTopicIds);
      remainingTopics = allTopics.filter(topic => 
        remainingTopicIds.has(`${topic.category}-${topic.name}`)
      );
      logger.info(`Loaded ${remainingTopics.length} remaining topics from previous state`);
    } else {
      // Otherwise filter based on successful/failed topics
      remainingTopics = allTopics.filter(topic => 
        !processedTopicIds.has(`${topic.category}-${topic.name}`)
      );
    }
    
    // Load previous results
    results.success = previousState.successfulTopics || [];
    results.failure = previousState.failedTopics || [];
    
    logger.info(`Resuming with ${remainingTopics.length} remaining topics`);
  } else {
    logger.info(`Starting new bulk generation of ${totalToGenerate} articles`);
    // Shuffle all topics at the start for better randomization
    remainingTopics = shuffleArray(remainingTopics);
  }
  
  // Initialize total count to generate
  const stillNeeded = totalToGenerate - generatedCount;
  
  logger.info(`Need to generate ${stillNeeded} more articles to reach target of ${totalToGenerate}`);
  
  // Show initial progress
  if (config.logLevel !== 'DEBUG') {
    logger.progress(generatedCount, totalToGenerate);
  }
  
  // Process in batches
  const batchSize = Math.min(config.concurrency, 5); // Limit batch size for safety
  
  try {
    // Process until we've generated enough articles
    while (generatedCount < totalToGenerate && remainingTopics.length > 0) {
      // Check if we need to shuffle in more topics
      if (remainingTopics.length < stillNeeded && allTopics.length > remainingTopics.length) {
        // Get topics we haven't used yet
        const usedTopicIds = new Set(remainingTopics.map(t => `${t.category}-${t.name}`));
        const unusedTopics = allTopics.filter(topic => 
          !usedTopicIds.has(`${topic.category}-${topic.name}`)
        );
        
        if (unusedTopics.length > 0) {
          // Shuffle unused topics and add them to the pool
          const shuffled = shuffleArray(unusedTopics);
          remainingTopics = [...remainingTopics, ...shuffled];
          logger.info(`Added ${shuffled.length} more topics to the generation pool`);
        } else {
          // If we've used all topics once, just shuffle all again and reuse
          remainingTopics = shuffleArray(allTopics);
          logger.info(`Reusing all ${allTopics.length} topics (all topics have been used once)`);
        }
      }
      
      // Take the next batch
      const currentBatchSize = Math.min(batchSize, totalToGenerate - generatedCount, remainingTopics.length);
      const batch = remainingTopics.splice(0, currentBatchSize);
      
      // Process the batch
      const batchPromises = batch.map((topic, batchIndex) => 
        generateArticleForTopic(topic, generatedCount + batchIndex, totalToGenerate)
          .then(result => {
            results.success.push({
              ...result,
              topic: topic.name,
              category: topic.category,
            });
            return { success: true, topic };
          })
          .catch(error => {
            results.failure.push({
              topic: topic.name,
              category: topic.category,
              error: error.message
            });
            return { success: false, topic, error };
          })
      );
      
      // Wait for the current batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Update generated count
      const successfulInBatch = batchResults.filter(r => r.success).length;
      generatedCount += successfulInBatch;
      
      // Save state after each batch for resumability
      await saveGenerationState(
        generatedCount, 
        totalToGenerate, 
        results.success, 
        results.failure,
        remainingTopics
      );
      
      // Update progress
      if (config.logLevel !== 'DEBUG') {
        logger.progress(generatedCount, totalToGenerate);
      }
      
      // Apply rate limiting between batches
      if (generatedCount < totalToGenerate && config.delay > 0) {
        logger.debug(`Rate limiting: waiting ${config.delay/1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
    }
    
    // Final state save with completed flag
    await saveGenerationState(
      generatedCount, 
      totalToGenerate, 
      results.success, 
      results.failure,
      [],
      true
    );
    
    return results;
  } catch (error) {
    logger.error(`Bulk generation error: ${error.message}`);
    
    // Save state on error for resumability
    await saveGenerationState(
      generatedCount, 
      totalToGenerate, 
      results.success, 
      results.failure,
      remainingTopics
    );
    
    throw error;
  }
}

// Function to batch process topics with concurrency and rate limiting
async function processTopics(topics, mode) {
  // If we're in bulk mode with a large number to generate
  if (mode === 'bulk') {
    return await bulkGenerateArticles(topics, config.bulkGenerationSize);
  }
  
  const results = {
    success: [],
    failure: []
  };
  
  logger.info(`Starting batch processing of ${topics.length} topics with concurrency ${config.concurrency}`);
  
  // Process in batches based on concurrency
  for (let i = 0; i < topics.length; i += config.concurrency) {
    const batch = topics.slice(i, i + config.concurrency);
    const batchPromises = batch.map((topic, batchIndex) => 
      generateArticleForTopic(topic, i + batchIndex, topics.length)
        .then(result => {
          results.success.push(result);
          return result;
        })
        .catch(error => {
          results.failure.push({
            topic: topic.name,
            category: topic.category,
            error: error.message
          });
          return { error };
        })
    );
    
    // Wait for the current batch to complete
    await Promise.all(batchPromises);
    
    // Apply rate limiting between batches
    if (i + config.concurrency < topics.length && config.delay > 0) {
      logger.info(`Rate limiting: waiting ${config.delay/1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }
  }
  
  return results;
}

// Main function
async function main() {
  try {
    // Initialize logger
    await logger.init();
    
    // Start with a banner
    console.log(`
${COLORS.bgBlue}${COLORS.white}${COLORS.bright} TOPIC TO ARTICLE GENERATOR ${COLORS.reset}
    
${COLORS.cyan}This script generates articles using the Gemini API based on topics from data/topics.js${COLORS.reset}
`);
    
    // Initialize API key manager
    apiKeyManager.initialize();
    console.log(`${COLORS.green}API Key Manager initialized${COLORS.reset}`);
    
    // Show where articles will be saved
    const articlesDir = path.join(process.cwd(), 'content', 'articles');
    console.log(`${COLORS.cyan}Articles will be saved to: ${articlesDir}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Logs and generation results will be saved to: ${config.outputDir}${COLORS.reset}`);
    
    // Parse command line arguments
    const args = parseArguments();
    logger.debug(`Command line arguments: ${JSON.stringify(args, null, 2)}`);
    
    // Override configuration from command line arguments
    if (args.concurrency) config.concurrency = parseInt(args.concurrency, 10);
    if (args.delay) config.delay = parseInt(args.delay, 10);
    if (args.timeout) config.timeout = parseInt(args.timeout, 10) * 1000;
    if (args.logLevel) config.logLevel = args.logLevel;
    if (args.bulkSize) config.bulkGenerationSize = parseInt(args.bulkSize, 10);
    
    // Load topics from topics.js
    const { topicCategories, allTopics } = await loadTopics();
    
    // Filter topics based on arguments
    const { topics: selectedTopics, mode } = filterTopics(allTopics, topicCategories, args);
    
    if (selectedTopics.length === 0) {
      logger.warn('No topics selected. Please check your filters.');
      return;
    }
    
    // Confirm with user if there are many topics (but not in bulk mode, which is pre-confirmed)
    if (mode !== 'bulk' && selectedTopics.length > 5 && !args.force) {
      console.log(`\n${COLORS.yellow}You are about to generate ${selectedTopics.length} articles. This could take a while and consume significant API usage.${COLORS.reset}`);
      console.log(`${COLORS.yellow}Selected topics: ${selectedTopics.map(t => t.name).join(', ')}${COLORS.reset}`);
      console.log(`\n${COLORS.yellow}To proceed, run again with the --force flag or reduce the number of topics.${COLORS.reset}`);
      return;
    }
    
    // Special handling for bulk mode
    if (mode === 'bulk') {
      console.log(`\n${COLORS.yellow}BULK GENERATION MODE: You are about to generate ${config.bulkGenerationSize} articles using random topics.${COLORS.reset}`);
      console.log(`${COLORS.yellow}This will take a significant amount of time and API usage.${COLORS.reset}`);
      
      // Check if there's a previous incomplete run
      const previousState = await loadGenerationState();
      if (previousState && !previousState.completed) {
        console.log(`\n${COLORS.green}Found previous incomplete run with ${previousState.generatedCount}/${previousState.totalToGenerate} articles generated.${COLORS.reset}`);
        console.log(`${COLORS.green}Will resume from there.${COLORS.reset}`);
      }
      
      if (!args.force && !previousState) {
        console.log(`\n${COLORS.yellow}To proceed, run again with the --force flag.${COLORS.reset}`);
        return;
      }
    }
    
    // Process the selected topics
    const startTime = Date.now();
    const results = await processTopics(selectedTopics, mode);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Summary report
    console.log(`\n${COLORS.bgGreen}${COLORS.black} GENERATION COMPLETE ${COLORS.reset}`);
    console.log(`\n${COLORS.green}Successfully generated ${results.success.length} articles in ${totalTime}s${COLORS.reset}`);
    
    if (results.failure.length > 0) {
      console.log(`\n${COLORS.red}Failed to generate ${results.failure.length} articles:${COLORS.reset}`);
      results.failure.forEach(failure => {
        console.log(`${COLORS.red}- ${failure.topic} (${failure.category})${COLORS.reset}`);
      });
    }
    
    // Write results to JSON file
    if (config.logToFile) {
      const resultsFile = path.join(config.outputDir, `generation-results-${new Date().toISOString().split('T')[0]}.json`);
      await fs.writeFile(
        resultsFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          totalTime: `${totalTime}s`,
          success: results.success,
          failure: results.failure
        }, null, 2)
      );
      logger.info(`Results saved to ${resultsFile}`);
    }
  } catch (error) {
    logger.error(`Main process error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main(); 