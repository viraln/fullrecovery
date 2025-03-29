import { preloadArticleCache } from '../../utils/articleUtils';

// Configure as a nodejs function
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  try {
    // Start the preload in the background
    const preloadPromise = preloadArticleCache();
    
    // Return success immediately, don't wait for completion
    res.status(200).json({ 
      message: 'Cache preload started in background',
      timestamp: new Date().toISOString()
    });
    
    // The preload continues in the background after response is sent
    await preloadPromise.catch(err => {
      console.error('Background cache preload error:', err);
    });
  } catch (error) {
    console.error('Error starting cache preload:', error);
    res.status(500).json({ 
      error: 'Failed to start cache preload',
      message: error.message
    });
  }
} 