// API endpoint for newsletter subscriptions
import fs from 'fs';
import path from 'path';

// Simple storage solution using a JSON file
// In a production environment, you would use a database instead
const subscribersFilePath = path.join(process.cwd(), 'data', 'subscribers.json');

// Ensure the subscribers file exists
function ensureSubscribersFileExists() {
  const dataDir = path.join(process.cwd(), 'data');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Create subscribers file if it doesn't exist
  if (!fs.existsSync(subscribersFilePath)) {
    fs.writeFileSync(subscribersFilePath, JSON.stringify({ 
      subscribers: [],
      categories: {
        daily: [],
        ai: [],
        tech: []
      } 
    }));
  }
}

// Get existing subscribers
function getSubscribers() {
  ensureSubscribersFileExists();
  const fileContents = fs.readFileSync(subscribersFilePath, 'utf8');
  return JSON.parse(fileContents);
}

// Save subscribers
function saveSubscribers(data) {
  fs.writeFileSync(subscribersFilePath, JSON.stringify(data, null, 2));
}

// Handle newsletter subscriptions
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, categories = [] } = req.body;

    // Simple validation
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // In a production environment, you would:
    // 1. Check if email exists in your database
    // 2. Add the email to your database or newsletter service like Mailchimp
    // 3. Handle any service-specific errors
    
    // For now, we'll just simulate a successful subscription
    console.log(`Subscription request for: ${email} to categories: ${categories.join(', ')}`);
    
    // Simulate checking if already subscribed (random for demo purposes)
    const alreadySubscribed = Math.random() > 0.9;
    
    if (alreadySubscribed) {
      return res.status(200).json({ 
        message: 'You are already subscribed!',
        alreadySubscribed: true 
      });
    }

    // Return success response
    return res.status(200).json({ 
      message: 'Successfully subscribed!',
      success: true 
    });
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 