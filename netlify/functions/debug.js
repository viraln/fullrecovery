const path = require('path');
const fs = require('fs');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  
  try {
    const debugInfo = {
      environment: process.env.NODE_ENV,
      currentDirectory: process.cwd(),
      files: {}
    };
    
    // Check various paths where content could be located
    const pathsToCheck = [
      './content/articles',
      '../content/articles',
      '../../content/articles',
      '/opt/build/repo/content/articles',
      '/var/task/content/articles',
      '/opt/build/content/articles',
      path.join(process.cwd(), 'content/articles'),
      path.join(process.cwd(), '../content/articles'),
      path.join(process.cwd(), '../../content/articles')
    ];
    
    debugInfo.pathChecks = {};
    
    // Check each path
    for (const dirPath of pathsToCheck) {
      debugInfo.pathChecks[dirPath] = {
        exists: false,
        isDirectory: false,
        readable: false,
        files: [],
        error: null
      };
      
      try {
        // Check if path exists
        const exists = fs.existsSync(dirPath);
        debugInfo.pathChecks[dirPath].exists = exists;
        
        if (exists) {
          // Check if it's a directory
          const stats = fs.statSync(dirPath);
          debugInfo.pathChecks[dirPath].isDirectory = stats.isDirectory();
          
          // Try to read the directory
          if (stats.isDirectory()) {
            try {
              fs.accessSync(dirPath, fs.constants.R_OK);
              debugInfo.pathChecks[dirPath].readable = true;
              
              // List files (up to 10)
              const files = fs.readdirSync(dirPath);
              debugInfo.pathChecks[dirPath].fileCount = files.length;
              debugInfo.pathChecks[dirPath].files = files.slice(0, 10);
            } catch (readError) {
              debugInfo.pathChecks[dirPath].error = `Cannot read directory: ${readError.message}`;
            }
          }
        }
      } catch (checkError) {
        debugInfo.pathChecks[dirPath].error = checkError.message;
      }
    }
    
    // Get OS info
    debugInfo.os = {
      platform: process.platform,
      release: process.release,
      versions: process.versions
    };
    
    // Get memory info
    debugInfo.memory = process.memoryUsage();
    
    // Get environment variables (removing sensitive ones)
    const safeEnv = { ...process.env };
    for (const key in safeEnv) {
      if (key.includes('TOKEN') || key.includes('SECRET') || key.includes('KEY') || key.includes('PASS')) {
        safeEnv[key] = '[REDACTED]';
      }
    }
    debugInfo.env = safeEnv;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(debugInfo, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error generating debug info',
        message: error.message,
        stack: error.stack
      })
    };
  }
}; 